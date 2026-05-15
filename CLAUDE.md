# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime

Bun is both the package manager and the runtime — there is no separate Node.js step, no bundler in dev, no transpile step. `bun run <file.ts(x)>` executes TypeScript directly.

## Commands

Run from the repo root unless noted.

| Command | What it does |
|---|---|
| `bun install` | Install all workspace dependencies |
| `bun run dev:server` | Start the Hono server on http://localhost:3000 (watch mode) |
| `bun run dev:cli` | Launch the OpenTUI welcome screen (Ctrl+C to exit) |
| `bun --filter <name> <script>` | Run a script in a specific workspace by **package name** (not path) |
| `cd apps/<name> && bunx tsc --noEmit` | Type-check a single workspace |

## Architecture

Bun-workspace monorepo. Two runnable apps live under `apps/`; shared libraries (when added) go under `packages/`. The root `package.json` has `"workspaces": ["apps/*", "packages/*"]` — new workspaces auto-register, no edits required.

### `apps/server` — Hono on Bun's built-in HTTP server

`src/index.ts` builds a `Hono` app and exports `{ port, fetch }` as the default export. Bun's runtime recognises this shape and starts the server automatically — there is no `Bun.serve(...)` call and no `@hono/node-server` adapter. To add routes, chain them on the `app` instance; for type-safe clients later, keep the chained form so `typeof app` carries route types.

### `apps/cli` — OpenTUI React reconciler

`src/index.tsx` calls `createCliRenderer()` from `@opentui/core` and renders a React tree via `createRoot()` from `@opentui/react`. JSX is configured per-package (`jsx: react-jsx`, `jsxImportSource: @opentui/react`) — that's why `cli/tsconfig.json` has overrides while `server/tsconfig.json` does not.

**Always invoke the `opentui` skill before writing or modifying anything in `apps/cli`.** It carries the canonical reference for components (`<box>`, `<text>`, `<input>`, `<textarea>`, `<select>`, etc.), hooks (`useKeyboard`, `useRenderer`), keybinding APIs, focus rules, and known gotchas. Don't guess prop names or behavior — load the skill, check the relevant `references/` file, then code.

OpenTUI takes over the terminal (alternate screen + raw input). Two consequences worth remembering:

- **Don't run the TUI via `bun --filter`.** `--filter` pipes child stdio so it can multiplex output across workspaces; that breaks TTY access and the TUI appears to hang. `dev:cli` therefore uses `cd apps/cli && bun run dev` instead. Filter-style scripts are fine for the server (no TTY needed).
- **Never call `process.exit()` directly** inside the CLI — it skips terminal restoration and leaves the user's shell in a broken state (alt screen still active, raw mode still on). Use `renderer.destroy()`; `exitOnCtrlC: true` handles the common case.

### Client → server calls

When the CLI needs to hit a server route, **always go through the Hono RPC client** (`apps/cli/src/lib/client.ts`) — never hand-write `fetch("http://localhost:3000/...")` or hardcode URLs at call sites. The RPC client is constructed with `hc<AppType>(baseUrl)` against the server's exported `AppType`, so routes, methods, params, and response shapes stay type-checked end-to-end as the server changes.

Use `client.<route>.$url()` to derive the URL (e.g. when handing it to a third-party hook like `useCompletion`) and `client.<route>.$post(...)` / `$get(...)` for the actual call. If a new route is added on the server, keep the chained `Hono()` form in `apps/server/src/index.ts` so `typeof routes` continues to carry the new route into `AppType`.

```ts
// apps/cli/src/screens/chat.tsx
import { client } from "../lib/client";

useCompletion({
  api: client.generate.$url().toString(),
  streamProtocol: "text",
});
```

### Validation

Use **zod schemas** for all runtime validation across both `apps/cli` and `apps/server` — never `as` casts or hand-rolled type guards for data crossing a boundary (router state, HTTP requests/responses, env vars, file I/O, IPC). Define the schema once, derive the TypeScript type with `z.infer`, and `parse`/`safeParse` at the boundary.

Shared schemas live in `packages/shared/src/schemas/` and are re-exported from `@lightcode/shared` so the CLI and server agree on shape. App-local schemas (only one side consumes them) may live next to their consumer, but still go through zod.

```ts
// packages/shared/src/schemas/chat.ts
import { z } from "zod";
export const chatLocationStateSchema = z.object({ input: z.string() });
export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;
```

```ts
// apps/cli/src/screens/chat.tsx
const parsed = chatLocationStateSchema.safeParse(location.state);
const input = parsed.success ? parsed.data.input : "";
```

### TypeScript configuration

Three-layer setup:

- `tsconfig.base.json` — shared compiler options (strict, `module: Preserve`, `moduleResolution: bundler`, `noEmit: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`). Has no `include`/`files`; it's a pure base.
- `apps/*/tsconfig.json` — each extends `../../tsconfig.base.json`. Only `apps/cli` overrides compiler options (the JSX pair).
- Root `tsconfig.json` — solution-style: `files: []` plus `references` pointing at each app. Editors use this to discover the project graph; **`tsc -b` from the root will not work** unless each referenced project also opts in to `composite: true`, which would conflict with `noEmit: true`. Type-check per package instead.
