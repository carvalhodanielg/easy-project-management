# Deploy do Claudio em produção

Frontend na **Vercel**, backend + **MongoDB** auto-hospedados numa **VPS** (Docker Compose), TLS via **Nginx + Certbot**, uploads no **Cloudflare R2** e deploy contínuo do backend via **GitHub Actions**.

## Contexto

O código já está preparado para produção:

- **Backend**: `backend/Dockerfile` é multi-stage com target `production` (`CMD ["node", "dist/main"]`); `main.ts` escuta em `0.0.0.0:PORT`, aplica Helmet, CORS (`origin: FRONTEND_URL`), `ValidationPipe`, `TransformInterceptor` e rate limiting (100 req/60s). Tudo configurável via env (`backend/src/config/configuration.ts`).
- **Frontend**: Vite SPA; `src/api/client.ts` lê `VITE_API_URL` (fallback `http://localhost:3000`); usa `createBrowserRouter` (precisa de fallback SPA no host).
- **Seed de admin**: `seed.service.ts` cria o admin único no boot — em produção **exige** `SEED_ADMIN_PASSWORD`, senão pula (registro é invite-only).
- **Storage**: avatares/anexos já suportam Cloudflare R2 via env `R2_*` (com `R2_ENDPOINT` vazio usa o R2 real).

## Arquitetura alvo

```
Usuário ──HTTPS──> Vercel (app.SEUDOMINIO.com)  [frontend Vite estático]
   │
   └──HTTPS──> Nginx na VPS (api.SEUDOMINIO.com:443, TLS via Certbot)
                   │ proxy_pass
                   ▼
              backend (container, 127.0.0.1:3000) ──> MongoDB (container, rede interna, sem porta pública)
                   │
                   └──> Cloudflare R2 (uploads/avatares)
```

---

## Parte 1 — Backend + MongoDB na VPS (Docker Compose de produção)

**Criar `docker-compose.prod.yml`** na raiz, sem MinIO/bind-mounts de dev:

- **mongo** (`mongo:7`): root user/pass via env (`MONGO_INITDB_ROOT_USERNAME/PASSWORD`), volume nomeado `mongo_data`, healthcheck. **Não publicar porta** (sem `ports:`) — acessível só pela rede interna do compose.
- **backend**: `build: { context: ./backend, target: production }`, `env_file: .env.prod`, `restart: unless-stopped`, `depends_on: mongo (healthy)`. Publicar **apenas em loopback**: `ports: ["127.0.0.1:3000:3000"]` — quem expõe ao mundo é o Nginx do host.
- Volume: só `mongo_data` (uploads vão para R2).

**Criar `.env.prod.example`** (template versionado; o `.env.prod` real fica só na VPS, fora do git):

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<gerar: openssl rand -base64 48>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
MONGO_INITDB_ROOT_USERNAME=atkplan
MONGO_INITDB_ROOT_PASSWORD=<forte>
MONGODB_URI=mongodb://atkplan:<forte>@mongo:27017/atkplan?authSource=admin
FRONTEND_URL=https://app.SEUDOMINIO.com
SEED_ADMIN_EMAIL=<seu-email>
SEED_ADMIN_PASSWORD=<senha-admin-forte>
# Cloudflare R2 (R2_ENDPOINT vazio = usa R2 real)
R2_ENDPOINT=
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=claudio-prod
R2_PUBLIC_URL=https://<bucket-publico>.r2.dev
```

> `MONGODB_URI` referencia o host `mongo` (nome do serviço na rede do compose) e usa `authSource=admin`.

---

## Parte 2 — Nginx + Certbot na VPS (TLS)

No host (Ubuntu/Debian), via apt — **não** em container:

1. DNS: registro **A** `api.SEUDOMINIO.com` → IP da VPS.
2. `apt install nginx certbot python3-certbot-nginx`.
3. Server block para `api.SEUDOMINIO.com`:
   ```nginx
   location / {
     proxy_pass http://127.0.0.1:3000;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   client_max_body_size 25m;   # uploads de anexos
   ```
4. `certbot --nginx -d api.SEUDOMINIO.com` (cert + renovação automática).
5. Firewall (`ufw`): liberar 80, 443, SSH; **bloquear 27017 e 3000** ao público.

---

## Parte 3 — Cloudflare R2

1. Criar bucket (ex: `claudio-prod`).
2. Criar API Token R2 (Access Key ID + Secret).
3. Expor o bucket publicamente (domínio `r2.dev` ou domínio custom) → vira o `R2_PUBLIC_URL`.
4. Preencher os `R2_*` no `.env.prod`. O código já usa essas envs; com `R2_ENDPOINT` vazio fala com o R2 real.
5. Validar CORS do bucket se o front buscar assets direto do `R2_PUBLIC_URL`.

---

## Parte 4 — Frontend na Vercel

1. **Criar `frontend/vercel.json`** (rewrite SPA para o React Router):
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
2. No painel Vercel: importar o repo, **Root Directory = `frontend`**, framework Vite, Build `npm run build`, Output `dist`.
3. Env var (Production): `VITE_API_URL=https://api.SEUDOMINIO.com`.
4. Configurar o domínio `app.SEUDOMINIO.com` na Vercel.
5. `FRONTEND_URL` no backend deve ser exatamente `https://app.SEUDOMINIO.com` — CORS aceita só essa origin (**previews da Vercel terão URL diferente e serão bloqueadas**; aceitável no início).

---

## Parte 5 — GitHub Actions: deploy do backend na VPS

**Criar `.github/workflows/deploy-backend.yml`**, em `push` na `main` com `paths: ['backend/**', 'docker-compose.prod.yml']`:

- Job com `appleboy/ssh-action` rodando na VPS:
  ```bash
  cd /opt/claudio
  git pull origin main
  docker compose -f docker-compose.prod.yml up -d --build backend
  docker image prune -f
  ```
- Secrets do repo: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (chave dedicada), opcional `VPS_PORT`.
- Pré-requisito na VPS: clonar o repo em `/opt/claudio` e colocar lá o `.env.prod`.
- O frontend **não** precisa de workflow — a Vercel faz deploy automático a cada push.

> Evolução futura: buildar a imagem no CI, dar push no GHCR e a VPS só fazer `pull` (mais robusto, mais setup).

---

## Parte 6 — Ajustes no código (com TDD)

O projeto exige teste antes da implementação.

1. **`trust proxy`** — atrás do Nginx, necessário para o `ThrottlerGuard` enxergar o IP real via `X-Forwarded-For`. Em `backend/src/main.ts`: `app.set('trust proxy', 1);`. Cobrir via e2e ou validação manual (confirmar escopo de teste antes).
2. **Health endpoint** (opcional, recomendado) — hoje não existe `/health`. Útil para o deploy/monitoramento. TDD: teste do controller primeiro, depois endpoint público retornando `{ status: 'ok' }` (e ping opcional no Mongo). Novo `backend/src/modules/health/` ou rota no `AppController`.

`docker-compose.prod.yml`, `vercel.json` e o workflow são config — não exigem teste unitário.

---

## Parte 7 — Hardening / operação

- **Backup do Mongo**: cron na VPS com `mongodump` → enviar dump para o R2. Sem isso, perda da VPS = perda dos dados.
- **Segredos**: `JWT_SECRET`, senhas e chaves R2 fortes e únicas; nunca commitar `.env.prod`.
- **`SEED_ADMIN_PASSWORD`** forte — é a única conta inicial (registro invite-only).
- **Restart/logs**: `restart: unless-stopped`; futuramente um agregador de logs.
- Manter `mongo` e `backend` sem portas públicas (só loopback/rede interna).

---

## Arquivos a criar / modificar

| Arquivo | Ação |
|---|---|
| `docker-compose.prod.yml` (raiz) | Criar — mongo + backend de produção |
| `.env.prod.example` (raiz) | Criar — template das envs de produção |
| `frontend/vercel.json` | Criar — rewrite SPA |
| `.github/workflows/deploy-backend.yml` | Criar — deploy SSH na VPS |
| `backend/src/main.ts` | Modificar — `app.set('trust proxy', 1)` |
| `backend/src/modules/health/*` | Criar (opcional, com teste) — endpoint `/health` |
| Nginx server block na VPS (`/etc/nginx/sites-available/api`) | Criar na VPS |

---

## Verificação end-to-end

1. **VPS**: `docker compose -f docker-compose.prod.yml up -d --build`; `docker compose ps` (mongo healthy, backend up); logs mostram "AtkPlan API running on port 3000" e "Seed admin created".
2. **TLS**: `curl https://api.SEUDOMINIO.com/health` (ou rota pública) → 200 com cert válido.
3. **Mongo isolado**: `nc -zv <ip-vps> 27017` de fora **deve falhar**.
4. **Frontend**: acessar `https://app.SEUDOMINIO.com`, DevTools → Network, chamadas para `https://api.SEUDOMINIO.com` sem erro de CORS/mixed-content.
5. **Login admin**: logar com `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`; criar space; upload de avatar/anexo servido a partir do `R2_PUBLIC_URL`.
6. **CI/CD**: push em `main` alterando `backend/**` → workflow verde → backend redeployado.
7. **Testes**: `cd backend && npm run test` e `cd frontend && npm run test` verdes antes do deploy.
