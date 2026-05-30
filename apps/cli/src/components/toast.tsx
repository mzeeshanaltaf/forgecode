import { TextAttributes } from "@opentui/core";
import { useTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import type { Toast, ToastVariant } from "../lib/toast";

/** Accent colour per variant, mapped onto theme tokens where one fits. */
function variantColor(variant: ToastVariant, theme: Theme): string {
  switch (variant) {
    case "success":
      return "#3FB950";
    case "error":
      return theme.error;
    case "warning":
      return theme.highlight;
    case "info":
      return theme.accent;
    default:
      return theme.textMuted;
  }
}

interface ToastViewProps {
  toast: Toast;
  width?: number;
}

/** A single toast card. Purely presentational — no auto-close, no interaction. */
export function ToastView({ toast, width = 44 }: ToastViewProps) {
  const theme = useTheme();
  const color = variantColor(toast.variant, theme);
  return (
    <box
      width={width}
      backgroundColor={theme.panel}
      borderStyle="single"
      border={["left", "right"]}
      borderColor={color}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      flexDirection="column"
      alignItems="flex-start"
    >
      <text
        fg={theme.text}
        attributes={TextAttributes.BOLD}
        marginBottom={toast.description ? 1 : 0}
      >
        {toast.title}
      </text>
      {toast.description ? (
        <text fg={theme.text} wrapMode="word" width="100%">
          {toast.description}
        </text>
      ) : null}
    </box>
  );
}
