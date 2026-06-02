# Plan: Model-selection state + `/model` dialog in the CLI

## Context

[wire-model-id.md](./wire-model-id.md) is **done**: a `model` id now flows CLI → server → agent and
resolves per-request. But the CLI hardcodes `DEFAULT_MODEL_ID`
([chat.tsx](../src/screens/chat.tsx#L107)) — there is no way for the user to *choose* a model. The
registry already holds everything a picker needs
([registry.ts](../../../packages/ai/src/registry.ts): `MODELS` with `label`/`provider`,
`modelIdSchema`, `DEFAULT_MODEL_ID`, `getModel`).

This change adds the missing selection layer, mirroring the two patterns already in the codebase:

- **State** like coding mode — a React context provider holding the current value plus a ref-getter,
  decided **in-memory only** (resets to `DEFAULT_MODEL_ID` each launch, exactly like
  [mode-context.tsx](../src/lib/mode-context.tsx)). No config/persistence.
- **UI** like the theme picker — a `/model` command opens a `SelectDialog`-based dialog
  (mirrors [themes-dialog.tsx](../src/components/themes-dialog.tsx) /
  [sessions-dialog.tsx](../src/components/sessions-dialog.tsx)).

Outcome: `/model` lists every registry model; selecting one updates the status-bar label and makes the
next message use that model id — with no server changes (the wire is already there).

## Changes

### 1. Model context — new `apps/cli/src/lib/model-context.tsx`

Near-copy of [mode-context.tsx](../src/lib/mode-context.tsx), holding a registry model id (`string`).
Naming avoids the registry's own `getModel(id)` helper:

```tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { DEFAULT_MODEL_ID } from "@lightcode/ai/registry";

interface ModelContextValue {
  modelId: string;
  setModelId: (id: string) => void;
  /** Latest value without re-subscribing — fed to the chat transport (like getMode). */
  getModelId: () => string;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [modelId, setModelIdState] = useState<string>(DEFAULT_MODEL_ID);
  const ref = useRef(modelId);
  ref.current = modelId;
  const setModelId = useCallback((id: string) => setModelIdState(id), []);
  const getModelId = useCallback(() => ref.current, []);
  return (
    <ModelContext.Provider value={{ modelId, setModelId, getModelId }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModelContext() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModelContext must be used within ModelProvider");
  return ctx;
}
```

### 2. Mount the provider — [app.tsx](../src/app.tsx)

Add `<ModelProvider>` to the tree alongside `ModeProvider` (nest it just inside `ModeProvider`).

### 3. Transport takes a getter, not a fixed value — [client.ts](../../../packages/ai/src/client.ts) + [chat.tsx](../src/screens/chat.tsx)

The transport currently takes a plain `model: string`. To mirror `getMode` (so a mid-session model
change is picked up without rebuilding the transport):

- **client.ts** — in `CreateChatTransportParams`, replace `model: string` with
  `getModel: () => string`, and in `prepareSendMessagesRequest` send `model: getModel()` next to
  `mode: getMode()`.
- **chat.tsx** — pull `getModelId` from `useModelContext()` and pass `getModel: getModelId` into
  `createChatTransport`; add `getModelId` to the `useMemo` deps. Drop the now-unused
  `DEFAULT_MODEL_ID` import.

### 4. Models dialog — new `apps/cli/src/components/models-dialog.tsx`

Mirror [themes-dialog.tsx](../src/components/themes-dialog.tsx) but simpler — a model has no live
preview, so commit only on select (no `onHighlight`). Build options from `MODELS`, showing the provider
as the hint and marking the current one "active":

```tsx
import { MODELS, getModel } from "@lightcode/ai/registry";
import { useModelContext } from "../lib/model-context";
import { useDialog } from "./dialog-context";
import { SelectDialog, type SelectDialogOption } from "./select-dialog";

export function ModelsDialog() {
  const { close } = useDialog();
  const { modelId, setModelId } = useModelContext();
  const options: SelectDialogOption[] = MODELS.map((m) => ({
    value: m.id,
    label: m.label,
    hint: m.id === modelId ? "active" : m.provider,
  }));
  return (
    <SelectDialog
      title="Models"
      options={options}
      placeholder="Search models"
      initialSelectedValue={modelId}
      onSelect={(option) => {
        setModelId(option.value);
        close();
      }}
      onClose={close}
    />
  );
}
```

### 5. `/model` command — [commands.ts](../src/lib/commands.ts) + [root-layout.tsx](../src/layouts/root-layout.tsx)

- **commands.ts** — add `openModels: () => void` to `CommandContext`, and a command entry
  (place it next to `theme`):
  ```ts
  { name: "model", description: "Switch model", run: ({ openModels }) => openModels() },
  ```
- **root-layout.tsx** — in `handleCommand`, wire `openModels: () => openDialog(<ModelsDialog />)`
  (mirrors the existing `openThemes` line) and import `ModelsDialog`.

### 6. Status bar reflects the selection — [chat-textarea.tsx](../src/components/chat-textarea.tsx#L267-L274)

Replace the hardcoded `DEFAULT_MODEL` footer with the live selection. Swap the
`import { DEFAULT_MODEL } from "@lightcode/ai/registry"` for `getModel`, read `modelId` from
`useModelContext()`, and render `const model = getModel(modelId);` in place of `DEFAULT_MODEL`:

```tsx
const { modelId } = useModelContext();
const model = getModel(modelId);
// ...
<text fg={theme.text}>{model.label}</text>
<text fg={theme.textSubtle}> {model.provider}</text>
```

## Notes / non-goals

- **No server changes.** `postMessageRequestSchema.model` and the agent's per-request resolution are
  already in place from wire-model-id.
- **No persistence** (per the in-memory decision) — selection resets to `DEFAULT_MODEL_ID` each launch,
  exactly like coding mode. If persistence is wanted later, follow the theme pattern
  ([config.ts](../src/lib/config.ts) `loadThemeName`/`saveThemeName` + `loadModelId`/`saveModelId`) and
  init `useState(() => loadModelId())`.
- Per-message model is already persisted server-side; this plan does not add per-message model display
  in the transcript (mode has `messageModeMap`; model is out of scope here).

## Verification

- Type-check the touched workspaces (expect exit 0):
  `cd packages/ai && bunx tsc --noEmit`, `cd apps/cli && bunx tsc --noEmit`.
- `bun run dev:server`, then `bun run dev:cli`. Confirm:
  - The status bar shows **GPT-5.1 Codex Max** (default) on launch.
  - Typing `/model` shows the command; running it opens the **Models** dialog listing all three models
    with the current one marked "active"; arrow keys + Enter (and mouse click) select.
  - Pick **Claude Sonnet 4.6**; the status-bar label updates immediately.
  - Send a message and confirm the persisted assistant row records `model = "claude-sonnet-4-6"`
    (proving the selected id flows through), and a response streams from that provider.
  - Restart the CLI and confirm the model is back to the default (in-memory only).
