# GAPS — Análise de lacunas

Análise do estado atual do Claudio (AtkPlan) focada no que **ainda não existe** e é
esperado de um sistema de gestão de projetos multiusuário. Complementa o `ROADMAP.md`:
aqui estão sobretudo lacunas que o roadmap **não** cobre, identificadas direto no código.

---

## 🔴 Lacunas críticas — "não pode não existir"

Ausências graves para um sistema multiusuário em produção. Nenhuma está no roadmap.

### 1. Convite de membros por e-mail
`POST /spaces/:spaceId/members` exige `userId` (`@IsMongoId`) no `AddMemberDto`.
Não existe forma de convidar alguém que ainda não tenha conta — seria preciso saber o
ObjectId interno do usuário. Inviabiliza o onboarding de times na prática.

→ Precisa de: convite por e-mail, geração de link/token, página de aceite e estado
"pendente" no `SpaceMember`.

### 2. Recuperação de senha ("esqueci minha senha")
`auth.controller.ts` só expõe `register`, `login` e `me`. Não há `forgot-password` nem
`reset-password`. Um usuário que esquece a senha fica permanentemente trancado para fora.

### 3. Verificação de e-mail no cadastro
O cadastro aceita qualquer e-mail sem confirmação. Não há `emailVerified` no schema de
`User`. Abre porta para contas falsas e erros de digitação que quebram as notificações
por e-mail já planejadas.

### 4. Gestão de sessão / refresh token
JWT único de `7d`, sem refresh token e sem logout real / revogação. Se um token vazar,
fica válido por uma semana sem como invalidá-lo. Ideal: access token curto + refresh
token + revogação (ou rotação).

### 5. Papéis insuficientes (RBAC raso)
Só existem `Editor` e `Viewer`. Faltam:
- **Owner/Admin** distinto do criador (hoje o criador é apenas "Editor"), com poder de
  gerenciar membros e deletar o espaço.
- **Transferência de propriedade** do espaço.
- Auditar se qualquer `Editor` pode gerenciar membros hoje (revisar `SpaceRoleGuard` nas
  rotas `/members`).

---

## ⚙️ Funcionalidade / Dados

- **Soft delete / arquivamento**: deleção é permanente (cascade delete de subtarefas).
  Não há `archivedAt` nem lixeira. Arquivar e restaurar espaço/lista/sprint é esperado;
  sem isso, um clique errado perde dados.
- **Paginação ausente**: `findBySpace` em `tasks.service.ts` não tem `limit`/`skip`/
  cursor. Espaços com milhares de tarefas carregam tudo de uma vez — problema de
  performance e de payload.
- **Auditoria além da tarefa**: existe `TaskEvent` (bom), mas mudanças em espaços,
  membros, sprints e permissões não são auditadas.
- **Anexos**: confirmar limite de tamanho, validação de MIME e scan no upload (R2).
  Revisar `common/r2` e `common/security`.

---

## 🚀 Desempenho

- **Notificações via polling 15s** — já no roadmap (WebSockets); subiria de prioridade,
  é o maior ganho de UX em tempo real.
- **Busca via `$regex`** — já no roadmap (índice `$text`/Atlas Search). `$regex` sem
  âncora não usa índice e degrada linearmente.
- **Virtualização de listas** no frontend: com listas grandes + edição inline,
  renderizar todas as `TaskRow` trava. Combinar com a paginação do backend
  (`@tanstack/react-virtual`).
- **Índices**: os de `Task` estão bons. Verificar se `Notification`, `Comment` e
  `TaskEvent` têm índices por `userId`/`taskId` + ordenação por data.

---

## 🎨 UI / UX

- **Acessibilidade fraca**: poucas ocorrências de `aria-*`/`role=` no frontend. Faltam
  foco gerenciado em modais (o modal de 1280px), navegação por teclado em popovers e
  labels em ícones-botão.
- **Estados vazios e de erro**: garantir empty states (lista sem tarefas, busca sem
  resultado) e skeletons de loading consistentes.
- **Responsividade** — já listado como bug conhecido (modal fixo de 1280px). Mobile-first
  nas telas core ainda falta.
- **Internacionalização**: zero i18n; enums em português hardcoded (`pendente`,
  `em_progresso`) misturados ao domínio. Isolar labels agora evita refação dolorosa.
- **Undo/confirmações**: para ações destrutivas (delete cascade), um "desfazer" via toast
  é mais amigável que só o aviso.

---

## ✨ Features que faltam para competir com ClickUp/Jira

O roadmap já cobre bem: Gantt/Timeline, time tracking, workload, import/export CSV,
templates, campos customizados, tarefas recorrentes, e-mail e link público.
Fora do roadmap, acrescentar:

- **Checklist dentro da tarefa** (itens marcáveis simples, distinto de subtarefas com
  schema completo).
- **Watchers/seguidores** (assignees já é array; falta "seguir" sem ser responsável para
  receber notificações).
- **Estados de workflow customizáveis** por espaço (hoje status é enum fixo em português;
  times querem definir as próprias colunas do board).
- **Favoritos / acesso rápido** a espaços, listas e tarefas.
- **Configurações de notificação por usuário** (quais eventos notificam in-app/e-mail).

---

## Sugestão de priorização

| Prioridade | Item | Por quê |
|---|---|---|
| **P0** | Convite por e-mail + reset de senha + verificação de e-mail | Bloqueiam uso real e onboarding |
| **P0** | Refresh token / revogação de sessão | Segurança |
| **P1** | Paginação + virtualização | Quebra em escala |
| **P1** | Soft delete / arquivar / lixeira | Perda de dados |
| **P1** | Owner/Admin + transferência de propriedade | Governança |
| **P2** | WebSockets, busca `$text`, a11y, i18n | Qualidade e crescimento |
