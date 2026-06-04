import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
import { z } from "zod";
import { client } from "../lib/client";
import { getSession } from "../lib/auth/store";
import { useDialog } from "./dialog-context";
import { Dialog } from "./dialog";
import { DialogOverlay } from "./dialog-overlay";
import { useTheme } from "../lib/theme";

const balanceResponseSchema = z.object({
  balance: z.number(),
  consumedUnits: z.number(),
  creditedUnits: z.number(),
});

/** Below this many credits the balance is shown as "low" (orange). */
const LOW_CREDIT_THRESHOLD = 100;

// Status accent colors. The theme has no success/warning tokens, so green and
// orange are defined locally; red reuses the theme's `error` token.
const CREDIT_GREEN = "#22C55E";
const CREDIT_ORANGE = "#F59E0B";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "loaded"; balance: number; consumedUnits: number; creditedUnits: number };

/**
 * Shows the signed-in user's remaining credits in a modal dialog. Esc / Ctrl+C
 * (handled by DialogProvider) or a backdrop click closes it.
 */
export function BalanceDialog() {
  const { close } = useDialog();
  const theme = useTheme();
  const [state, setState] = useState<State>(() =>
    getSession() ? { status: "loading" } : { status: "signed-out" },
  );

  // Green when healthy, orange when running low, red when empty.
  const creditColor = (balance: number): string =>
    balance <= 0
      ? theme.error
      : balance < LOW_CREDIT_THRESHOLD
        ? CREDIT_ORANGE
        : CREDIT_GREEN;

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;
    (async () => {
      const response = await client.payments.balance.$get();
      if (cancelled) return;
      if (!response.ok) {
        setState({ status: "error" });
        return;
      }
      const parsed = balanceResponseSchema.safeParse(await response.json());
      setState(
        parsed.success ? { status: "loaded", ...parsed.data } : { status: "error" },
      );
    })().catch(() => {
      if (!cancelled) setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DialogOverlay onBackdropClick={close}>
      <Dialog title="Credits" width={46} onClose={close}>
        {state.status === "loading" && (
          <text fg={theme.textFaint}>Loading your balance…</text>
        )}

        {state.status === "signed-out" && (
          <text fg={theme.textSecondary}>
            Not signed in. Run /login to check your balance.
          </text>
        )}

        {state.status === "error" && (
          <text fg={theme.error}>Could not fetch your balance. Try again later.</text>
        )}

        {state.status === "loaded" && (
          <box flexDirection="column">
            <box flexDirection="row">
              <text fg={creditColor(state.balance)} attributes={TextAttributes.BOLD}>
                {`${state.balance}`}
              </text>
              <text fg={creditColor(state.balance)}>
                {` credit${state.balance === 1 ? "" : "s"} remaining`}
              </text>
            </box>
            <box marginTop={1} flexDirection="column">
              <text fg={theme.textFaint}>{`Credited:  ${state.creditedUnits}`}</text>
              <text fg={theme.textFaint}>{`Consumed:  ${state.consumedUnits}`}</text>
            </box>
            <box marginTop={1}>
              <text fg={theme.textFaint}>Run /upgrade to add more.</text>
            </box>
          </box>
        )}
      </Dialog>
    </DialogOverlay>
  );
}
