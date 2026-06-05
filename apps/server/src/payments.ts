import { createHash } from "node:crypto";
import { createPaymentsClient, type PaymentsClient } from "@forgecode/payments";

/**
 * Lazily-built, process-wide payments client. Polar config is fixed at boot, so
 * we build once and memoise the result — including a `null` "disabled" state
 * when the `POLAR_*` env vars are missing or invalid, so local dev runs without
 * Polar credentials. `undefined` means "not attempted yet".
 */
let cached: PaymentsClient | null | undefined;

/**
 * The payments client, or `null` when billing isn't configured. Callers that
 * should **fail open** (the credit gate, usage ingestion) use this and skip
 * silently on `null`.
 */
export function tryGetPayments(): PaymentsClient | null {
  // TEMP DIAGNOSTIC (remove once the Polar 401 is resolved): logs the shape of
  // the token actually present in the runtime env — its length and quoted
  // first/last chars reveal hidden whitespace, newlines, or wrapping quotes that
  // produce a malformed `Authorization` header. Runs every call (not gated by
  // the memo) so it always appears for the request being debugged.
  const rawToken = process.env.POLAR_ACCESS_TOKEN;
  const sha = rawToken
    ? createHash("sha256").update(rawToken).digest("hex").slice(0, 12)
    : undefined;
  console.log(
    "[polar-debug] token length:",
    rawToken?.length,
    "| head:",
    JSON.stringify(rawToken?.slice(0, 12)),
    "| tail:",
    JSON.stringify(rawToken?.slice(-4)),
    "| sha256[:12]:",
    sha,
    "| server:",
    JSON.stringify(process.env.POLAR_SERVER),
  );

  if (cached !== undefined) return cached;
  try {
    cached = createPaymentsClient({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      productId: process.env.POLAR_PRODUCT_ID,
      creditsMeterId: process.env.POLAR_CREDITS_METER_ID,
      // "" would fail the enum; coerce to undefined so the schema default applies.
      server: process.env.POLAR_SERVER || undefined,
    });
  } catch (err) {
    console.warn("payments disabled — missing/invalid POLAR_* config", err);
    cached = null;
  }
  return cached;
}

/**
 * The payments client, throwing when billing isn't configured. Used by the
 * `/payments` routes, which surface the failure as a 503.
 */
export function getPayments(): PaymentsClient {
  const client = tryGetPayments();
  if (!client) throw new Error("billing not configured");
  return client;
}
