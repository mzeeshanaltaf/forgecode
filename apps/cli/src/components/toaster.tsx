import { useEffect } from "react";
import { toast as toastApi, useToasts, type Toast } from "../lib/toast";
import { ToastView } from "./toast";

/** Above the dialog overlay (1000) so toasts stay visible over modals. */
const TOAST_ZINDEX = 2000;

interface ToasterProps {
  /** Rows from the top edge. */
  top?: number;
  /** Columns from the right edge. */
  right?: number;
}

/**
 * Renders the active toasts as an absolutely-positioned stack in the upper-right
 * corner, newest on top. The container hugs its content so it overlays only the
 * toast region — the rest of the TUI stays interactive. Mount once near the app
 * root, then trigger toasts from anywhere via the `toast` API.
 */
export function Toaster({ top = 1, right = 2 }: ToasterProps) {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <box
      position="absolute"
      top={top}
      right={right}
      zIndex={TOAST_ZINDEX}
      flexDirection="column"
      gap={1}
    >
      {[...toasts].reverse().map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </box>
  );
}

/** Owns one toast's auto-close timer; the timer resets if its duration changes. */
function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => toastApi.dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return <ToastView toast={toast} />;
}
