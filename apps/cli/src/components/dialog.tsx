import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../lib/theme";

interface DialogProps {
  title: string;
  children?: ReactNode;
  width?: number;
  onClose?: () => void;
}

export function Dialog({ title, children, width = 60, onClose }: DialogProps) {
  const theme = useTheme();
  return (
    <box
      width={width}
      backgroundColor={theme.panel}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <text fg={theme.textSecondary} attributes={TextAttributes.BOLD}>
          {title}
        </text>
        <box onMouseDown={() => onClose?.()}>
          <text fg={theme.textFaint}>esc</text>
        </box>
      </box>
      <box marginTop={1} flexDirection="column">
        {children ?? <text fg={theme.textFaint}>Todo</text>}
      </box>
    </box>
  );
}
