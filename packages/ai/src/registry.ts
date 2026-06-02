import { z } from "zod";

export const PROVIDER_NAMES = ["openai", "anthropic", "google"] as const;

export const providerSchema = z.enum(PROVIDER_NAMES);
export type ProviderName = z.infer<typeof providerSchema>;

/** Human-friendly provider names for display (the enum values are lowercase ids). */
export const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

/**
 * AI SDK provider options, keyed by provider name (e.g.
 * `{ openai: { reasoningSummary: "auto" } }`). Leaf values are SDK-defined; we
 * don't re-validate their inner shape — `z.any()` keeps the inferred type
 * assignable to the SDK's `ProviderOptions`.
 */
const providerOptionsSchema = z.record(z.string(), z.record(z.string(), z.any()));

export const modelSchema = z.object({
  /** Provider model id passed straight to the AI SDK factory (e.g. "gpt-5-mini"). */
  id: z.string().min(1),
  provider: providerSchema,
  /** Human-friendly name for display. */
  label: z.string().min(1),
  /**
   * Static provider options for THIS model (reasoning/thinking, etc.). Scoped
   * per-model because reasoning support and tuning differ by model, not just by
   * provider — some models support no reasoning at all (omit the field).
   * Account/runtime options like OpenAI's `serviceTier` are layered in by
   * `provider.ts`, not stored here.
   */
  providerOptions: providerOptionsSchema.optional(),
});
export type ModelDefinition = z.infer<typeof modelSchema>;

/**
 * Flat registry of the models the coding agent can run. Model *selection* is not
 * wired up yet — for now everything resolves to {@link DEFAULT_MODEL_ID}. Add or
 * adjust entries here; provider ids are passed verbatim to the SDK factory.
 */
export const MODELS = [
  {
    id: "gpt-5.1-codex-max",
    provider: "openai",
    label: "GPT-5.1 Codex Max",
    // Reasoning model: surface a condensed reasoning summary in the stream.
    providerOptions: { openai: { reasoningSummary: "detailed" } },
  },
  {
    id: "gpt-5.1-codex-mini",
    provider: "openai",
    label: "GPT-5.1 Codex Mini",
    // Reasoning model: surface a condensed reasoning summary in the stream.
    providerOptions: { openai: { reasoningSummary: "detailed" } },
  },
  {
    id: "claude-opus-4-8",
    provider: "anthropic",
    label: "Claude Opus 4.8",
    // Opus 4.8 uses adaptive thinking — Claude picks the reasoning depth.
    providerOptions: { anthropic: { thinking: { type: "adaptive" } } },
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    // Sonnet 4.6+ uses adaptive thinking — Claude picks the reasoning depth.
    providerOptions: { anthropic: { thinking: { type: "adaptive" } } },
  },
  {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    // Haiku 4.5 doesn't support adaptive thinking — omit thinking options.
  },
  {
    id: "gemini-3.5-flash",
    provider: "google",
    label: "Gemini 3.5 Flash",
    // Gemini 3 thinks by default; surface thought summaries in the response.
    providerOptions: { google: { thinkingConfig: { includeThoughts: true } } },
  },
] as const satisfies readonly ModelDefinition[];

export const MODEL_IDS = MODELS.map((m) => m.id) as [string, ...string[]];

/** Validates a model id against the registry — useful once selection is wired up. */
export const modelIdSchema = z.enum(MODEL_IDS);

export const DEFAULT_MODEL_ID = "gpt-5.1-codex-max";

const modelsById = new Map<string, ModelDefinition>(
  MODELS.map((m) => [m.id, m]),
);

/** Looks up a model by id, throwing if it isn't in the registry. */
export function getModel(id: string): ModelDefinition {
  const model = modelsById.get(id);
  if (!model) throw new Error(`unknown model id: ${id}`);
  return model;
}

export const DEFAULT_MODEL = getModel(DEFAULT_MODEL_ID);
