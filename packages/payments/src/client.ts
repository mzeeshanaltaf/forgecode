import { Polar } from "@polar-sh/sdk";
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
  const polar = new Polar({
    accessToken: cfg.accessToken,
    server: cfg.server,
  });

  return {
    createCheckout: (input) => createCheckout(polar, cfg, input),
    ingestUsage: (input) => ingestUsage(polar, input),
    getCreditBalance: (input) => getCreditBalance(polar, cfg, input),
    hasCredits: (input) => hasCredits(polar, cfg, input),
  };
}
