import { RGBA } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";

const OVERLAY_BG = RGBA.fromValues(0, 0, 0, 0.5);

interface DialogOverlayProps {
  children: ReactNode;
  onBackdropClick?: () => void;
}

export function DialogOverlay({ children, onBackdropClick }: DialogOverlayProps) {
  const { width, height } = useTerminalDimensions();

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width={width}
      height={height}
      backgroundColor={OVERLAY_BG}
      justifyContent="center"
      alignItems="center"
      zIndex={1000}
      onMouseDown={() => onBackdropClick?.()}
    >
      {children}
    </box>
  );
}
