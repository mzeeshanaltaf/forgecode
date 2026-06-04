import { z } from "zod";
import { client } from "./client";
import { toast } from "./toast";
import { openInBrowser } from "./auth/browser";
import { getSession } from "./auth/store";

/**
 * `/upgrade` helper. Like the auth commands, it's fire-and-forget: it owns its
 * user feedback via the toast store and never throws to its caller. The
 * checkout endpoint requires auth, so we short-circuit with a sign-in hint when
 * there's no session rather than surfacing a raw 401. (Balance is shown via the
 * BalanceDialog, not a toast.)
 */

const checkoutResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  clientSecret: z.string(),
});

/** Start a checkout for the credits product and open it in the browser. */
export async function upgrade(): Promise<void> {
  if (!getSession()) {
    toast.info("Not signed in", { description: "Run /login to buy credits." });
    return;
  }

  let url: string;
  try {
    const res = await client.payments.checkout.$post();
    if (!res.ok) {
      toast.error("Upgrade unavailable", {
        description: "Could not start checkout. Try again later.",
      });
      return;
    }
    const parsed = checkoutResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      toast.error("Upgrade unavailable", {
        description: "The server returned an unexpected response.",
      });
      return;
    }
    url = parsed.data.url;
  } catch {
    toast.error("Upgrade unavailable", { description: "Could not reach the server." });
    return;
  }

  const opened = await openInBrowser(url);
  toast.info(opened ? "Opening checkout…" : "Open this URL to buy credits", {
    description: opened ? "Complete your purchase in the browser." : url,
    duration: opened ? undefined : 30_000,
  });
}
