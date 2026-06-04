import { z } from "zod";

/**
 * Runtime config for the payments client. The package never reads `process.env`
 * itself — the caller passes these values (sourced from the server's `POLAR_*`
 * env vars) and we validate them here.
 */
export const paymentsConfigSchema = z.object({
  /** Polar API access token (`POLAR_ACCESS_TOKEN`). */
  accessToken: z.string().min(1),
  /** The one-time $19.99 product that grants 1000 credits (`POLAR_PRODUCT_ID`). */
  productId: z.string().min(1),
  /** The credits meter balances are read from (`POLAR_CREDITS_METER_ID`). */
  creditsMeterId: z.string().min(1),
  /** Which Polar environment to talk to (`POLAR_SERVER`). */
  server: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type PaymentsConfig = z.infer<typeof paymentsConfigSchema>;
