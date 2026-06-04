import { TextAttributes } from "@opentui/core";
import { useDialog } from "./dialog-context";
import { Dialog } from "./dialog";
import { DialogOverlay } from "./dialog-overlay";
import { useTheme } from "../lib/theme";

/**
 * Static "about" dialog: a short description of what ForgeCode is. Esc / Ctrl+C
 * (handled by DialogProvider) or a backdrop click closes it.
 */
export function AboutDialog() {
  const { close } = useDialog();
  const theme = useTheme();
  return (
    <DialogOverlay onBackdropClick={close}>
      <Dialog title="About ForgeCode" width={54} onClose={close}>
        <box flexDirection="column">
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            ForgeCode
          </text>
          <box marginTop={1}>
            <text fg={theme.textSecondary}>
              An AI coding agent that lives in your terminal.
            </text>
          </box>
          <box marginTop={1}>
            <text fg={theme.highlight}>
              Chat to plan, write, and refactor code without leaving the
              keyboard — right where you already work.
            </text>
          </box>
        </box>
      </Dialog>
    </DialogOverlay>
  );
}
