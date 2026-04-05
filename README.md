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

---

## Features

- **Spaces** — workspaces with role-based membership (Editor / Viewer)
- **Lists** — task lists inside a space
- **Sprints** — time-boxed iterations with progress tracking (story points)
- **Tasks** — subtasks, assignees, tags, priority, due date, comments, attachments
- **Kanban board** — drag-and-drop board view per sprint or list
- **Sprint notes** — Obsidian-style Markdown editor with labels, auto-save and comments
- **Wiki** — folders and documents with live Markdown editor
- **Filters & grouping** — filter by status, priority, assignee, tag; group by any field

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
│           ├── tasks/       # Tasks, subtasks, filtering, grouping
│           ├── tags/        # Tags
│           ├── comments/    # Task comments
│           ├── attachments/ # File uploads
│           ├── notes/       # Sprint notes + note comments
│           └── wiki/        # Wiki folders and documents
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

## Architecture notes

**Authorization flow** — `JwtAuthGuard` validates the Bearer token and attaches `req.user`. `SpaceRoleGuard` (with optional `@Roles()`) then checks the user's `SpaceMember` record for the `spaceId` route param. All space-scoped controllers use both guards.

**API responses** — the `TransformInterceptor` wraps every successful response in `{ data, statusCode, timestamp }`. Errors are normalised by `AllExceptionsFilter`.

**Domain rules**:
- A task belongs to either a `listId` or a `sprintId` — never both, never neither
- Story points must be Fibonacci numbers
- Task statuses and priorities use Portuguese enum values

**Testing** — backend unit tests use manual mocks; e2e tests use `mongodb-memory-server`. Frontend tests use Vitest + Testing Library.
