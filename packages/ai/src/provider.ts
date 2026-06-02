import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { getModel, type ProviderName } from "./registry";

/**
 * The env var each provider's API key is read from. Bound to explicit provider
 * instances below so the key source is unambiguous, and used to fail fast with
 * an actionable message (rather than the SDK's generic "API key is missing").
 */
const PROVIDER_API_KEY_ENV: Record<ProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

const providerFactories = {
  openai: createOpenAI({ apiKey: process.env[PROVIDER_API_KEY_ENV.openai] }),
  anthropic: createAnthropic({ apiKey: process.env[PROVIDER_API_KEY_ENV.anthropic] }),
  google: createGoogleGenerativeAI({ apiKey: process.env[PROVIDER_API_KEY_ENV.google] }),
} as const;

/** Resolves a registry model id to an AI SDK language model via its provider. */
export function resolveLanguageModel(modelId: string): LanguageModel {
  const { provider, id } = getModel(modelId);
  const envVar = PROVIDER_API_KEY_ENV[provider];
  if (!process.env[envVar]) {
    throw new Error(
      `Missing ${envVar} for provider "${provider}" (model "${modelId}"). ` +
        `Add it to apps/server/.env and restart the server — Bun reads --env-file only at startup.`,
    );
  }
  return providerFactories[provider](id);
}

/**
 * Dedicated model for generating short session titles. Intentionally NOT in the
 * public {@link MODELS} registry — it's a behind-the-scenes utility model and
 * should never appear in the user-facing model picker.
 */
export const TITLE_MODEL_ID = "gpt-5.4-mini";

/** Resolves the dedicated title-generation model (bypasses the public registry). */
export function resolveTitleModel(): LanguageModel {
  const envVar = PROVIDER_API_KEY_ENV.openai;
  if (!process.env[envVar]) {
    throw new Error(
      `Missing ${envVar} for session-title generation (model "${TITLE_MODEL_ID}").`,
    );
  }
  return providerFactories.openai(TITLE_MODEL_ID);
}

const OPENAI_SERVICE_TIER = z
  .enum(["default", "auto", "flex", "priority"])
  .optional()
  .parse(process.env.OPENAI_SERVICE_TIER || undefined);

const GOOGLE_SERVICE_TIER = z
  .enum(["standard", "flex", "priority"])
  .optional()
  .parse(process.env.GOOGLE_SERVICE_TIER || undefined);

/**
 * Account/runtime `serviceTier` per provider, sourced from env vars rather than
 * stored per model (it's an account-level setting, not a model property). Both
 * OpenAI and Google support it; their accepted values differ, so each has its
 * own enum above. Anthropic has no serviceTier.
 */
const serviceTierByProvider: Partial<Record<ProviderName, string | undefined>> = {
  openai: OPENAI_SERVICE_TIER,
  google: GOOGLE_SERVICE_TIER,
};

/**
 * Provider options for the given model: its static per-model options from the
 * registry, with the env-driven `serviceTier` layered on for providers that
 * support it. Models with no reasoning options simply return an empty object.
 */
export function providerOptionsFor(modelId: string) {
  const model = getModel(modelId);
  const base: Record<string, Record<string, any>> =
    model.providerOptions ?? {};
  const tier = serviceTierByProvider[model.provider];
  if (tier) {
    return {
      ...base,
      [model.provider]: { ...(base[model.provider] ?? {}), serviceTier: tier },
    };
  }
  return base;
}
