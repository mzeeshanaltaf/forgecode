import { useKeyboard } from "@opentui/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

  useKeyboard((key) => {
    if (content && key.name === "escape") close();
  });

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
