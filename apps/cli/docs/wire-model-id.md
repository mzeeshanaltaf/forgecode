# Plan: Wire the model id through the CLI → server → agent request path

## Context

The model registry now lives in `@lightcode/ai` ([registry.ts](../../../packages/ai/src/registry.ts)) with
`MODELS`, `modelIdSchema`, and `DEFAULT_MODEL_ID`, and per-model provider options resolved by
[provider.ts](../../../packages/ai/src/provider.ts). But nothing carries a model id through a request: the
server's `codingAgent` is constructed once with `DEFAULT_MODEL_ID` and ignores any per-request model,
and the CLI never sends one. The persisted `model` column is also hardcoded to `DEFAULT_MODEL_ID`.

This change threads a `model` id through the same path the `mode` field already travels — CLI request
body → shared request schema → server route → `runCodingTurn` → the agent's `prepareCall` — so the
model is resolved **per request**. There is intentionally **no model-selection UI or state**: the CLI
always sends `DEFAULT_MODEL_ID`, so behavior is unchanged, but the plumbing is in place for a future
picker (which would then just change the value the CLI sends). The clean per-call mechanism is
confirmed by the AI SDK: `prepareCall` may return `model` and `providerOptions`
([ai/docs/03-agents/05-configuring-call-options.mdx](../../../node_modules/ai/docs/03-agents/05-configuring-call-options.mdx)).

## Changes

### 1. Shared request schema — [messages.ts](../../../packages/ai/src/messages.ts)

Add a `model` field to `postMessageRequestSchema`, validated against the registry and defaulting to
the default model (mirrors how `mode` uses `modeSchema.default(DEFAULT_MODE)`):

```ts
import { modelIdSchema, DEFAULT_MODEL_ID } from "./registry";
// ...
model: modelIdSchema.default(DEFAULT_MODEL_ID),
```

`registry.ts` has no SDK imports, so this stays safe to import from the CLI.

### 2. Agent resolves the model per request — [agent.ts](../../../packages/ai/src/agent.ts)

- Add `model: modelIdSchema.default(DEFAULT_MODEL_ID)` to `callOptionsSchema` (import `modelIdSchema`
  from `./registry`).
- In `prepareCall`, derive the model and its options from `options.model`, adding to the returned
  settings alongside the existing `instructions`/`activeTools` overrides:
  ```ts
  model: resolveLanguageModel(options.model),
  providerOptions: providerOptionsFor(options.model),
  ```
  The construction-time `model`/`providerOptions` (already `DEFAULT_MODEL_ID`) remain as the defaults.
- `runCodingTurn`: add `model?: string` to `RunCodingTurnParams`, default `DEFAULT_MODEL_ID`,
  and pass it into `codingAgent.stream({ options: { cwd, mode, model } })`.
- Leave `experimental_repairToolCall` on `DEFAULT_MODEL_ID`: that callback has no access to call
  options, and the fallback path is harmless while only the default model exists. (Noted, not a blocker.)

### 3. CLI sends the model — [client.ts](../../../packages/ai/src/client.ts) + [chat.tsx](../src/screens/chat.tsx)

- `createChatTransport`: add `model: string` to `CreateChatTransportParams` and include it in the
  `prepareSendMessagesRequest` body next to `cwd`/`mode`. (A plain value, not a getter like `getMode`,
  since there is no model state to track yet.)
- `chat.tsx`: import `DEFAULT_MODEL_ID` from `@lightcode/ai/registry` and pass `model: DEFAULT_MODEL_ID`
  into the `createChatTransport({ ... })` call. The status-bar display in
  [chat-textarea.tsx](../src/components/chat-textarea.tsx) already shows `DEFAULT_MODEL` and
  needs no change.

### 4. Server consumes the model — [sessions.ts](../../../apps/server/src/routes/sessions.ts)

In the `POST /:id/messages` handler (mirror the existing `const mode = parsed.data.mode;`):

- `const model = parsed.data.model;`
- Pass `model` to `runCodingTurn({ history, cwd, mode, model, ... })`.
- In the assistant-message `prisma.message.create`, set `model` to the request's `model` instead of
  the hardcoded `DEFAULT_MODEL_ID`, so the stored row reflects the model actually used.

## Verification

- Type-check each touched workspace: `cd packages/ai && bunx tsc --noEmit`,
  `cd apps/server && bunx tsc --noEmit`, `cd apps/cli && bunx tsc --noEmit` — expect exit 0.
- Run `bun run dev:server`, then `bun run dev:cli`; send a chat message and confirm a response streams
  (the default model is now resolved per-request via `prepareCall`, not at construction).
- Confirm the persisted assistant message row records `model = "gpt-5.1-codex-max"` (the default).
- End-to-end thread check (optional, revert after): temporarily change the value the CLI sends in
  `chat.tsx` to another registry id (e.g. `"claude-sonnet-4-6"`) and confirm the server resolves that
  provider — proving the id flows through rather than being ignored.
