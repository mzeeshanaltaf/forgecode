# Plan: Wire `@lightcode/payments` into the server + CLI

## Context

[packages/payments](../../../packages/payments/) already exists as a pure Polar billing service (`createPaymentsClient` → `createCheckout` / `ingestUsage` / `getCreditBalance` / `hasCredits`) but is wired to nothing. This connects it so the product actually bills:

- The CLI can start a **checkout** (`/upgrade`) to buy the $19.99 / 1000-credit product.
- The CLI can **read remaining balance** (`/balance`).
- Sending a message is **gated** on having credits and **deducts** one credit (1 message = 1 credit), closing the loop.

The server already authenticates every request via Clerk and exposes the user id at `c.get("userId")` ([middleware/auth.ts](../../server/src/middleware/auth.ts)). That Clerk user id is used **directly as Polar's `externalCustomerId`** — Polar auto-creates the external-customer mapping on first checkout/event, so no DB table or User model is needed.

## Decisions

- **Full loop:** credits middleware gates message sends; each accepted message fires `ingestUsage` (1 credit).
- **Fail-open when Polar is unconfigured** (missing/invalid `POLAR_*`): allow the request, log a warning — keeps local dev working without Polar creds. Polar API errors during a credit check also fail-open (an outage must not block all messaging).
- **CLI surface:** slash command **`/upgrade`** opens the checkout URL in the browser; **`/balance`** shows remaining credits as a toast.
- Identity: Clerk `userId` = Polar `externalCustomerId`.

## Server changes

### 1. [src/payments.ts](../../server/src/payments.ts) — new, memoized client from env

Mirrors [db.ts](../../server/src/db.ts). Builds the payments client once from `process.env.POLAR_*` (validated inside `createPaymentsClient` via the package's `paymentsConfigSchema`). Two getters:

- `getPayments(): PaymentsClient` — throws if unconfigured (used by routes → 503).
- `tryGetPayments(): PaymentsClient | null` — `null` if unconfigured (used by the gate + ingestion → fail-open).

```ts
import { createPaymentsClient, type PaymentsClient } from "@lightcode/payments";

let cached: PaymentsClient | null | undefined;

export function tryGetPayments(): PaymentsClient | null {
  if (cached !== undefined) return cached;
  try {
    cached = createPaymentsClient({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      productId: process.env.POLAR_PRODUCT_ID,
      creditsMeterId: process.env.POLAR_CREDITS_METER_ID,
      server: process.env.POLAR_SERVER || undefined, // "" -> undefined so the schema default applies
    });
  } catch (err) {
    console.warn("payments disabled — missing/invalid POLAR_* config", err);
    cached = null;
  }
  return cached;
}

export function getPayments(): PaymentsClient {
  const client = tryGetPayments();
  if (!client) throw new Error("billing not configured");
  return client;
}
```

### 2. [src/routes/payments.ts](../../server/src/routes/payments.ts) — new, checkout + balance

`new Hono<AuthEnv>().use(clerkAuth)` (same shape as [routes/sessions.ts](../../server/src/routes/sessions.ts)). Uses `c.get("userId")` as `externalCustomerId`. Returns the package result shapes verbatim so the RPC client infers them.

```ts
export const paymentsRoute = new Hono<AuthEnv>()
  .use(clerkAuth)
  .post("/checkout", async (c) => {
    try {
      const checkout = await getPayments().createCheckout({ externalCustomerId: c.get("userId") });
      return c.json(checkout); // { id, url, clientSecret }
    } catch (err) {
      console.error("checkout failed", err);
      return c.json({ error: "billing unavailable" }, 503);
    }
  })
  .get("/balance", async (c) => {
    try {
      const balance = await getPayments().getCreditBalance({ externalCustomerId: c.get("userId") });
      return c.json(balance); // { balance, consumedUnits, creditedUnits }
    } catch (err) {
      console.error("balance fetch failed", err);
      return c.json({ error: "billing unavailable" }, 503);
    }
  });
```

### 3. [src/middleware/credits.ts](../../server/src/middleware/credits.ts) — new, `requireCredits`

`createMiddleware<AuthEnv>` (must run **after** `clerkAuth` so `userId` exists). Fail-open on unconfigured **and** on Polar errors; blocks with **402 Payment Required** only when the balance is positively empty.

```ts
export const requireCredits = createMiddleware<AuthEnv>(async (c, next) => {
  const payments = tryGetPayments();
  if (!payments) {
    console.warn("billing not configured — allowing request (fail-open)");
    return next();
  }
  try {
    if (!(await payments.hasCredits({ externalCustomerId: c.get("userId") }))) {
      return c.json({ error: "insufficient credits", code: "insufficient_credits" }, 402);
    }
  } catch (err) {
    console.error("credit check failed — allowing request (fail-open)", err);
  }
  return next();
});
```

### 4. [src/index.ts](../../server/src/index.ts) — mount the route

Add `.route("/payments", paymentsRoute)` to the chained `routes` so `AppType` carries it to the CLI.

### 5. [src/routes/sessions.ts](../../server/src/routes/sessions.ts) — gate + deduct on message send

- Scope the gate to **only** the send route via inline middleware: `.post("/:id/messages", requireCredits, async (c) => { … })`.
- After the incoming message is persisted (next to the existing fire-and-forget title generation), deduct one credit — fire-and-forget, never blocking the response:

  ```ts
  void tryGetPayments()
    ?.ingestUsage({
      externalCustomerId: c.get("userId"),
      metadata: { mode, ...(model ? { model } : {}) },
    })
    .catch((err) => console.error("usage ingest failed", err));
  ```

### 6. [src/../package.json](../../server/package.json)

Add `"@lightcode/payments": "workspace:*"` to `dependencies`, then `bun install`.

## CLI changes

### 7. [src/lib/payments.ts](../src/lib/payments.ts) — new, `/upgrade` + `/balance` helpers

Mirrors [lib/auth/login.ts](../src/lib/auth/login.ts) / [whoami.ts](../src/lib/auth/whoami.ts): toast-driven, never throws to the caller. Reuses [lib/auth/browser.ts](../src/lib/auth/browser.ts)'s `openInBrowser`, the RPC `client`, and [lib/toast.ts](../src/lib/toast.ts). Validates responses with app-local zod schemas (avoids pulling the Polar SDK into the CLI).

```ts
const checkoutResponseSchema = z.object({ id: z.string(), url: z.string(), clientSecret: z.string() });
const balanceResponseSchema = z.object({
  balance: z.number(), consumedUnits: z.number(), creditedUnits: z.number(),
});

export async function upgrade(): Promise<void> {
  // client.payments.checkout.$post() -> openInBrowser(url) -> toast (fallback shows URL)
}
export async function showBalance(): Promise<void> {
  // client.payments.balance.$get() -> toast `${balance} credits remaining`
}
```

### 8. [src/lib/commands.ts](../src/lib/commands.ts) — register the commands

Add two entries next to `/login` / `/whoami`:

```ts
{ name: "upgrade", description: "Buy more credits", run: () => { void upgrade(); } },
{ name: "balance", description: "Show remaining credits", run: () => { void showBalance(); } },
```

## Reused / unchanged

- [middleware/auth.ts](../../server/src/middleware/auth.ts) `clerkAuth` / `AuthEnv` — identity + typed `userId`.
- [packages/payments](../../../packages/payments/) — the entire service; no edits.
- [lib/client.ts](../src/lib/client.ts) RPC client + [auth/browser.ts](../src/lib/auth/browser.ts) `openInBrowser` + [lib/toast.ts](../src/lib/toast.ts).

## Notes / risks

- **No User model / mapping** — Clerk `userId` is the `externalCustomerId`. A new user has no meter yet → `getCreditBalance` returns `{ balance: 0, … }` (handled in the package), so `/balance` shows 0 and the gate blocks until they `/upgrade`. With **fail-open**, an unconfigured dev server never blocks.
- **Type-safe body skipped for checkout** — the route takes no request body (Polar's hosted checkout collects email); the CLI calls `$post()` with no args, matching how `client.sessions.$post()` is already used.
- **Deduction is best-effort** — `ingestUsage` is fire-and-forget so a metering hiccup never fails a chat turn; the gate (not ingestion) enforces the limit on the *next* message.

## Verification

1. `bun install` (repo root) — resolves `@lightcode/payments` into the server.
2. Type-check both apps: `cd apps/server && bunx tsc --noEmit` and `cd apps/cli && bunx tsc --noEmit` — must pass clean (confirms the RPC types flow `/payments` into the CLI).
3. With real `POLAR_*` + `DATABASE_URL` + Clerk env in `apps/server/.env`, `bun run dev:server` + `bun run dev:cli`, signed in:
   - `/balance` → toast shows current credits (0 for a fresh account).
   - `/upgrade` → browser opens the Polar checkout for the $19.99 product; complete the sandbox payment.
   - `/balance` again → ~1000 credits.
   - Send chat messages → balance decrements by 1 each.
   - Drain to 0 → next send is rejected with **402** (`insufficient credits`); `/upgrade` and retry succeeds.
4. Fail-open check: unset the `POLAR_*` vars and restart the server → messages still send (warning logged), `/balance` and `/upgrade` toast a billing-unavailable error.
