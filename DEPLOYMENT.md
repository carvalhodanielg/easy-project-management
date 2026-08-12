# Deploy do Claudio em produção

Frontend na **Vercel**. Backend + **MongoDB** numa **VPS própria gerenciada pelo Coolify**
(reverse proxy Traefik + HTTPS automático via Let's Encrypt, sem Nginx/Certbot manual).
Uploads no **Cloudflare R2**. CI/CD: **GitHub Actions** roda os testes e, se passarem,
dispara o webhook de deploy do Coolify.

## Contexto

O código já está preparado para produção:

- **Backend**: `backend/Dockerfile` é multi-stage com target `production` (`CMD ["node", "dist/main"]`); `main.ts` escuta em `0.0.0.0:PORT`, aplica `app.set('trust proxy', 1)` (necessário atrás do Traefik do Coolify), Helmet, CORS (`origin: FRONTEND_URL`), `ValidationPipe`, `TransformInterceptor` e rate limiting (100 req/60s). Tudo configurável via env (`backend/src/config/configuration.ts`).
- **`/health`**: endpoint público (`backend/src/modules/health/`) que faz ping no Mongo e retorna `200 {status:'ok', database:'up'}` ou `503` se o banco estiver fora — é o que o Coolify usa como Health Check para saber se um deploy foi bem-sucedido antes de trocar o tráfego (zero-downtime).
- **Frontend**: Vite SPA; `src/api/client.ts` lê `VITE_API_URL` (fallback `http://localhost:3000`); `frontend/vercel.json` já tem o rewrite de SPA para o React Router.
- **Seed de admin**: `seed.service.ts` cria o admin único no boot — em produção **exige** `SEED_ADMIN_PASSWORD`, senão pula (registro é invite-only).
- **Storage**: avatares/anexos já suportam Cloudflare R2 via env `R2_*` (com `R2_ENDPOINT` vazio usa o R2 real).

## Arquitetura alvo

```
Usuário ──HTTPS──> Vercel (app.SEUDOMINIO.com ou *.vercel.app)  [frontend Vite estático]
   │
   └──HTTPS──> Traefik do Coolify (api.SEUDOMINIO.com, TLS automático)
                   │ proxy interno
                   ▼
              backend (Application resource do Coolify) ──> MongoDB (Database resource do Coolify, rede interna)
                   │
                   └──> Cloudflare R2 (uploads/avatares)
```

Sem domínio próprio? O Certbot/Let's Encrypt não emite certificado para IP puro — use um
hostname que resolva pro IP da VPS (ex: `<seu-ip>.nip.io`, gratuito e sem cadastro) no lugar
de `api.SEUDOMINIO.com`. O Coolify também pode ter um domínio wildcard automático configurado
no servidor; confira nas configurações do servidor no painel.

---

## Parte 1 — MongoDB no Coolify (Database resource)

1. No painel do Coolify: **New Resource → Database → MongoDB**. Deploy.
2. Ativar **backup agendado** na aba "Backups" do recurso — resolve o backup do banco sem
   precisar de cron manual + `mongodump`.
3. Copiar a **connection string interna** que o Coolify mostra na aba do recurso (ela já
   inclui usuário, senha e host dentro da rede Docker que o Coolify gerencia) — vai virar o
   `MONGODB_URI` do backend na Parte 2.
4. Não expor porta pública do Mongo.

---

## Parte 2 — Backend no Coolify (Application resource)

1. **New Resource → Application** → conectar o repo GitHub, branch `main`, **Base Directory:
   `backend`**, Build Pack: **Dockerfile**, target de build: `production`.
2. **Porta exposta**: `3000`.
3. **Domínio**: atribuir um domínio/subdomínio ao recurso no painel (ou usar o domínio
   automático, se o servidor tiver wildcard configurado) — o Coolify emite HTTPS via Let's
   Encrypt sozinho para esse domínio. É esse domínio que vira `VITE_API_URL` no frontend
   (Parte 4) e `FRONTEND_URL`/CORS no sentido inverso.
4. **Health Check**: path `/health`, porta `3000`.
5. **Environment Variables** (aba do recurso): usar `.env.prod.example` (raiz do repo) como
   checklist e colar os valores reais aqui — inclusive o `MONGODB_URI` copiado da Parte 1.
   Nada disso vai para arquivo na VPS nem para o git.
6. **Webhooks**: na aba "Webhooks" do Application, copiar a URL de deploy; gerar um token de
   API em **Keys & Tokens** (configurações da conta/servidor) — os dois vão para os secrets
   do GitHub na Parte 5.

---

## Parte 3 — Cloudflare R2

1. Criar bucket (ex: `claudio-prod`).
2. Criar API Token R2 (Access Key ID + Secret).
3. Expor o bucket publicamente (domínio `r2.dev` ou domínio custom) → vira o `R2_PUBLIC_URL`.
4. Preencher os `R2_*` nas Environment Variables do Application no Coolify (Parte 2.5). Com
   `R2_ENDPOINT` vazio o código fala com o R2 real.
5. Validar CORS do bucket se o front buscar assets direto do `R2_PUBLIC_URL`.

---

## Parte 4 — Frontend na Vercel

1. No painel Vercel: importar o repo, **Root Directory = `frontend`**, framework Vite, Build
   `npm run build`, Output `dist`. O rewrite de SPA já está em `frontend/vercel.json`.
2. Env var (Production): `VITE_API_URL=` domínio atribuído ao backend no Coolify (Parte 2.3).
3. Domínio próprio opcional — o domínio padrão `*.vercel.app` funciona normalmente, com
   HTTPS automático.
4. `FRONTEND_URL` no backend (Coolify, Parte 2.5) deve ser exatamente a URL de produção da
   Vercel — CORS aceita só essa origin (**previews da Vercel terão URL diferente e serão
   bloqueadas**; aceitável no início).

---

## Parte 5 — GitHub Actions: testes + trigger do deploy

`.github/workflows/deploy-backend.yml`, em `push` na `main` com `paths: ['backend/**']`:

- Job `test`: `npm ci && npm run build && npm run test` no backend.
- Job `deploy` (`needs: test`, só roda se os testes passarem): `curl -X POST` na URL de
  webhook do Coolify (Parte 2.6) com `Authorization: Bearer $COOLIFY_API_TOKEN`. O Coolify
  faz o build (Dockerfile, target `production`) e o deploy zero-downtime sozinho, usando o
  `/health` como critério de sucesso.
- Secrets do repo: `COOLIFY_WEBHOOK_URL`, `COOLIFY_API_TOKEN`.
- O frontend **não** precisa de workflow — a Vercel faz deploy automático a cada push.

---

## Parte 6 — Ajustes no código (com TDD) — já feitos

1. **`trust proxy`** em `backend/src/main.ts` — necessário atrás do Traefik do Coolify para o
   `ThrottlerGuard` enxergar o IP real via `X-Forwarded-For`. Feito.
2. **`/health`** (`backend/src/modules/health/`) — feito, com teste (TDD), faz ping real no
   Mongo.

---

## Parte 7 — Hardening / operação

- **Backup do Mongo**: resolvido pelo backup agendado do recurso Database do Coolify (Parte 1.2).
- **Segredos**: `JWT_SECRET`, credenciais Mongo (geradas pelo Coolify) e chaves R2 fortes e
  únicas, guardadas só na UI do Coolify e nos Secrets do GitHub — nunca no repo.
- **`SEED_ADMIN_PASSWORD`** forte — é a única conta inicial (registro invite-only).
- **Logs/observabilidade**: Coolify já centraliza logs de build e runtime por recurso no
  painel; considerar um agregador externo só se a escala justificar.

---

## Arquivos a criar / modificar

| Arquivo | Ação |
|---|---|
| `.env.prod.example` (raiz) | Feito — checklist de env vars para colar na UI do Coolify |
| `frontend/vercel.json` | Feito — rewrite SPA |
| `.github/workflows/deploy-backend.yml` | Feito — testa e dispara webhook do Coolify |
| `backend/src/main.ts` | Feito — `app.set('trust proxy', 1)` |
| `backend/src/modules/health/*` | Feito — endpoint `/health` com teste |
| Recurso Database (MongoDB) no Coolify | Criar no painel — Parte 1 |
| Recurso Application (backend) no Coolify | Criar no painel — Parte 2 |

---

## Verificação end-to-end

1. **Coolify**: recurso Database (Mongo) e Application (backend) com status "Running";
   `/health` retornando 200 via o domínio HTTPS atribuído ao backend.
2. **Mongo isolado**: sem porta pública exposta pelo recurso Database.
3. **Frontend**: acessar a URL da Vercel, DevTools → Network, chamadas para o domínio do
   backend sem erro de CORS/mixed-content.
4. **Login admin**: logar com `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`; criar space; upload
   de avatar/anexo servido a partir do `R2_PUBLIC_URL`.
5. **CI/CD**: push em `main` alterando `backend/**` → job `test` verde → webhook do Coolify
   disparado → novo deploy aparece no painel do Coolify.
6. **Testes**: `cd backend && npm run test` e `cd frontend && npm run test` verdes antes do
   deploy (garantido pelo `needs: test` do workflow).
