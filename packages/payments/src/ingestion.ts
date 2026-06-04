import type { Polar } from "@polar-sh/sdk";
import { z } from "zod";

/**
 * The event name the credits meter filters on. Fixed here (not a caller input)
 * so every ingested event hits the meter and the deduction rate can't drift
 * from a call site.
 */
export const USAGE_EVENT_NAME = "forgecode_usage" as const;

/**
 * The metadata property the credits meter sums (`aggregation: sum(credits)`).
 * Every event MUST carry this property or the meter counts nothing and balances
 * never decrement.
 */
export const CREDITS_METADATA_KEY = "credits" as const;

export const ingestUsageInputSchema = z.object({
  /** Your internal user id; must match the one used at checkout. */
  externalCustomerId: z.string().min(1),
  /** Credits to deduct for this event. Defaults to 1 (one message = one credit). */
  credits: z.number().positive().default(1),
  /** Optional analytics-only data (model, route, …). Does not affect the cost. */
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  /** Defaults to now if omitted. */
  timestamp: z.date().optional(),
});
export type IngestUsageInput = z.input<typeof ingestUsageInputSchema>;

export const ingestUsageResultSchema = z.object({
  inserted: z.number().int().nonnegative(),
});
export type IngestUsageResult = z.infer<typeof ingestUsageResultSchema>;

/**
 * Record usage = consume credits. Emits a single `forgecode_usage` event whose
 * `credits` metadata property the meter sums; defaults to 1 (one message = one
 * credit). Caller `metadata` is merged for analytics but can't override the
 * billing-critical `credits` value.
 */
export async function ingestUsage(
  polar: Polar,
  input: IngestUsageInput,
): Promise<IngestUsageResult> {
  const { externalCustomerId, credits, metadata, timestamp } =
    ingestUsageInputSchema.parse(input);

  const response = await polar.events.ingest({
    events: [
      {
        name: USAGE_EVENT_NAME,
        externalCustomerId,
        timestamp,
        metadata: { ...metadata, [CREDITS_METADATA_KEY]: credits },
      },
    ],
  });

  return ingestUsageResultSchema.parse({ inserted: response.inserted });
}
