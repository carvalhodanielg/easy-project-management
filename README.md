# AtkPlan

A project management tool built with NestJS, React and MongoDB. Manage spaces, lists, sprints, tasks, wiki documents and sprint notes — all in a dark, keyboard-friendly UI.

---

## Tech stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | NestJS · Mongoose · MongoDB · Passport JWT      |
| Frontend  | React 19 · Vite · TypeScript · Tailwind CSS v4  |
| State     | Zustand (auth) · TanStack Query (server data)   |
| Infra     | Docker Compose                                  |
| MCP       | Node.js · @modelcontextprotocol/sdk             |

---

## Features

- **Spaces** — workspaces with role-based membership (Editor / Viewer)
- **Lists** — task lists inside a space with inline status changes and drag-and-drop reordering
- **Sprints** — time-boxed iterations with burndown chart, velocity, and distribution dashboards
- **Tasks** — subtasks, assignees, tags, priority, due date, comments, attachments and activity log
- **Kanban board** — drag-and-drop board view per sprint or list
- **Sprint notes** — Obsidian-style Markdown editor with labels, auto-save and comments
- **Wiki** — folders and documents with live Markdown editor
- **Filters & grouping** — filter by status, priority, assignee, tag; group by any field; save filters per space
- **Global search** — `Ctrl/Cmd+K` searches tasks, notes, and wiki documents across a space
- **Notifications** — in-app bell with badge; events for task assignment, comments, and @mentions
- **@mentions** — autocomplete dropdown in comments and notes; notifies mentioned members
- **Activity log** — full history of changes per task (status, priority, assignees, dates, points)

---

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run the full stack

```bash
git clone git@github.com:carvalhodanielg/AtkPlan.git
cd AtkPlan
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173   |
| Backend  | http://localhost:3000   |
| MongoDB  | localhost:27017         |

### Environment variables

The defaults work out of the box for local development. Override via a `.env` file in the project root or by exporting variables before running `docker compose`.

| Variable       | Default                  | Description                        |
|----------------|--------------------------|------------------------------------|
| `JWT_SECRET`   | `changeme-in-development`| JWT signing secret                 |
| `JWT_EXPIRES_IN` | `7d`                   | Token expiry                       |
| `FRONTEND_URL` | `http://localhost:5173`  | CORS allowed origin                |
| `VITE_API_URL` | `http://localhost:3000`  | Backend URL used by the browser    |

---

## Development

### Backend only

```bash
cd backend
npm install
npm run start:dev      # watch mode — http://localhost:3000
npm run test           # unit tests (Jest)
npm run test:e2e       # e2e tests (mongodb-memory-server)
npm run lint           # ESLint with auto-fix
```

### Frontend only

```bash
cd frontend
npm install
npm run dev            # Vite dev server — http://localhost:5173
npm run test           # Vitest single run
npm run test:watch     # Vitest watch mode
npm run build          # tsc + Vite production build
```

---

## Project structure

```
.
├── backend/
│   └── src/
│       ├── common/          # Guards, pipes, interceptors, filters
│       ├── config/          # Configuration factory
│       ├── database/        # Mongoose connection module
│       └── modules/
│           ├── auth/        # JWT authentication
│           ├── users/       # User search
│           ├── spaces/      # Spaces + role-based membership
│           ├── lists/       # Task lists
│           ├── sprints/     # Sprints
│           ├── tasks/         # Tasks, subtasks, filtering, grouping
│           ├── task-events/   # Activity log (creation, edits, status changes)
│           ├── tags/          # Tags
│           ├── comments/      # Task comments with @mention support
│           ├── attachments/   # File uploads
│           ├── notes/         # Sprint notes + note comments
│           ├── wiki/          # Wiki folders and documents
│           ├── notifications/ # In-app notifications and events
│           ├── search/        # Global search across tasks, notes, wiki
│           ├── saved-filters/ # Saved filter sets per space
│           └── seed/          # Database seeder for development
└── frontend/
    └── src/
        ├── api/             # Axios API clients (one file per resource)
        ├── components/      # Shared UI components
        ├── hooks/           # Custom React hooks
        ├── pages/           # Route-level page components
        ├── routes/          # React Router configuration
        ├── store/           # Zustand stores
        └── types/           # TypeScript types
```

---

## MCP — Controle via linguagem natural

O projeto inclui um servidor MCP (Model Context Protocol) que permite controlar espaços, sprints e tarefas via linguagem natural dentro do Claude Code ou qualquer cliente MCP compatível.

### Configuração

1. **Build do servidor:**
   ```bash
   cd mcp && npm install && npm run build
   ```

2. **Crie o arquivo `.mcp.json` na raiz do projeto** com suas credenciais:
   ```json
   {
     "mcpServers": {
       "claudio": {
         "command": "node",
         "args": ["/caminho/absoluto/para/claudio/mcp/dist/index.js"],
         "env": {
           "CLAUDIO_API_URL": "http://localhost:3000",
           "CLAUDIO_EMAIL": "seu@email.com",
           "CLAUDIO_PASSWORD": "sua_senha"
         }
       }
     }
   }
   ```

   > `.mcp.json` está no `.gitignore` — nunca commite esse arquivo, pois contém credenciais.

3. **Reinicie o Claude Code** e verifique com `/mcp`. O servidor `claudio` deve aparecer com 10 ferramentas disponíveis.

### Ferramentas disponíveis

`list_spaces` · `list_members` · `list_sprint_folders` · `list_sprints` · `get_sprint_stats` · `create_sprint_folder` · `update_sprint` · `list_tasks` · `create_task` · `update_task`

Consulte [`mcp/README.md`](mcp/README.md) para documentação completa.

---

## Architecture notes

**Authorization flow** — `JwtAuthGuard` validates the Bearer token and attaches `req.user`. `SpaceRoleGuard` (with optional `@Roles()`) then checks the user's `SpaceMember` record for the `spaceId` route param. All space-scoped controllers use both guards.

**API responses** — the `TransformInterceptor` wraps every successful response in `{ data, statusCode, timestamp }`. Errors are normalised by `AllExceptionsFilter`.

**Domain rules**:
- A task belongs to either a `listId` or a `sprintId` — never both, never neither
- Story points must be Fibonacci numbers
- Task statuses and priorities use Portuguese enum values

**Testing** — backend unit tests use manual mocks; e2e tests use `mongodb-memory-server`. Frontend tests use Vitest + Testing Library.
