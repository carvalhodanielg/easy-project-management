# Avaliação completa do projeto Claudio (AtkPlan)

## Contexto

O usuário pediu uma avaliação crítica de todo o projeto: qualidade das soluções, o que
falta, bugs ocultos, falhas de UI e de segurança, e features que faltariam para uma
aplicação de gestão de projetos desse tipo. Este documento é o resultado da auditoria
(backend NestJS/Mongo, frontend React/Vite, infra Docker) e propõe um roteiro priorizado
de correções. Achados de maior gravidade foram verificados diretamente no código.

> Observação importante: o `GAPS.md` do repositório está **desatualizado**. Vários itens
> listados como P0 "faltando" (reset de senha, verificação de e-mail, refresh tokens,
> convite por e-mail/token, soft-delete/lixeira, Helmet, rate limiting) **já estão
> implementados**. O roadmap precisa ser revisado para refletir o estado atual.

---

## Avaliação geral

O projeto está **acima da média** para um app desse porte: arquitetura modular limpa no
backend (schema→dto→service→controller→module), guards de autenticação/RBAC, `ValidationPipe`
global com whitelist, Helmet, throttler, refresh tokens revogáveis, fluxos de reset de senha
e verificação de e-mail bem feitos (token aleatório, expiração, uso único, sem enumeração de
conta). No frontend há um cliente axios com refresh de 401 deduplicado, soft-delete com undo,
editor markdown unificado e boa cobertura de testes (~35 arquivos). TDD é levado a sério.

Os problemas concentram-se em: **alguns IDORs reais**, **uma regra de domínio não imposta em
todos os caminhos**, **feedback de erro inconsistente na UI**, **ausência de CI/CD** e
**lacunas de acessibilidade/mobile**.

---

## Segurança (prioridade)

### 🔴 ALTO — IDOR: leitura de task/subtasks cruzando spaces  *(verificado)*
`tasks.controller.ts:171-174` (`GET :taskId`) e `:226-229` (`GET :taskId/subtasks`) chamam
`tasksService.findById(taskId)` / `findSubtasks(taskId)` **sem o `spaceId`**.
`findById` (`tasks.service.ts:105-116`) e `findSubtasks` (`:161-167`) filtram só por `_id`.
O `SpaceRoleGuard` só garante que o usuário é membro do space **da URL** — não que a task
pertença a ele. Um membro do space A pode fazer `GET /spaces/<A>/tasks/<id-do-space-B>` e ler
título, status, assignees, tags e dependências de uma task de outro space.
**Correção:** passar `spaceId` para `findById`/`findSubtasks` e incluir no filtro Mongo.

### 🟠 MÉDIO — `update()` usa task de outro space na lógica de negócio  *(verificado)*
`tasks.service.ts:177` carrega `findById(taskId)` sem `spaceId`. O `findOneAndUpdate` final
(`:218-223`) é escopado por `spaceId`, então a **escrita está protegida** (retorna 404), mas
a verificação de `blockedBy` (`:198-216`) roda sobre a task errada e pode vazar nomes de
tarefas bloqueadoras de outro space na mensagem de erro. **Correção:** carregar `existing`
já filtrando por `spaceId`.

### 🟠 MÉDIO — `move()` permite estado inválido (viola regra de domínio)
`MoveTaskDto` (`dto/create-task.dto.ts:125-133`) marca `listId` e `sprintId` como opcionais
sem validação cruzada; `tasks.service.ts:386-409` grava ambos como vêm. É possível mover uma
task para `listId=null` **e** `sprintId=null`, violando a regra "task pertence a list XOR
sprint". O `create()` impõe a regra, o `move()` não. **Correção:** validar XOR no DTO/serviço.

### 🟠 MÉDIO — Attachments sem verificação de dono/space
Upload exige JWT, mas o delete de attachment não verifica propriedade —
qualquer autenticado com o ObjectId pode remover anexo (e o arquivo em disco) de terceiros.
O schema tem `uploadedBy` mas não `spaceId`. **Correção aprovada (owner-scoping):**
`remove(userId, attachmentId)` via `findOneAndDelete({ _id, uploadedBy })`; 404 e sem unlink
quando não casar. Também falta sanitização de nome de arquivo (renomear no backend).

### 🟡 BAIXO — Higiene de tipos/segurança
- `wiki.controller.ts:31` usa `@Roles('editor','viewer')` (strings) em vez do enum `SpaceRole`.
- `saved-filters.controller.ts:35` usa `@Request()` tipado à mão em vez de `@CurrentUser()`.
- Token em `localStorage` (`auth.store.ts`) → padrão de SPA, mas exige expiração curta (ok,
  15m) + CSP. Adicionar header CSP no frontend/proxy.
- `JWT_SECRET` tem fallback `'changeme-in-production'` (`config/configuration.ts`). Em produção
  deve falhar se ausente, não usar default.

---

## Bugs ocultos / qualidade

**Backend**
- Sem paginação em `findBySpace` / listagens — carrega todas as tasks do space (escala mal).
- Sem testes para guards/IDOR/cross-space; nenhum teste de autorização end-to-end.

**Frontend**
- `KanbanView.tsx:38-48` — update otimista de status sem rollback visível nem toast em falha
  (só invalida query → flicker silencioso). Idem edições inline em `TaskRow`.
- Mutações sem `onError`: `useDeleteTaskWithUndo`, `useMoveTaskWithUndo`, `SubtaskList` create
  — a falha não é comunicada (toast de undo aparece mesmo se o backend recusou).
- `ListPage.tsx:130` / `SprintPage.tsx:131` usam `alert()` nativo para erro de criar task.
- `SpaceLayout.tsx:676-679` — `handleGlobalKey` recriado a cada render (listener removido/
  readicionado sempre). Memoizar com `useCallback`.
- Possível corrida em DnD: move cross-sprint + update otimista do Kanban podem conflitar.
- `WikiDocumentPage`/`NoteDetailPage` — `saveStatus` pode não atualizar se desmontar durante o
  save; preferir `mutation.isPending`.

---

## Falhas de UI/UX

- **Erros engolidos**: não há padrão de toast/snackbar global; erros ficam em estado local e
  passam despercebidos. **É o item de UX mais impactante.**
- **Confirmação inconsistente**: delete permanente tem `window.confirm`, mas soft-delete em
  lista não tem nenhuma confirmação (só undo de 6s).
- **Estados vazios/carregando** ausentes em vários lugares (comentários, subtasks, colunas
  Kanban, mutações sem feedback).
- **Acessibilidade**: sem focus trap/retorno de foco em modais, poucos `aria-label`, Kanban
  não navegável por teclado.
- **Mobile**: colunas Kanban com `w-64` fixo, modal `max-w-[1280px]`, sidebar não colapsa em
  telas pequenas, cue de drag pode sobrepor botões.

---

## Infra / processo

- 🔴 **Sem CI/CD** (`.github/workflows/` inexistente). Nada de lint/test/build automatizado em
  PR — risco alto dado o compromisso com TDD. **Maior lacuna de processo.**
- Docker: credenciais Mongo/MinIO hardcoded no compose (ok p/ dev, perigoso se vazar p/ prod),
  sem healthcheck em backend/frontend, sem limites de recurso.
- Sem guia de deploy de produção (HTTPS, proxy, gestão de secrets, backup do Mongo).
- Deps saudáveis; só updates menores pendentes. `.gitignore` correto; sem secrets commitados.

---

## Features que faltam para um app desse tipo

Itens comuns em ferramentas de gestão (ClickUp/Jira-like) ainda ausentes:
- **Notificações em tempo real** (WebSocket) em vez de polling de 15s.
- **Busca full-text indexada** (hoje `$regex` sem índice de texto).
- **Paginação/virtualização** para listas grandes.
- **Relatórios/dashboards**: burndown de sprint, velocity, gráfico de carga por pessoa.
- **Visões adicionais**: timeline/Gantt, calendário, board agrupado por assignee.
- **Recorrência de tarefas** e **templates** de task/sprint/space.
- **Tarefas com tempo** (estimativa vs. tempo gasto / time tracking).
- **Webhooks / API pública / integrações** (Slack, GitHub).
- **Exportação** (CSV/JSON) e importação.
- **Auditoria ampla** (hoje só task tem event log; faltam space/membros/sprint).
- **i18n** (UI mistura PT em enums e textos; sem framework de tradução).

---

## Roteiro de correção sugerido (priorizado)

Seguindo TDD (teste antes da correção) e disciplina de commit por feature:

1. **Segurança crítica** — escopar `findById`/`findSubtasks`/`update` por `spaceId`; validar
   XOR no `move`; owner-scoping no delete de attachment. + testes de cross-space/IDOR.
2. **CI/CD** — GitHub Actions: lint + test + build (back e front) bloqueando merge.
3. **Feedback de erro no frontend** — sistema de toast global; `onError` em todas as mutações;
   remover `alert()`; rollback visível no Kanban.
4. **Paginação** nas listagens de task do backend (+ frontend).
5. **Acessibilidade/mobile** — focus trap em modais, Kanban responsivo e por teclado.
6. **Atualizar GAPS.md** para refletir o que já foi entregue.
7. (Backlog) features novas: WebSocket, relatórios de sprint, busca indexada, i18n.

## Verificação
- Backend: `cd backend && npm run test` (adicionar specs de autorização cross-space que devem
  falhar antes da correção do IDOR e passar depois); `npm run lint`.
- Frontend: `cd frontend && npm run test`; smoke manual do Kanban (forçar erro de rede e ver
  toast/rollback).
- IDOR (manual): com dois spaces e usuário só no space A, `GET /spaces/<A>/tasks/<id-de-B>`
  deve retornar 404 após a correção (hoje retorna a task).
