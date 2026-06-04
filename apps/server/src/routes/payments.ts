import { Hono } from "hono";
import { clerkAuth, type AuthEnv } from "../middleware/auth";
import { getPayments } from "../payments";

/**
 * Billing endpoints. The authenticated Clerk user id (`c.get("userId")`) is
 * used directly as Polar's `externalCustomerId`. Responses pass through the
 * `@lightcode/payments` result shapes verbatim so the RPC client infers them.
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
