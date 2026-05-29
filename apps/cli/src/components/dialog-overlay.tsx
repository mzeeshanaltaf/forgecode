import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useTheme } from "../lib/theme";

interface DialogOverlayProps {
  children: ReactNode;
  onBackdropClick?: () => void;
}

export function DialogOverlay({ children, onBackdropClick }: DialogOverlayProps) {
  const { width, height } = useTerminalDimensions();
  const theme = useTheme();

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width={width}
      height={height}
      backgroundColor={theme.overlay}
      justifyContent="center"
      alignItems="center"
      zIndex={1000}
      onMouseDown={() => onBackdropClick?.()}
    >
      {children}
    </box>
  );
}
