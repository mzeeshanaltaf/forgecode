# forgecode CLI

A terminal UI for ForgeCode, built with [OpenTUI](https://git.new/create-tui) on the Bun runtime.

## Install

The binary is fully self-contained — **no Bun or Node.js required** on the target machine.

**macOS / Linux:**

```sh
curl -fsSL https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.sh | sh
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.ps1 | iex
```

The installer downloads the latest release binary, puts `forgecode` on your `PATH`, and seeds the public runtime config at `~/.forgecode/.env`. Then:

```sh
forgecode      # launch the TUI
```

Run `/login` inside the app to sign in.

> **Note:** distributed builds omit the Clerk OAuth client secret, so `/login` and normal usage work fully, but `/whoami` token introspection is unavailable.

## Development

```bash
bun install
bun dev        # run from this package, or `bun run dev:cli` from the repo root
```

## Build a binary locally

```bash
bun run build  # compiles a self-contained binary to dist/forgecode
```

Releases are produced for all platforms by the `release` GitHub Actions workflow (`.github/workflows/release.yml`) when a `v*` tag is pushed.
