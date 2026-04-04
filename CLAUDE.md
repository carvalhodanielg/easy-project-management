# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Claudio** (internally "AtkPlan") is a project management tool with a NestJS backend and React frontend. The full stack runs via Docker Compose with MongoDB.

## Commands

### Docker (recommended for full stack)
```bash
docker compose up            # start all services (mongo, backend, frontend)
docker compose up --build    # rebuild and start
```

### Backend (`cd backend`)
```bash
npm run start:dev    # watch mode on port 3000
npm run build        # compile to dist/
npm run lint         # eslint with auto-fix
npm run test         # unit tests (jest)
npm run test:e2e     # e2e tests
npm run test -- --testPathPattern=auth   # run a single test file
```

### Frontend (`cd frontend`)
```bash
npm run dev          # vite dev server on port 5173
npm run build        # tsc + vite build
npm run lint         # eslint
npm run test         # vitest (single run)
npm run test:watch   # vitest watch mode
```

## Architecture

### Backend (NestJS + MongoDB/Mongoose)

Feature modules live under `backend/src/modules/`. Each module follows the pattern: `schema → dto → service → controller → module`.

**Authorization flow**: `JwtAuthGuard` (global on protected routes) validates the JWT and attaches `req.user`. `SpaceRoleGuard` (combined with `@Roles()` decorator) then checks the user's `SpaceMember` record for the `spaceId` route param. All controllers under a space must include `SpaceRoleGuard`.

**Global infrastructure** (`backend/src/common/`):
- `TransformInterceptor` — wraps all responses in `{ data, statusCode, timestamp }`
- `AllExceptionsFilter` — normalizes error responses
- `ObjectIdValidationPipe` — validates MongoDB ObjectId params

**Domain rules**:
- A task must belong to either a `listId` OR a `sprintId` (never both, never neither)
- Story points must be Fibonacci numbers (enforced by `FIBONACCI_POINTS` constant in task schema)
- Task statuses and priorities use Portuguese enum values (`pendente`, `em_progresso`, etc.)
- Space creator is automatically added as `Editor` role on creation

**Testing**: Backend unit tests use manual mocks (no `mongodb-memory-server`); integration/e2e tests use `mongodb-memory-server`.

### Frontend (React 19 + Vite + TypeScript)

**State management**:
- Zustand (`store/auth.store.ts`, `store/spaces.store.ts`) — persisted client state
- TanStack Query — all server data fetching and caching

**API layer** (`src/api/`): Each resource has its own file. `client.ts` (axios) injects the JWT `Bearer` token from Zustand on every request and redirects to `/login` on 401.

**Routing** (`src/routes/`): All authenticated routes are wrapped in `ProtectedRoute`. Space-scoped content lives under `/spaces/:spaceId/` with `SpaceLayout` as the outlet parent.

**Environment**: Set `VITE_API_URL` to point the frontend at the backend (defaults to `http://localhost:3000`).
