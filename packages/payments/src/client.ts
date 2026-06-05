import { Polar } from "@polar-sh/sdk";
import { HTTPClient } from "@polar-sh/sdk/lib/http";
import { paymentsConfigSchema, type PaymentsConfig } from "./config";
import { createCheckout, type CreateCheckoutInput } from "./checkout";
import { ingestUsage, type IngestUsageInput } from "./ingestion";
import {
  getCreditBalance,
  hasCredits,
  type CreditBalanceInput,
  type HasCreditsInput,
} from "./usage";

export type PaymentsClient = {
  /** Create a hosted checkout for the one-time $19.99 / 1000-credit product. */
  createCheckout: (input: CreateCheckoutInput) => ReturnType<typeof createCheckout>;
  /** Record one message of usage (= 1 credit). */
  ingestUsage: (input: IngestUsageInput) => ReturnType<typeof ingestUsage>;
  /** Read remaining credit balance for a customer. */
  getCreditBalance: (input: CreditBalanceInput) => ReturnType<typeof getCreditBalance>;
  /** Boolean gate: does the customer have enough credits? */
  hasCredits: (input: HasCreditsInput) => ReturnType<typeof hasCredits>;
};

/**
 * Build a payments client bound to a validated config and a single Polar SDK
 * instance. This is the package's only entry point.
 */
export function createPaymentsClient(config: PaymentsConfig | unknown): PaymentsClient {
  const cfg = paymentsConfigSchema.parse(config);

  // TEMP DIAGNOSTIC (remove after the Polar 401 is resolved): log exactly what
  // the SDK puts on the wire so we can see, on Vercel, whether the Authorization
  // header (and which other headers) actually leaves the function. A raw fetch
  // with the same token returns 200 from Vercel, yet the SDK 401s — this shows
  // the difference.
  // The Polar SDK adds a `user-agent: speakeasy-sdk/…` and an empty `cookie`
  // header to every request. When the request originates from a cloud
  // provider's IP range (e.g. Vercel/AWS), Cloudflare — which fronts the Polar
  // API — flags that signature and the `Authorization` header never reaches
  // Polar's app, which then returns `401 {"error":"Unauthorized"}`. The identical
  // request from a normal IP (local dev) succeeds, and a bare `fetch` with only
  // `accept` + `authorization` succeeds from Vercel too. Strip the two
  // offending headers so the SDK's request matches that minimal, working shape.
  const httpClient = new HTTPClient();
  httpClient.addHook("beforeRequest", (request) => {
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    headers.delete("user-agent");
    return new Request(request, { headers });
  });

  const polar = new Polar({
    accessToken: cfg.accessToken,
    server: cfg.server,
    httpClient,
  });

  return {
    createCheckout: (input) => createCheckout(polar, cfg, input),
    ingestUsage: (input) => ingestUsage(polar, input),
    getCreditBalance: (input) => getCreditBalance(polar, cfg, input),
    hasCredits: (input) => hasCredits(polar, cfg, input),
  };
}
