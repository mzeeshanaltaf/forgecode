# Plan: Flat model registry for `@lightcode/ai`

## Context

The coding agent originally hardwired a single model: a `model.ts` exported
`CODING_AGENT_MODEL_ID` / `CODING_AGENT_PROVIDER`, and the agent called `openai(MODEL_ID)` directly in
two places (the `ToolLoopAgent` and the tool-call repair path). There was no notion of "available
models"; the provider was baked into the agent.

This introduces a **simple flat registry** of available models inside `@lightcode/ai`, covering
multiple providers, so a later change can let the user pick a model. **Model selection is not wired up
here** — everything resolves to the default model; this plan only builds the registry and routes the
existing single-model behavior through it. (Threading the id through requests is covered separately in
[wire-model-id.md](./wire-model-id.md).)

Decisions:
- **Multiple providers** seeded now (OpenAI, Anthropic, Google) — adds the `@ai-sdk/anthropic` and
  `@ai-sdk/google` provider SDKs.
- **Lean entries**: each model has `id`, `provider`, `label`, plus optional per-model `providerOptions`.
- **Replace** the old `model.ts` exports; update the two external consumers to read the registry.

## Changes

### 1. New [registry.ts](../../../packages/ai/src/registry.ts) — pure data + schemas (no SDK imports)

Kept free of `@ai-sdk/*` imports so the CLI can import the model list/default for display (and the
shared request schema can import `modelIdSchema`) without pulling provider SDKs in. Uses zod.

- `PROVIDER_NAMES = ["openai", "anthropic", "google"]`; `providerSchema`; `ProviderName`.
- `modelSchema = { id, provider, label, providerOptions? }`; `ModelDefinition = z.infer<…>`.
  - `providerOptions` is per-model (not per-provider) because reasoning support and tuning differ by
    model, not just by provider — a non-reasoning model simply omits the field. Leaf values use
    `z.any()` so the inferred type stays assignable to the SDK's `ProviderOptions`.
- `MODELS` — a flat `as const satisfies readonly ModelDefinition[]` array. Current seeds:
  - `gpt-5.1-codex-max` (openai) → `{ openai: { reasoningSummary: "auto" } }`
  - `claude-sonnet-4-6` (anthropic) → `{ anthropic: { thinking: { type: "adaptive" } } }`
  - `gemini-3.5-flash` (google) → `{ google: { thinkingConfig: { includeThoughts: true } } }`
- `DEFAULT_MODEL_ID = "gpt-5.1-codex-max"`; `MODEL_IDS` + `modelIdSchema` (z.enum) for validation.
- Helpers: an id→definition `Map`; `getModel(id)` (throws on unknown id); `DEFAULT_MODEL`.

### 2. New [provider.ts](../../../packages/ai/src/provider.ts) — resolver + per-model/runtime options

Isolates the provider SDK imports (server-side only) from the pure registry.

- Import `openai`, `anthropic`, `google` factories; `providerFactories = { openai, anthropic, google }`.
- `resolveLanguageModel(modelId)` → `getModel(modelId)` then `providerFactories[provider](id)`.
- `providerOptionsFor(modelId)` → the model's static `providerOptions` from the registry, with the
  env-driven `serviceTier` layered on for providers that support it (OpenAI and Google; Anthropic has
  none). `serviceTier` lives here, not per model, because it's an account/runtime setting; the two
  providers' accepted values differ, so each has its own env enum (`OPENAI_SERVICE_TIER`,
  `GOOGLE_SERVICE_TIER`).

### 3. Delete `packages/ai/src/model.ts`

Its constants are replaced by `DEFAULT_MODEL_ID` / `DEFAULT_MODEL` from the registry.

### 4. Update [agent.ts](../../../packages/ai/src/agent.ts)

- Drop the `openai` / `model.ts` imports; import `DEFAULT_MODEL_ID` from `./registry` and
  `resolveLanguageModel` / `providerOptionsFor` from `./provider`.
- Both model call sites (the `ToolLoopAgent` and the repair `generateText`) →
  `resolveLanguageModel(DEFAULT_MODEL_ID)`, with `providerOptions: providerOptionsFor(DEFAULT_MODEL_ID)`
  on each, so options are derived from the model's provider rather than hardwired to OpenAI.

### 5. Update [index.ts](../../../packages/ai/src/index.ts) and [package.json](../../../packages/ai/package.json)

- `index.ts`: `export * from "./registry";`.
- `package.json`: in `exports`, remove `"./model"`, add `"./registry"` and `"./provider"`; add deps
  `@ai-sdk/anthropic` and `@ai-sdk/google` (compatible with `ai@^6`), then `bun install`.

### 6. Update the two external consumers

- Server [sessions.ts](../../../apps/server/src/routes/sessions.ts): persist `DEFAULT_MODEL_ID` from
  `@lightcode/ai/registry`. (Later superseded by the per-request `model` in
  [wire-model-id.md](./wire-model-id.md).)
- CLI [chat-textarea.tsx](../src/components/chat-textarea.tsx): display `DEFAULT_MODEL.label` and
  `DEFAULT_MODEL.provider` from `@lightcode/ai/registry`.

## Verification

- Type-check each touched workspace: `cd packages/ai && bunx tsc --noEmit`,
  `cd apps/server && bunx tsc --noEmit`, `cd apps/cli && bunx tsc --noEmit` — expect exit 0, with no
  lingering references to `CODING_AGENT_MODEL_ID` / `model.ts`.
- Run `bun run dev:server`, then `bun run dev:cli`; send a chat message and confirm the agent responds
  (default model resolved through the registry).
- Confirm the CLI input status bar shows the default model's label + provider.
