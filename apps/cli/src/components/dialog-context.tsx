import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  KeyboardLayerPriority,
  useKeyboardLayer,
} from "../lib/keyboard-layers";

interface DialogContextValue {
  open: (content: ReactNode) => void;
  close: () => void;
  isOpen: boolean;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  const open = useCallback((next: ReactNode) => setContent(next), []);
  const close = useCallback(() => setContent(null), []);

  // While a dialog is open it owns the top layer: esc or Ctrl+C closes it, and
  // its modal flag stops those keys (and any others) reaching the surfaces below.
  useKeyboardLayer(
    (key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        close();
        return true;
      }
      return false;
    },
    { priority: KeyboardLayerPriority.DIALOG, modal: true },
    content !== null,
  );

  const value = useMemo<DialogContextValue>(
    () => ({ open, close, isOpen: content !== null }),
    [open, close, content],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {content}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
