import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type SubmitHandler = (value: string) => void;

interface ChatInputContextValue {
  submit: SubmitHandler | null;
  setSubmit: (handler: SubmitHandler | null) => void;
}

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

export function ChatInputProvider({ children }: { children: ReactNode }) {
  const [submit, setSubmit] = useState<SubmitHandler | null>(null);
  return (
    <ChatInputContext.Provider value={{ submit, setSubmit }}>
      {children}
    </ChatInputContext.Provider>
  );
}

export function useChatInput() {
  const ctx = useContext(ChatInputContext);
  if (!ctx) throw new Error("useChatInput must be used within ChatInputProvider");
  return ctx;
}

export function useRegisterChatInput(handler: SubmitHandler) {
  const { setSubmit } = useChatInput();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stable = useCallback((value: string) => handlerRef.current(value), []);

  useEffect(() => {
    setSubmit(() => stable);
    return () => setSubmit(null);
  }, [setSubmit, stable]);
}
