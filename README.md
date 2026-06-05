# ForgeCode

> An AI coding agent that lives in your terminal.

ForgeCode is a terminal-native AI coding agent. You chat with it to plan, write, and refactor code without leaving the keyboard — right where you already work. It runs file and shell tools **on your machine** while the model and conversation history live behind a server, so your sessions are persisted, authenticated, and metered.

It's built as a [Bun](https://bun.sh) workspace monorepo: a Hono API server (with Prisma/Postgres persistence, Clerk authentication, and Polar usage-billing) paired with an [OpenTUI](https://github.com/anomalyco/opentui) terminal client rendered through React.

---

## Table of contents

- [Install](#install)
- [Features](#features)
- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Running locally](#running-locally)
- [Installing the CLI globally (`bun link`)](#installing-the-cli-globally-bun-link)
- [Building](#building)
- [Deploying the server (Vercel)](#deploying-the-server-vercel)
- [Workspaces](#workspaces)
- [HTTP API](#http-api)
- [Database](#database)
- [Tech stack](#tech-stack)

---

## Install

> **Just want to use ForgeCode against a hosted server?** This is all you need — **no Bun, no Node, no clone.** The installer downloads a self-contained binary (the Bun runtime is embedded) and points it at the deployed server. To run the whole stack yourself instead, see [Quick start](#quick-start).

**macOS / Linux:**

```sh
curl -fsSL https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.sh | sh
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.ps1 | iex
```

The installer grabs the latest release binary, puts `forgecode` on your `PATH`, and seeds `~/.forgecode/.env` with the public server/auth config (it won't overwrite an existing one). Open a **new** terminal, then:

```sh
forgecode      # launch the TUI
```

Run `/login` inside the app to sign in with your browser.

Notes:

- Prebuilt binaries come from the [latest GitHub Release](https://github.com/mzeeshanaltaf/forgecode/releases/latest), produced for macOS (arm64/x64), Linux (x64/arm64), and Windows (x64) by the [`release` workflow](.github/workflows/release.yml) on every `v*` tag.
- Distributed builds intentionally omit the Clerk client secret — everything works, but `/whoami` token introspection is unavailable.
- Want to build the binary yourself? See [Building](#building).

### Uninstall

**macOS / Linux:**

```sh
curl -fsSL https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/uninstall.sh | sh
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/uninstall.ps1 | iex
```

This removes the `forgecode` binary (and its PATH entry on Windows) but **keeps `~/.forgecode/`** — your saved login, config, and theme — so a reinstall stays signed in. To wipe that too, add `--purge` on macOS/Linux (`… | sh -s -- --purge`) or run the Windows script with `-Purge`.

---

## Features

- **Agentic coding in the terminal** — a tool-calling loop drives file and shell tools to read, edit, and run code on your machine.
- **Two modes** — `Build` (full read/write/run access) and `Plan` (read-only research that proposes a plan before touching anything).
- **Multi-provider models** — switch between OpenAI, Anthropic, and Google models at runtime (GPT-5.1 Codex, Claude Opus/Sonnet/Haiku, Gemini), each with per-model reasoning/thinking options.
- **Persistent sessions** — every conversation, message, tool call, and error is stored in Postgres. Sessions get auto-generated titles and can be reopened from a session browser.
- **Browser-based sign-in** — OAuth 2.0 (Authorization Code + PKCE) login through Clerk, with transparent token refresh.
- **Usage-based billing** — Polar metering deducts one credit per message; a credit gate blocks sends when the balance is empty, and `/upgrade` opens a checkout to buy more.
- **Themes** — switchable color themes, persisted to a home-directory config file.
- **Slash commands & file mentions** — `/`-prefixed commands and `@`-mention file completion inside the chat input.

### Slash commands

| Command | Description |
|---|---|
| `/new` | Start a new chat |
| `/sessions` | Browse and reopen past sessions |
| `/model` | Switch the active model |
| `/theme` | Switch the color theme |
| `/login` | Sign in with your browser |
| `/logout` | Sign out and clear the saved session |
| `/whoami` | Show the signed-in account and token status |
| `/balance` | Show remaining credits |
| `/upgrade` | Buy more credits (opens checkout) |
| `/about` | About ForgeCode |
| `/exit` | Close ForgeCode |

### Agent tools

The agent has seven tools, all of which execute in the CLI's working directory (the server itself has no filesystem access): `readFile`, `writeFile`, `editFile`, `listDirectory`, `glob`, `grep`, and `runShell`. In `Plan` mode only the read-only subset is active.

---

## How it works

The **CLI** owns the terminal UI and the tools. The **server** owns the model, the conversation history, auth, and billing. A turn looks like this:

1. You type a message. The CLI sends only the new message (plus the working directory, mode, and model) to the server over a type-safe [Hono RPC](https://hono.dev/docs/guides/rpc) client, authenticated with your Clerk OAuth bearer token.
2. The server checks your credit balance, persists the message, loads the full session history from Postgres, and starts the agent's streaming tool loop.
3. Tool calls stream back to the CLI, which executes them locally and returns results — so file and shell access stay on your machine.
4. The assistant reply (and every tool call) is persisted; one credit is metered to Polar. The first message of a new session also kicks off background title generation.

Because the server is the source of truth for history, the CLI never replays the whole conversation — it sends one message and the server rebuilds context from the database.

---

## Requirements

- **[Bun](https://bun.sh)** v1.0+ — the package manager *and* the runtime. There is no separate Node.js, bundler, or transpile step; `bun run <file.ts(x)>` executes TypeScript directly.
- **A Postgres database** — any Postgres works ([Prisma Postgres](https://www.prisma.io/postgres) is a convenient option).
- **At least one model-provider API key** — OpenAI, Anthropic, and/or Google. (An OpenAI key is also used for background session-title generation.)
- **A [Clerk](https://clerk.com) application** (required) — provides the OAuth login the CLI and server share. Authentication is enforced on every request, so without Clerk configured you'll be prompted to sign in and won't be able to send messages.
- **A [Polar](https://polar.sh) account** (optional) — enables usage-based billing. Billing is **fail-open**: if the `POLAR_*` vars are unset, the credit gate is skipped and messaging works without metering.

---

## Quick start

```bash
# 1. Install all workspace dependencies
bun install

# 2. Create the server env file (see Configuration below)
cp apps/server/.env.example apps/server/.env
# …then fill in DATABASE_URL and at least one provider API key

# 3. Generate the Prisma client and push the schema to your database
bun run db:generate
bun run db:push

# 4. In one terminal, start the server
bun run dev:server      # http://localhost:3000

# 5. In another terminal, launch the TUI
bun run dev:cli         # Ctrl+C to exit
```

---

## Configuration

All runtime configuration lives in **`apps/server/.env`**. Copy the example and fill it in:

```bash
cp apps/server/.env.example apps/server/.env
```

`apps/server/.env.example` documents every variable:

```bash
# Model providers — set at least one. OpenAI is also used for session titles.
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# Postgres connection string (required)
DATABASE_URL=

# Optional account-level service tiers
# OpenAI: one of "default" | "auto" | "flex" | "priority". Unset = OpenAI default.
OPENAI_SERVICE_TIER=
# Google: one of "standard" | "flex" | "priority".
GOOGLE_SERVICE_TIER=standard

# Clerk — OAuth login shared by the CLI and server
CLERK_FRONTEND_API=""
CLERK_OAUTH_CLIENT_ID=""
CLERK_OAUTH_CLIENT_SECRET=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Polar — usage-based billing (omit all to run without billing, fail-open)
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_SERVER=sandbox
POLAR_CREDITS_METER_ID=
```

Notes:

- **Bun reads `--env-file` only at startup**, so restart the server after editing `.env`. The `dev:server` and `dev:cli` scripts both load it via `--env-file=apps/server/.env`.
- The CLI needs `CLERK_FRONTEND_API` and `CLERK_OAUTH_CLIENT_ID` for `/login`. During local dev these come from the same `apps/server/.env`. For a globally-installed binary, see [`bun link`](#installing-the-cli-globally-bun-link) below.
- `FORGECODE_SERVER_URL` (optional) overrides the server the CLI talks to. It defaults to `http://localhost:3000/`.

---

## Running locally

Run both processes from the **repo root** (the dev scripts watch the whole tree, including shared packages):

```bash
# Hono server — http://localhost:3000 (watch mode)
bun run dev:server

# OpenTUI chat app (Ctrl+C to exit)
bun run dev:cli
```

> **Note:** Don't launch the TUI through `bun --filter` — `--filter` multiplexes child stdio and breaks TTY access, so the TUI appears to hang. The `dev:cli` script invokes the entry file directly for this reason.

Once the TUI is up, run `/login` to authenticate, then start chatting. Use `/model` to pick a model and `/plan` mode when you want the agent to research without making changes.

---

## Installing the CLI globally (`bun link`)

The `cli` workspace declares a `forgecode` binary (`bin.forgecode → src/index.tsx`). To run `forgecode` from any directory:

```bash
# From the CLI workspace, register the global link
cd apps/cli
bun link
```

`bun link` registers the package, and because it declares a `bin`, Bun installs a global `forgecode` executable on your `PATH`. You can now run `forgecode` from any project directory — it will operate on that directory as the agent's working directory.

A globally-linked binary runs **without** the `--env-file` flag from an arbitrary cwd, so it can't see `apps/server/.env`. On startup it instead reads **`~/.forgecode/.env`** (a stable home-directory location) and fills in any variables that aren't already set in the environment. Put the CLI-facing variables there:

```bash
# ~/.forgecode/.env
CLERK_FRONTEND_API=https://your-app.clerk.accounts.dev
CLERK_OAUTH_CLIENT_ID=your-oauth-client-id
# Point at a deployed server, or leave unset to use http://localhost:3000/
FORGECODE_SERVER_URL=https://your-server.example.com/
```

Explicit environment variables (e.g. `FORGECODE_SERVER_URL=… forgecode`) always win over the file. ForgeCode also persists per-user state under `~/.forgecode/` — `config.json` (selected theme) and the saved auth session.

To remove the global link later, run `bun unlink` from `apps/cli`.

---

## Building

Each app defines its own `build` script; the root `build` runs them across all workspaces:

```bash
# Build every workspace that defines a build script
bun run build

# Or build a single workspace by package name
bun --filter server build
```

The **server** bundles to `apps/server/dist` (`bun build src/index.ts --target bun --outdir dist`). The **CLI** compiles to a self-contained executable (`bun --filter cli build` → `apps/cli/dist/forgecode`, which embeds the Bun runtime) via `bun build … --compile`. For local dev, run it directly with Bun or via [`bun link`](#installing-the-cli-globally-bun-link); to ship it to other machines, the [`release` workflow](.github/workflows/release.yml) cross-builds one binary per platform on a `v*` tag and attaches them to a GitHub Release for the [`Install`](#install) one-liners to download.

Type-check a single workspace (the repo uses per-package checking, not `tsc -b` from the root):

```bash
cd apps/cli && bunx tsc --noEmit
```

---

## Deploying the server (Vercel)

The server runs locally as a Bun process (`export default { port, fetch }`), but Vercel doesn't run Bun for serverless functions — it invokes a **Node.js function**, and Node can't execute this repo's raw-TypeScript source, the `@forgecode/*` workspace packages (whose `main` points straight at `.ts`), or the generated Prisma client (which uses explicit `.ts` import extensions). So the server is **bundled with Bun at build time** into a single Node-compatible file:

- The build command runs `bun build src/server.ts … --outfile dist/server.mjs`, inlining the whole TypeScript graph into one `.mjs`. `pg` and `@prisma/*` are kept `--external` so they (and the Prisma runtime's assets) load from `node_modules` at runtime — Vercel's file tracer ships them alongside the function.
- [`apps/server/api/index.js`](apps/server/api/index.js) is a tiny committed entry that re-exports the bundle, so Vercel always detects a function. The handler is the Hono app ([`apps/server/src/app.ts`](apps/server/src/app.ts)) wrapped with `@hono/node-server/vercel`'s `handle()` — Vercel invokes functions with the Node `(req, res)` signature, so exporting `app.fetch` (a Web `Request → Response` handler) directly makes every request hang with no error; `handle()` bridges the IncomingMessage/ServerResponse to Hono and streams the chat response back.
- [`apps/server/vercel.json`](apps/server/vercel.json) rewrites every request to it.

Local dev is unaffected — `bun run dev:server` still uses the Bun entry ([`apps/server/src/index.ts`](apps/server/src/index.ts)); `dist/` is git-ignored and only produced on Vercel.

To deploy on Vercel as a monorepo project:

1. **Root Directory** → `apps/server`. **Framework Preset** → **Other**. Leave the Install Command at its default so Vercel installs from the monorepo root (the `workspace:*` deps and `bun.lock` resolve there).
2. **Environment Variables** → add every variable from [Configuration](#configuration) (`DATABASE_URL`, **every** provider API key, the `CLERK_*` vars, and any `POLAR_*` vars). Several are validated at module load — the model registry throws on a missing provider key and `db.ts` throws without `DATABASE_URL` — and either surfaces on Vercel as `FUNCTION_INVOCATION_FAILED` before any request is handled.
3. **Deploy.** The build command also runs `prisma generate` first, so the generated client exists before bundling (it's never committed).

`vercel.json` sets `"framework": null` so Vercel doesn't apply its auto-detected **Hono** preset (which demands a static `public/` output directory this API-only server never produces — the `No Output Directory named "public"` error). An empty [`apps/server/public/`](apps/server/public) directory plus `"outputDirectory": "public"` satisfies Vercel's output check; nothing is served from it because the rewrite routes every request to the function.

The Node.js runtime (Vercel's default) is required — the routes use Prisma + `pg`, which can't run on the Edge runtime.

Then point the CLI at the deployed URL. **`FORGECODE_SERVER_URL` must include the scheme** (`https://`) — a bare host like `forgecode-server.vercel.app` makes the CLI fail with `fetch() URL is invalid`:

```bash
FORGECODE_SERVER_URL=https://your-server.vercel.app
```

Use the project's stable production domain, not a hashed preview URL — preview deployments are behind Vercel Authentication by default and will reject the CLI's requests.

---

## Workspaces

The repo is a Bun workspace monorepo (`workspaces: ["apps/*", "packages/*"]`). Runnable apps live under `apps/`; shared libraries under `packages/`. New workspaces auto-register — no root edits required.

### Apps

#### `server` — Hono API on Bun's native HTTP server

The backend. Builds a `Hono` app and exports `{ port, fetch }` as its default export — Bun recognises this shape and starts the server automatically (no `Bun.serve` call). Responsibilities:

- **Sessions & messages** — CRUD for chat sessions and their message history, backed by Prisma/Postgres.
- **The agent turn** — runs the streaming coding-agent loop (`@forgecode/ai`) and persists every message, tool call, and error.
- **Auth** — Clerk middleware verifies the CLI's OAuth access token on every request and scopes all data to the authenticated user.
- **Billing** — a credit gate (fail-open) blocks messaging when out of credits; each message meters one credit to Polar via `@forgecode/payments`.

Exports its route type (`AppType`) so the CLI's Hono RPC client stays type-checked end-to-end.

#### `cli` — OpenTUI terminal client

The frontend. Renders a React tree into the terminal via OpenTUI's React reconciler. Provides the chat UI, slash-command palette, `@`-mention file completion, model/theme/session/balance dialogs, and the browser-based OAuth login flow. It executes the agent's file and shell tools locally and talks to the server only through the type-safe RPC client. Ships the `forgecode` binary.

### Packages

#### `@forgecode/ai` — the coding agent

The model-facing core, shared by server (to run turns) and CLI (for message/mode/model types). Contains:

- **`agent`** — a `ToolLoopAgent` that streams tool-calling turns, with per-mode tool gating and automatic tool-call repair.
- **`registry`** — the catalog of selectable models across OpenAI, Anthropic, and Google, plus per-model reasoning/thinking options.
- **`provider`** — resolves a model id to an AI SDK language model and layers in account-level service tiers.
- **`modes`** — the `Build` / `Plan` mode definitions and their tool sets.
- **`tools`** — schemas and handlers for `readFile`, `writeFile`, `editFile`, `listDirectory`, `glob`, `grep`, `runShell`.
- **`messages`**, **`parts`**, **`title`** — UI-message schemas, tool-row extraction for persistence, and session-title generation.

#### `@forgecode/payments` — Polar billing

A thin, validated wrapper over the Polar SDK. Creates checkouts (`/upgrade`), ingests one metering event per message, and reads the credit balance used by both the server's credit gate and the CLI's `/balance` dialog. All inputs/outputs are zod-validated.

#### `@forgecode/shared` — shared constants & schemas

Cross-cutting values shared by both apps (e.g. the app name) and the home for any zod schemas that both the CLI and server must agree on.

---

## HTTP API

All routes require a valid Clerk OAuth bearer token and are scoped to the authenticated user.

| Method & path | Purpose |
|---|---|
| `GET /sessions` | List the user's sessions (id, title, updatedAt) |
| `POST /sessions` | Create a new session, returns `{ id }` |
| `GET /sessions/:id/messages` | Fetch the full message history for a session |
| `POST /sessions/:id/messages` | Append a user message and stream the assistant reply (credit-gated) |
| `POST /payments/checkout` | Create a Polar checkout to buy credits, returns `{ id, url, clientSecret }` |
| `GET /payments/balance` | Get the credit balance, returns `{ balance, consumedUnits, creditedUnits }` |

The CLI always reaches these through the Hono RPC client (`apps/cli/src/lib/client.ts`) rather than hand-written `fetch` calls, so routes, params, and response shapes stay type-checked against the server.

---

## Database

Persistence is **Prisma 7** with the `@prisma/adapter-pg` driver adapter against Postgres. The schema (`apps/server/prisma/schema.prisma`) models `Session`, `Message`, `ToolCall`, and `SessionError`, all cascade-scoped to a session and indexed by user.

Database scripts, all runnable from the repo root:

| Script | What it does |
|---|---|
| `bun run db:generate` | Regenerate the Prisma client (run after schema edits; also runs automatically on `bun install` via the server's `postinstall`) |
| `bun run db:push` | Sync `schema.prisma` to the live database (development workflow — no migration files) |
| `bun run db:studio` | Open Prisma Studio to browse tables |

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime & package manager | [Bun](https://bun.sh) |
| HTTP server | [Hono](https://hono.dev) |
| Terminal UI | [OpenTUI](https://github.com/anomalyco/opentui) (React reconciler) |
| AI / agent loop | [AI SDK](https://ai-sdk.dev) with OpenAI, Anthropic, and Google providers |
| Database | Postgres via [Prisma](https://prisma.io) (driver-adapter setup) |
| Auth | [Clerk](https://clerk.com) OAuth (Authorization Code + PKCE) |
| Billing | [Polar](https://polar.sh) usage-based metering |
| Validation | [Zod](https://zod.dev) |
| Language | TypeScript |
```
