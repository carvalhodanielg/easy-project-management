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

---

## Alta prioridade

### Edição inline na lista (responsável e pontos)
Permitir alterar o responsável e a quantidade de story points diretamente na linha da tarefa, sem precisar abrir o painel de detalhes.

**Responsável:** clique no avatar/ícone na coluna abre um popover com busca de membros do espaço (reutilizando `AssigneeSelector`). Ao selecionar, chama `PATCH /tasks/:id` com o novo `assigneeId`.

**Pontos:** clique no valor de pontos (ou `—` quando vazio) abre um pequeno dropdown com os valores Fibonacci disponíveis. Ao selecionar, chama `PATCH /tasks/:id` com os novos `storyPoints`.

Ambos devem otimisticamente atualizar a UI e reverter em caso de erro.

---

### Menu de ações por tarefa na lista
Cada linha da lista deve ter uma coluna de ações (ícone `⋯`) que abre um popover com as opções:

- **Mover tarefa** — selecionar destino (outra lista ou sprint do mesmo espaço)
- **Converter para subtarefa** — associar a uma tarefa pai (transforma `parentTaskId`)
- **Converter para tarefa** — remove `parentTaskId`, promovendo a tarefa ao nível raiz
- **Duplicar** — cria uma cópia com o mesmo título, status e campos (sem histórico/comentários)
- **Arquivar** — marca a tarefa como arquivada (campo `archivedAt`); tarefas arquivadas ficam ocultas por padrão
- **Excluir** — confirmação antes de deletar permanentemente

O popover deve fechar ao clicar fora ou pressionar `Esc`. As opções "Converter para subtarefa" e "Converter para tarefa" são mutuamente exclusivas (exibir apenas a aplicável).

---

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

---

## Média prioridade

### Pastas de sprints configuráveis
Dentro de um espaço, permitir criar **pastas de sprints** — um contêiner que gera e gerencia sprints automaticamente com base em uma cadência definida.

**Configurações da pasta:**
- **Nome** — identificador da pasta de sprints
- **Dia de início do sprint** — dia da semana (segunda, terça, …, domingo) em que cada sprint começa
- **Duração** — número de semanas de cada sprint
- **Encerramento automático** — opção para marcar a sprint como concluída automaticamente quando a data de término chegar (cron NestJS)
- **Sprints futuras abertas** — quantas sprints futuras devem existir abertas ao mesmo tempo; ao finalizar uma sprint, se o total de abertas cair abaixo desse número, uma nova é criada automaticamente
- **Data limite da pasta** *(opcional)* — data de encerramento da pasta; após essa data nenhuma nova sprint é criada e a pasta é arquivada

**Requisitos técnicos:**
- Novo schema `SprintFolder` com os campos acima, vinculado ao `spaceId`
- Cron job que, a cada dia, verifica sprints vencidas para encerrar e pastas que precisam gerar novas sprints
- UI de criação/edição da pasta nas settings do espaço e acesso às sprints da pasta na sidebar



### Timeline / Gantt view
Terceira visualização além de Lista e Board. Mostra tarefas numa linha do tempo com base em `startDate`/`dueDate`. Especialmente útil na tela de sprint.

### Relatórios por espaço
Além do dashboard de sprint, uma visão de produtividade do espaço inteiro: velocity histórica por sprint, tarefas abertas vs fechadas por semana, distribuição de carga por membro. Requer apenas agregações MongoDB sobre dados já existentes.

### Import / Export
- Exportar tarefas de uma lista ou sprint como CSV
- Importar tarefas via CSV (com mapeamento de colunas)

Importante para onboarding de times que vêm de outras ferramentas (Trello, Jira, ClickUp).

---

## Baixa prioridade / Futuro

### Campos customizados nas tarefas
Permitir que cada espaço defina campos extras (dropdown, texto, número, checkbox) que aparecem nas tarefas. Feature avançada e diferenciadora, requer mudança no schema de Task para suportar campos dinâmicos e UI de configuração nas settings do espaço.

### Integração com GitHub / GitLab
Linkar commits e PRs a tarefas pelo número ou hash. Exibe status do PR diretamente no card da tarefa. Requer webhook ou polling na API do GitHub/GitLab.

### Real-time com WebSockets
Substituir o polling de notificações por WebSockets (`socket.io`). O NestJS suporta nativamente. Benefício: colaboração em tempo real (ver quando alguém edita uma tarefa, receber notificações sem delay).

---

## Notas técnicas

- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (já instalado)
- Charts: `recharts` ou `chart.js` para dashboard
- Cron jobs: `@nestjs/schedule` para lembretes de prazo
- Real-time: `@nestjs/websockets` + `socket.io`
- Busca: o módulo atual usa `$regex`; para escala considerar índices `$text` ou Atlas Search
