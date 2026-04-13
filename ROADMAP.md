# Roadmap

Features planejadas para o projeto. Ordenadas por impacto estimado.

---

## Concluídas

- [x] Busca global (`Cmd/Ctrl+K`) — tarefas, notas e documentos wiki por espaço
- [x] Notificações in-app — sino com badge, polling 15s, eventos `task_assigned` e `comment_added`

---

## Alta prioridade

### Drag-and-drop na list view
Reordenar tarefas arrastando na visualização de lista. O campo `position` já existe no schema de tarefas e o `@dnd-kit` já está instalado. Falta apenas a UI de arrastar nas páginas `SprintPage` e `ListPage`.

### Dashboard de sprint
Página com métricas da sprint atual:
- Burndown chart (story points restantes × dias)
- Velocidade comparada à sprint anterior
- Distribuição de tarefas por status e responsável
- Os dados já existem no backend, falta apenas a visualização

---

## Média prioridade

### Menções `@usuario` em comentários e notas
Digitar `@` em qualquer comentário ou nota abre um dropdown de membros do espaço. Salva as menções como referências e dispara notificação para o usuário mencionado.

### Timeline / Gantt view
Terceira visualização além de Lista e Board. Mostra tarefas numa linha do tempo com base em `startDate`/`dueDate`. Especialmente útil na tela de sprint.

### Activity log por tarefa
Histórico de alterações em cada tarefa: quem mudou o quê e quando ("Alice: status Pendente → Em progresso"). Requer um novo campo `history: ChangeEntry[]` no schema de Task ou uma collection separada.

### Perfil e upload de avatar
Página de perfil do usuário com upload de foto. O campo `avatarUrl` já existe no schema de User mas nunca é preenchido. O módulo de attachments já tem lógica de upload que pode ser reaproveitada.

---

## Qualidade de vida

### Atalhos de teclado
- `N` — nova tarefa (quando em lista/sprint)
- `F` — abrir filtros
- `?` — modal de referência de atalhos
- `Esc` — fechar modais/painéis

### Campos customizados nas tarefas
Permitir que cada espaço defina campos extras (dropdown, texto, número, checkbox) que aparecem nas tarefas. Feature avançada e diferenciadora, requer mudança no schema de Task para suportar campos dinâmicos.

### Import / Export
- Exportar tarefas de uma lista ou sprint como CSV
- Importar tarefas via CSV (com mapeamento de colunas)

---

## Notas técnicas

- Drag-and-drop: usar `@dnd-kit/core` + `@dnd-kit/sortable` (já instalado)
- Charts: `recharts` ou `chart.js` para dashboard
- Real-time: considerar `socket.io` para notificações, já que o stack (NestJS) suporta bem WebSockets
- Busca: o módulo de search atual usa `$regex` no MongoDB; para escala considerar índices de texto (`$text`) ou Atlas Search
