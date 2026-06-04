import type { Polar } from "@polar-sh/sdk";
import { z } from "zod";
import type { PaymentsConfig } from "./config";

export const createCheckoutInputSchema = z.object({
  /** Your internal user id; links the purchase (and granted credits) to the user. */
  externalCustomerId: z.string().min(1),
  /** Optional buyer email to prefill on the hosted checkout. */
  customerEmail: z.string().email().optional(),
  /** Optional URL Polar redirects to after a successful payment. */
  successUrl: z.string().url().optional(),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

export const checkoutResultSchema = z.object({
  id: z.string(),
  /** The hosted checkout URL to redirect the user to. */
  url: z.string(),
  clientSecret: z.string(),
});
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

/**
 * Create a hosted checkout session for the fixed one-time product. The
 * `productId` always comes from config, never the caller, so the $19.99 /
 * 1000-credit product can't be substituted at a call site.
 */
export async function createCheckout(
  polar: Polar,
  config: PaymentsConfig,
  input: CreateCheckoutInput,
): Promise<CheckoutResult> {
  const { externalCustomerId, customerEmail, successUrl } =
    createCheckoutInputSchema.parse(input);

  const checkout = await polar.checkouts.create({
    products: [config.productId],
    externalCustomerId,
    customerEmail,
    successUrl,
  });

  return checkoutResultSchema.parse({
    id: checkout.id,
    url: checkout.url,
    clientSecret: checkout.clientSecret,
  });
}
