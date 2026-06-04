import type { Polar } from "@polar-sh/sdk";
import { z } from "zod";

/**
 * The event name the credits meter filters on. Fixed here (not a caller input)
 * so every ingested event hits the meter's count aggregation and deducts
 * exactly one credit — the deduction rate can't drift from a call site.
 */
export const USAGE_EVENT_NAME = "forgecode_usage" as const;

export const ingestUsageInputSchema = z.object({
  /** Your internal user id; must match the one used at checkout. */
  externalCustomerId: z.string().min(1),
  /** Optional analytics-only data (model, route, …). Does not affect the cost. */
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  /** Defaults to now if omitted. */
  timestamp: z.date().optional(),
});
export type IngestUsageInput = z.infer<typeof ingestUsageInputSchema>;

export const ingestUsageResultSchema = z.object({
  inserted: z.number().int().nonnegative(),
});
export type IngestUsageResult = z.infer<typeof ingestUsageResultSchema>;

/**
 * Record one message of usage = one credit. Emits a single `forgecode_usage`
 * event; the meter turns it into 1 consumed unit.
 */
export async function ingestUsage(
  polar: Polar,
  input: IngestUsageInput,
): Promise<IngestUsageResult> {
  const { externalCustomerId, metadata, timestamp } =
    ingestUsageInputSchema.parse(input);

  const response = await polar.events.ingest({
    events: [
      {
        name: USAGE_EVENT_NAME,
        externalCustomerId,
        timestamp,
        metadata,
      },
    ],
  });

  return ingestUsageResultSchema.parse({ inserted: response.inserted });
}
