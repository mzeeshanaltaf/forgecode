# Lightcode

A monorepo built with Bun workspaces, featuring a lightweight Hono API server and an OpenTUI terminal interface.

## Structure

```
lightcode/
├── apps/
│   ├── server/   # Hono HTTP server (Bun native)
│   └── cli/      # OpenTUI chat interface (React reconciler)
├── packages/
│   └── shared/   # Shared constants and types (@lightcode/shared)
├── tsconfig.base.json
└── package.json
```

## Requirements

- [Bun](https://bun.sh) v1.0+

## Getting started

```bash
bun install
```

## Running

```bash
# Hono server — http://localhost:3000
bun run dev:server

# OpenTUI chat app (Ctrl+C to exit)
bun run dev:cli
```

## Stack

| Layer | Technology |
|---|---|
| Runtime & package manager | [Bun](https://bun.sh) |
| HTTP server | [Hono](https://hono.dev) |
| Terminal UI | [OpenTUI](https://github.com/anomalyco/opentui) (React reconciler) |
| Language | TypeScript |
