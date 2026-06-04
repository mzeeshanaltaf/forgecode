# Plan: `@forgecode/payments` — Polar usage-based billing package

## Context

We want to monetize ForgeCode with **usage-based billing on Polar**. The model is simple:

- A user buys a **one-time product for $19.99** and is granted **1000 credit units**.
- Granting credits is handled by Polar itself: the product is configured with a **"meter credit" benefit** tied to a meter, so paying for the product automatically credits the customer's meter balance — our code does **not** grant credits manually.
- As the user consumes the product, we **ingest usage events** against that customer; Polar decrements their meter balance (`balance = creditedUnits − consumedUnits`).
- We need to **read the remaining balance** to gate/display usage.

The Polar IDs are already plumbed into [apps/server/.env.example](../../server/.env.example): `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_SERVER` (`sandbox`), `POLAR_CREDITS_METER_ID`.

**Scope:** the package only — a small, self-contained service with three concerns: **checkout**, **ingestion**, **usage**. It is **not** wired into [apps/server](../../server/) or [apps/cli](../). No webhook handling (Polar grants credits automatically on payment).

## Decisions

- **Package name:** `@forgecode/payments`
- **Config style:** factory + config object — `createPaymentsClient(config)`. The package is pure: it never reads `process.env`. The caller passes config; the package validates it with zod and constructs the Polar client.
- **Webhooks:** out of scope.
- **Deduction model:** **flat 1 credit per message.** 1000 credits = 1000 messages.

## Billing semantics

- **1 message = 1 credit.** Deduction is computed by the **meter** (`POLAR_CREDITS_METER_ID`, configured in the Polar dashboard), not by our code. The actual meter config is **`aggregation: sum(credits)`** filtered by `name == "forgecode_usage"` — i.e. it sums a metadata property named **`credits`**, it does **not** count events. So every event MUST carry `metadata.credits` or the meter sums nothing and balances never decrement. `ingestUsage` always sets `credits` (default `1`); other `metadata` (model, mode, …) is analytics-only.

  ```ts
  // The name MUST match the meter filter, and `credits` MUST be present
  // (the meter sums it):
  await polar.events.ingest({
    events: [{ name: "forgecode_usage", externalCustomerId, metadata: { credits: 1 } }],
  });
  ```

- **Out-of-credits gating:** the package exposes the read side (`getCreditBalance` + a `hasCredits` boolean helper); it does **not** block requests itself — enforcement (rejecting the message) is a call-site concern in `apps/server`, out of scope here. Recommended call-site flow: check `hasCredits` → allow message → `ingestUsage` after the message is accepted.
- **Stacking purchases:** automatic, no code. The product is one-time and carries a meter-credit benefit, so every `order.paid` adds 1000 to `creditedUnits`; `balance` (= `creditedUnits − consumedUnits`) accumulates across repeat purchases. A user at 200 who buys again is at 1200.

## Conventions followed (from existing packages)

Mirrors [packages/ai](../../../packages/ai/) and [packages/shared](../../../packages/shared/):

- `package.json`: `"name": "@forgecode/payments"`, `"version": "0.0.1"`, `"private": true`, `"type": "module"`, `"main": "src/index.ts"`, an `exports` map, no `scripts`.
- `tsconfig.json`: just `{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }`.
- **All boundary data validated with zod** (`z.infer` for types, `parse`/`safeParse` at the edges), schemas co-located with their module — same as `packages/ai/src/tools/*/schema.ts`.
- Auto-registers via root `"workspaces": ["packages/*"]` — no root edits needed.

## Files

```
packages/payments/
├── package.json          # @forgecode/payments, deps: @polar-sh/sdk, zod
├── tsconfig.json         # extends ../../tsconfig.base.json
└── src/
    ├── index.ts          # public API barrel
    ├── config.ts         # paymentsConfigSchema + PaymentsConfig
    ├── client.ts         # createPaymentsClient(config) factory
    ├── checkout.ts       # createCheckout + schemas
    ├── ingestion.ts      # ingestUsage + schemas
    └── usage.ts          # getCreditBalance, hasCredits + schemas
```

### `config.ts`

```ts
import { z } from "zod";

export const paymentsConfigSchema = z.object({
  accessToken: z.string().min(1),
  productId: z.string().min(1),       // POLAR_PRODUCT_ID (the $19.99 one-time product)
  creditsMeterId: z.string().min(1),  // POLAR_CREDITS_METER_ID
  server: z.enum(["sandbox", "production"]).default("sandbox"),
});
export type PaymentsConfig = z.infer<typeof paymentsConfigSchema>;
```

### `client.ts` — the factory (single entry point)

- `createPaymentsClient(config: unknown)` → `paymentsConfigSchema.parse(config)`, construct `new Polar({ accessToken, server })`, and return a small object that closes over the `Polar` instance + parsed config:

  ```ts
  return {
    createCheckout:   (input) => createCheckout(polar, cfg, input),
    ingestUsage:      (input) => ingestUsage(polar, input),
    getCreditBalance: (input) => getCreditBalance(polar, cfg, input),
    hasCredits:       (input) => hasCredits(polar, cfg, input),
  };
  ```

- `import { Polar } from "@polar-sh/sdk"`.

### `checkout.ts`

- Input schema: `{ externalCustomerId: string; customerEmail?: string; successUrl?: string }`.
- Calls `polar.checkouts.create({ products: [cfg.productId], externalCustomerId, customerEmail, successUrl })`. (`productId` comes from config, never the caller, so the $19.99 product is fixed.)
- Returns a zod-validated subset: `{ id, url, clientSecret }` (the hosted checkout `url` is what the caller redirects to).

### `ingestion.ts`

- **One call = one message = 1 credit.** Input schema: `{ externalCustomerId: string; credits?: number (default 1); metadata?: Record<string, string | number | boolean>; timestamp?: Date }`. The event `name` is **fixed** to `USAGE_EVENT_NAME = "forgecode_usage"` (matches the meter's name filter) and the function always writes `metadata.credits` (key = `CREDITS_METADATA_KEY`) — the property the `sum(credits)` meter aggregates. Caller `metadata` is merged for analytics but cannot override `credits`, so the deduction rate can't drift.
- Sends exactly one event: `polar.events.ingest({ events: [{ name: USAGE_EVENT_NAME, externalCustomerId, timestamp, metadata }] })`.
- Returns `{ inserted: number }` from the response.

### `usage.ts`

- `getCreditBalance` — input `{ externalCustomerId: string }`. Calls `polar.customerMeters.list({ externalCustomerId, meterId: cfg.creditsMeterId })`, takes the first result item. Returns zod-validated `{ balance, consumedUnits, creditedUnits }`. **If the customer has no meter yet** (never purchased / empty list), returns `{ balance: 0, consumedUnits: 0, creditedUnits: 0 }` rather than throwing — a fresh user simply has no credits.
- `hasCredits` — input `{ externalCustomerId: string; required?: number }` (default `required = 1`). Reuses `getCreditBalance` and returns `boolean` (`balance >= required`). This is the gate the server calls before allowing a message; the package never blocks anything itself.

### `index.ts`

- `export { createPaymentsClient } from "./client";`
- `export { paymentsConfigSchema, type PaymentsConfig } from "./config";`
- Re-exports each module's input/output schemas + inferred types (checkout, ingestion, usage) and `USAGE_EVENT_NAME` so consumers can validate before calling.

### `package.json` exports

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./checkout": "./src/checkout.ts",
    "./ingestion": "./src/ingestion.ts",
    "./usage": "./src/usage.ts"
  }
}
```

## Notes / risks

- **SDK method shapes** (`checkouts.create`, `events.ingest`, `customerMeters.list`) come from the Polar docs; exact param/response field names are confirmed against the installed `@polar-sh/sdk` types during implementation and the zod output schemas adjusted to match (the SDK ships its own types, so `bunx tsc --noEmit` catches mismatches).
- Credit **granting** is intentionally not implemented — it's a Polar product/benefit configuration concern, triggered automatically on `order.paid`.
- All three operations are stateless; no DB, no caching — "nothing complicated."

## Verification

1. `bun install` (from repo root) to pull `@polar-sh/sdk` + register the workspace.
2. `cd packages/payments && bunx tsc --noEmit` — must pass clean (validates SDK call shapes against the package's own zod output schemas).
3. Optional sandbox smoke test (throwaway script, not committed) using the real sandbox IDs from [apps/server/.env.example](../../server/.env.example):
   - `createCheckout({ externalCustomerId: "test_user", customerEmail: "test@example.com" })` → expect a `url`.
   - `ingestUsage({ externalCustomerId: "test_user", metadata: { model: "opus" } })` → expect `{ inserted: 1 }` (one message = 1 credit).
   - `getCreditBalance({ externalCustomerId: "test_user" })` → expect `{ balance, consumedUnits, creditedUnits }`.
   - `hasCredits({ externalCustomerId: "test_user" })` → expect `boolean`.
