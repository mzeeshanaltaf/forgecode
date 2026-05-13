# Plan: Add react-router to apps/cli

## Context

[apps/cli/src/index.tsx](../src/index.tsx) is currently a single-screen OpenTUI app that mounts [AsciiLogo](../src/components/ascii-logo.tsx) + [PromptTextarea](../src/components/prompt-textarea.tsx) directly. As more screens land (history, settings, model picker, etc.) we need an in-app navigation layer. We'll adopt `react-router` with `createMemoryRouter` (no DOM — perfect fit for a TUI) and establish a small folder convention now so future screens follow one pattern instead of accreting ad-hoc state machines.

Goals: minimal moving parts, conventional layout, no premature abstraction.

OpenTUI-specific constraints (validated against the `opentui` skill — `references/react/gotchas.md`, `references/react/patterns.md`):

- **Quit via `renderer.destroy()`, never `process.exit()`** — leaves the terminal in a broken state otherwise.
- **Keep one global `useKeyboard` handler.** Multiple handlers can fire in conflict; centralise navigation keys in the layout, let screens add only screen-local bindings.
- **Inputs require an explicit `focused` prop.** The existing textarea already passes `focused`; nothing to change, but worth knowing as more screens add inputs.

## Dependency

Add to [apps/cli/package.json](../package.json):

- `react-router` (v7+, unified package — **not** `react-router-dom`; we are not in a DOM)

Install with `bun install` from repo root.

## Target structure

```
apps/cli/src/
├── index.tsx                ← renderer bootstrap only (3 lines + mount)
├── app.tsx                  ← <RouterProvider router={router} />
├── router.tsx               ← createMemoryRouter route table
├── layouts/
│   └── root-layout.tsx      ← header, <Outlet/>, footer nav, global keys
├── screens/
│   ├── home.tsx             ← existing AsciiLogo + PromptTextarea
│   ├── about.tsx
│   ├── settings.tsx
│   └── not-found.tsx
└── components/              ← unchanged; reusable, screen-agnostic widgets
    ├── ascii-logo.tsx
    └── prompt-textarea.tsx
```

Convention recap: **`screens/`** = one file per route, owns its layout-within-the-Outlet. **`layouts/`** = chrome wrapping `<Outlet/>`. **`components/`** = reusable, route-agnostic primitives.

## File-by-file changes

### 1. [src/index.tsx](../src/index.tsx) — slim down to bootstrap

Strip the inline `App` component; just wire the renderer to `<App />` from `app.tsx`.

```tsx
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app";

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
```

### 2. `src/app.tsx` — new

```tsx
import { RouterProvider } from "react-router";
import { router } from "./router";

export function App() {
  return <RouterProvider router={router} />;
}
```

### 3. `src/router.tsx` — new

Single source of truth for routes. Keeping it as a flat table (rather than file-system routing) is the lightweight choice and matches the openTUI example.

```tsx
import { createMemoryRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { About } from "./screens/about";
import { Settings } from "./screens/settings";
import { NotFound } from "./screens/not-found";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
```

### 4. `src/layouts/root-layout.tsx` — new

Owns the chrome (header showing current path, footer with shortcut hints) and global keyboard navigation (`1`/`2`/`3` to navigate, `q` to quit). Pattern lifted directly from the openTUI react-router example.

Key points (per opentui skill guidance):

- Uses `useNavigate` + `useLocation` from `react-router`.
- Uses `useKeyboard` + `useRenderer` from `@opentui/react`.
- Calls `renderer.destroy()` on `q` — **never** `process.exit()`.
- Renders `<Outlet />` inside a `flexGrow={1}` content box so screens fill remaining space.
- Highlights the active footer item with `BOLD | UNDERLINE`.
- This is the **only** global `useKeyboard` in the app; screen-local bindings live inside their respective screens.

### 5. `src/screens/home.tsx` — new (wraps existing components)

```tsx
import { AsciiLogo } from "../components/ascii-logo";
import { PromptTextarea } from "../components/prompt-textarea";

export function Home() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <AsciiLogo />
      <PromptTextarea />
    </box>
  );
}
```

This preserves the current entry-screen UX exactly — the only change a user sees on `/` is the header/footer chrome added by `RootLayout`.

### 6. `src/screens/about.tsx`, `settings.tsx`, `not-found.tsx` — new

Minimal placeholder content matching the openTUI example (cyan bold title + a line or two of body). These exist to demonstrate the routing wiring; flesh them out as features land.

## Reused / unchanged

- [src/components/ascii-logo.tsx](../src/components/ascii-logo.tsx) — reused as-is by `Home`.
- [src/components/prompt-textarea.tsx](../src/components/prompt-textarea.tsx) — reused as-is by `Home`. Note the textarea's footer hint (`↵ submit · Ctrl+C exit`) still applies; the new global `q` quit lives in the layout footer.
- [tsconfig.json](../tsconfig.json) — no changes (the existing `jsx: react-jsx` + `jsxImportSource: @opentui/react` cover the new files).

## Conventions for future screens

1. **One screen = one file** in `screens/`, default-named after the route (`history.tsx` → `/history`).
2. Add the route to the children array in `router.tsx` — keep it flat unless a real nested-layout need appears.
3. Keep screens **layout-aware but chrome-free**: assume `RootLayout` owns the header/footer; render content inside `flexGrow={1}`.
4. Reusable widgets stay in `components/`; never import from `screens/` into `components/`.
5. **Global key bindings live in `RootLayout`.** Screen-local bindings use `useKeyboard` inside the screen itself (it only fires while that route is mounted — but be aware multi-handler conflicts can occur if both fire on the same key).

## Verification

1. `bun install` from repo root — confirm `react-router` resolves.
2. `cd apps/cli && bunx tsc --noEmit` — must pass with no errors.
3. `bun run dev:cli` from repo root — TUI launches on the Home screen showing the existing logo + textarea, plus the new header (`Current: /`) and footer (`[1] Home  [2] About  [3] Settings  [q] Quit`), with `[1] Home` highlighted.
4. Press `2` → About screen renders, header updates to `Current: /about`, footer highlight moves to `[2] About`.
5. Press `3` → Settings screen renders the same way.
6. Press `1` → returns to Home; the prompt textarea is still focused and accepts input.
7. Press `q` → terminal restores cleanly (no leftover alt-screen / raw-mode breakage).
