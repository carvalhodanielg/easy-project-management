# Roadmap

Features planejadas para o projeto. Ordenadas por impacto estimado.

---

## Concluídas

- [x] Busca global (`Cmd/Ctrl+K`) — tarefas, notas e documentos wiki por espaço
- [x] Notificações in-app — sino com badge, polling 15s, eventos `task_assigned` e `comment_added`
- [x] Drag-and-drop na list view — reordenar tarefas arrastando na visualização de lista (`SprintPage` e `ListPage`)
- [x] Dashboard de sprint — burndown chart, velocidade vs sprint anterior, distribuição por status e responsável
- [x] Menções `@usuario` em comentários e notas — dropdown de membros, notificação `mention`, campo `mentions[]` persistido
- [x] Activity log por tarefa — collection `TaskEvent`, eventos de criação/edição de status, prioridade, nome, descrição, datas, pontos e responsáveis; exibidos no painel de detalhes da tarefa
- [x] Filtros salvos — salvar combinações de filtros por espaço com nome, carregar e excluir; disponível em listas e sprints via botão "Salvos" na FilterBar
- [x] Edição inline na lista — responsável, story points e status editáveis diretamente na linha da tarefa com popovers otimistas
- [x] Menu de ações por tarefa — botão `⋯` em cada linha de tarefa e subtarefa com **Apagar** (cascade delete de subtarefas + aviso), **Mover** e **Duplicar**; subtarefas têm sub-ações "Mudar pai" e "Promover para tarefa principal"
- [x] Pastas de sprints configuráveis — schema `SprintFolder`, cron de encerramento automático e geração de sprints futuras, integração no MCP (`create_sprint_folder`, `list_sprint_folders`, `update_sprint`)
- [x] Bloqueio de conclusão por dependências — impede marcar tarefa como concluída enquanto dependências estão pendentes

---

## Alta prioridade

### Layout da tela de tarefa estilo ClickUp
Redesenhar o painel de detalhes da tarefa com layout de três colunas: subtarefas à esquerda, campos e descrição no centro, atividade + comentários à direita. Atualmente tudo é exibido em coluna única em um drawer lateral. A mudança aproxima a experiência do ClickUp e melhora a densidade de informação sem sacrificar usabilidade.

### Seletor de pontos: posicionamento e margem
O popover do seletor de story points deve exibir acima quando não há espaço abaixo na tela (detecção de viewport). Adicionar margem inferior para evitar que fique colado à borda da janela.

### Melhorias de header (redução de altura e espaço)
O header atual ocupa espaço demais. Quatro ajustes planejados:
1. **Notificações integradas ao nome** — remover a barra superior dedicada e mover o sino de notificações para junto do nome/avatar do usuário.
2. **Título do sprint menor** — reduzir fonte/padding do título da sprint no header.
3. **Barra de navegação (Tarefas / Lista / Dashboard)** — repensar o visual para algo mais compacto (ex.: tabs pequenas, pills ou ícones com tooltip).
4. **Persistência de agrupamento e ordenação** — definir estratégia de salvamento: automático por usuário (salvo no perfil/localStorage) ou compartilhado com o espaço. Levantar requisito antes de implementar.

### Lembretes de prazo
Notificação automática quando uma tarefa está vencendo (ex.: 1 dia antes do `dueDate`). Requer um job agendado no backend (cron NestJS) que consulta tarefas com `dueDate` próximo e cria notificações `due_soon`. Baixo custo, alto impacto para adoção.

### Atalhos de teclado
- `N` — nova tarefa (quando em lista/sprint)
- `F` — abrir filtros
- `?` — modal de referência de atalhos
- `Esc` — fechar modais/painéis

Quick win — já existe infraestrutura de modais, é só adicionar event listeners globais.

### Perfil e upload de avatar
Página de perfil do usuário com upload de foto. O campo `avatarUrl` já existe no schema de User mas nunca é preenchido. O módulo de attachments já tem lógica de upload que pode ser reaproveitada.

### Operações em lote (bulk actions)
Selecionar múltiplas tarefas via checkbox e aplicar ação em todas: mudar status, prioridade, responsável, mover para outro sprint/lista, ou apagar. Requer endpoint `PATCH /spaces/:spaceId/tasks/bulk` (recebe array de `taskId` + payload) e UI de seleção na lista. Alta alavancagem para times que gerenciam muitas tarefas.

---

## Média prioridade

### Timeline / Gantt view
Terceira visualização além de Lista e Board. Mostra tarefas numa linha do tempo com base em `startDate`/`dueDate`. Especialmente útil na tela de sprint.

### Notificações por e-mail
Complemento às notificações in-app: enviar e-mail quando o usuário não estiver ativo (tarefa atribuída, menção, prazo próximo). Requer `@nestjs/mailer` + SMTP configurável por espaço. O flag `read` da notificação já existe, pode ser usado para decidir se envia o e-mail.

### Rastreamento de tempo (time tracking)
Registrar horas trabalhadas por tarefa — início/pausa/fim manual ou timer automático. Gera relatório de horas por sprint e por membro. Campos: `timeEntries[]` com `userId`, `startedAt`, `stoppedAt`, `durationMin`. Essencial para times que faturam por hora ou precisam de controle de capacidade.

### Workload view
Visualização de carga por membro: quantas tarefas e story points cada pessoa tem atribuídos na semana/sprint. Ajuda a identificar gargalos antes que o sprint seja comprometido. Dados já existem, é uma agregação + UI de calendário por membro.

### Import / Export
- Exportar tarefas de uma lista ou sprint como CSV
- Importar tarefas via CSV (com mapeamento de colunas)

Importante para onboarding de times que vêm de outras ferramentas (Trello, Jira, ClickUp).

### Relatórios por espaço
Além do dashboard de sprint, uma visão de produtividade do espaço inteiro: velocity histórica por sprint, tarefas abertas vs fechadas por semana, distribuição de carga por membro. Requer apenas agregações MongoDB sobre dados já existentes.

### Templates de tarefa
Salvar uma tarefa (com subtarefas, checklist, campos pré-preenchidos) como template reutilizável por espaço. Útil para fluxos repetitivos como onboarding, release checklist, bug report. Schema `TaskTemplate` vinculado ao `spaceId`; ao criar tarefa, opção "usar template".

---

## Baixa prioridade / Futuro

### Campos customizados nas tarefas
Permitir que cada espaço defina campos extras (dropdown, texto, número, checkbox) que aparecem nas tarefas. Feature avançada e diferenciadora, requer mudança no schema de Task para suportar campos dinâmicos e UI de configuração nas settings do espaço.

### Tarefas recorrentes
Tarefa que se recria automaticamente após ser concluída (diária, semanal, mensal). Campo `recurrence` no schema de Task com regra RRULE; cron NestJS cria a próxima ocorrência quando a atual é marcada como concluída. Bom para cerimônias de time (daily, weekly review).

### Compartilhamento público (read-only)
Gerar link público de um sprint ou lista para visualização sem login. Útil para stakeholders externos. Requer token de acesso sem autenticação e rota pública no backend com dados limitados.

### Integração com GitHub / GitLab
Linkar commits e PRs a tarefas pelo número ou hash. Exibe status do PR diretamente no card da tarefa. Requer webhook ou polling na API do GitHub/GitLab.

### Real-time com WebSockets
Substituir o polling de notificações por WebSockets (`socket.io`). O NestJS suporta nativamente. Benefício: colaboração em tempo real (ver quando alguém edita uma tarefa, receber notificações sem delay).

### PWA / Mobile
Tornar o frontend instalável como Progressive Web App com service worker e cache offline. Prioridade baixa enquanto o core da experiência é desktop-first.

---

## Notas técnicas

- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (já instalado)
- Charts: `recharts` (já instalado para o dashboard de sprint)
- Cron jobs: `@nestjs/schedule` para lembretes de prazo e tarefas recorrentes
- Real-time: `@nestjs/websockets` + `socket.io`
- E-mail: `@nestjs/mailer` + Nodemailer
- Busca: o módulo atual usa `$regex`; para escala considerar índices `$text` ou Atlas Search
- Time tracking: duração em minutos no MongoDB, aggregation pipeline para relatórios
