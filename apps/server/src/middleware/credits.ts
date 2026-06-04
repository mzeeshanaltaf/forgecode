import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./auth";
import { tryGetPayments } from "../payments";

/**
 * Blocks a request when the authenticated user has no credits left. Must run
 * **after** {@link clerkAuth} so `c.get("userId")` is set.
 *
 * Fail-open by design: if billing isn't configured, or the Polar balance check
 * itself errors, the request is allowed through (with a logged warning). Only a
 * positive "balance is empty" answer blocks, with `402 Payment Required` — so a
 * misconfigured dev server or a Polar outage never bricks messaging.
 */
export const requireCredits = createMiddleware<AuthEnv>(async (c, next) => {
  const payments = tryGetPayments();
  if (!payments) {
    console.warn("billing not configured — allowing request (fail-open)");
    return next();
  }

  try {
    if (!(await payments.hasCredits({ externalCustomerId: c.get("userId") }))) {
      return c.json({ error: "insufficient credits", code: "insufficient_credits" }, 402);
    }
  } catch (err) {
    console.error("credit check failed — allowing request (fail-open)", err);
  }

  return next();
});
