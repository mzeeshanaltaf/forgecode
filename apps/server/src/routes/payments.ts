import { Hono } from "hono";
import { clerkAuth, type AuthEnv } from "../middleware/auth";
import { getPayments } from "../payments";

/**
 * Billing endpoints. The authenticated Clerk user id (`c.get("userId")`) is
 * used directly as Polar's `externalCustomerId`. Responses pass through the
 * `@forgecode/payments` result shapes verbatim so the RPC client infers them.
 */
export const paymentsRoute = new Hono<AuthEnv>()
  .use(clerkAuth)
  .post("/checkout", async (c) => {
    try {
      const checkout = await getPayments().createCheckout({
        externalCustomerId: c.get("userId"),
      });
      return c.json(checkout); // { id, url, clientSecret }
    } catch (err) {
      console.error("checkout failed", err);
      return c.json({ error: "billing unavailable" }, 503);
    }
  })
  .get("/balance", async (c) => {
    // TEMP DIAGNOSTIC (remove after the Polar 401 is resolved): hit the Polar
    // API directly with an explicit Authorization header, bypassing the SDK, to
    // tell apart "SDK isn't sending auth when bundled on Vercel" from "the
    // request from Vercel's network is rejected regardless".
    try {
      const token = process.env.POLAR_ACCESS_TOKEN ?? "";
      const base =
        process.env.POLAR_SERVER === "production"
          ? "https://api.polar.sh"
          : "https://sandbox-api.polar.sh";
      const url = `${base}/v1/customer-meters/?external_customer_id=${encodeURIComponent(
        c.get("userId"),
      )}&meter_id=${encodeURIComponent(process.env.POLAR_CREDITS_METER_ID ?? "")}&limit=1`;
      const probe = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const body = await probe.text();
      console.log(
        "[polar-probe] raw fetch status:",
        probe.status,
        "| sent-auth-len:",
        `Bearer ${token}`.length,
        "| body:",
        body.slice(0, 120),
      );
    } catch (probeErr) {
      console.error("[polar-probe] raw fetch threw", probeErr);
    }

    try {
      const balance = await getPayments().getCreditBalance({
        externalCustomerId: c.get("userId"),
      });
      return c.json(balance); // { balance, consumedUnits, creditedUnits }
    } catch (err) {
      console.error("balance fetch failed", err);
      return c.json({ error: "billing unavailable" }, 503);
    }
  });
