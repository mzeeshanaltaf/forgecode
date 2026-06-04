import type { Polar } from "@polar-sh/sdk";
import { z } from "zod";
import type { PaymentsConfig } from "./config";

export const creditBalanceInputSchema = z.object({
  /** Your internal user id; must match the one used at checkout/ingestion. */
  externalCustomerId: z.string().min(1),
});
export type CreditBalanceInput = z.infer<typeof creditBalanceInputSchema>;

export const creditBalanceSchema = z.object({
  /** Remaining credits (creditedUnits − consumedUnits). */
  balance: z.number(),
  consumedUnits: z.number(),
  creditedUnits: z.number(),
});
export type CreditBalance = z.infer<typeof creditBalanceSchema>;

export const hasCreditsInputSchema = creditBalanceInputSchema.extend({
  /** Minimum balance required (defaults to 1 credit = 1 message). */
  required: z.number().positive().default(1),
});
export type HasCreditsInput = z.input<typeof hasCreditsInputSchema>;

/**
 * Read a customer's current credit balance for the configured credits meter.
 * A customer who has never purchased has no meter yet — that is reported as a
 * zero balance rather than an error.
 */
export async function getCreditBalance(
  polar: Polar,
  config: PaymentsConfig,
  input: CreditBalanceInput,
): Promise<CreditBalance> {
  const { externalCustomerId } = creditBalanceInputSchema.parse(input);

  const result = await polar.customerMeters.list({
    externalCustomerId,
    meterId: config.creditsMeterId,
  });

  for await (const page of result) {
    const meter = page.result.items[0];
    if (meter) {
      return creditBalanceSchema.parse({
        balance: meter.balance,
        consumedUnits: meter.consumedUnits,
        creditedUnits: meter.creditedUnits,
      });
    }
    break;
  }

  return creditBalanceSchema.parse({
    balance: 0,
    consumedUnits: 0,
    creditedUnits: 0,
  });
}

/**
 * Convenience gate: does the customer have at least `required` credits? Read
 * only — enforcement (rejecting the request) is the caller's responsibility.
 */
export async function hasCredits(
  polar: Polar,
  config: PaymentsConfig,
  input: HasCreditsInput,
): Promise<boolean> {
  const { externalCustomerId, required } = hasCreditsInputSchema.parse(input);
  const { balance } = await getCreditBalance(polar, config, {
    externalCustomerId,
  });
  return balance >= required;
}
