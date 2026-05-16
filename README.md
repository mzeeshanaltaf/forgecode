# Lightcode

A monorepo built with Bun workspaces, featuring a Hono API server with Prisma/Postgres persistence and an OpenTUI terminal interface.

## Structure

```
lightcode/
├── apps/
│   ├── server/   # Hono HTTP server (Bun native) + Prisma
│   └── cli/      # OpenTUI chat interface (React reconciler)
├── packages/
│   └── shared/   # Shared zod schemas (@lightcode/shared)
├── tsconfig.base.json
└── package.json
```

## Requirements

- [Bun](https://bun.sh) v1.0+
- A Postgres database (Prisma Postgres recommended)
- An OpenAI API key

## Getting started

```bash
bun install
```

Create `apps/server/.env` (see `apps/server/.env.example`):

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://...
# Optional — one of: default | auto | flex | priority
OPENAI_SERVICE_TIER=
```

Push the Prisma schema to your database (no migration files; use this during development):

```bash
bun run db:push
```

## Running

```bash
# Hono server — http://localhost:3000
bun run dev:server

# OpenTUI chat app (Ctrl+C to exit)
bun run dev:cli
```

## Database scripts

All runnable from the repo root:

| Script | What it does |
|---|---|
| `bun run db:generate` | Regenerate the Prisma Client (run after schema edits) |
| `bun run db:push` | Sync `schema.prisma` to the live DB (development workflow — no migration files) |
| `bun run db:studio` | Open Prisma Studio to browse tables |

## API surface

The server exposes one resource — sessions:

| Endpoint | Purpose |
|---|---|
| `POST /sessions` | Create a new session, returns `{ id }` |
| `GET /sessions/:id/messages` | Fetch the full message history for a session |
| `POST /sessions/:id/messages` | Append a user message and stream the assistant reply |

The CLI navigates to `/sessions/:id` after creating a session and uses the AI SDK's `useChat` hook against the streaming endpoint. The server is the source of truth for history — the CLI sends only the new user message each turn and the server loads the full context from the DB before calling the model.

## Stack

| Layer | Technology |
|---|---|
| Runtime & package manager | [Bun](https://bun.sh) |
| HTTP server | [Hono](https://hono.dev) |
| Terminal UI | [OpenTUI](https://github.com/anomalyco/opentui) (React reconciler) |
| AI streaming | [AI SDK](https://ai-sdk.dev) with OpenAI |
| Database | Postgres via [Prisma](https://prisma.io) (driver-adapter setup) |
| Validation | [Zod](https://zod.dev) |
| Language | TypeScript |
