import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

const PANEL_BG = "#141414";
const TITLE_FG = "#D4D4D4";
const HINT_FG = "#6B6B6B";

interface DialogProps {
  title: string;
  children?: ReactNode;
  width?: number;
  onClose?: () => void;
}

export function Dialog({ title, children, width = 60, onClose }: DialogProps) {
  return (
    <box
      width={width}
      backgroundColor={PANEL_BG}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <text fg={TITLE_FG} attributes={TextAttributes.BOLD}>
          {title}
        </text>
        <box onMouseDown={() => onClose?.()}>
          <text fg={HINT_FG}>esc</text>
        </box>
      </box>
      <box marginTop={1} flexDirection="column">
        {children ?? <text fg={HINT_FG}>Todo</text>}
      </box>
    </box>
  );
}
