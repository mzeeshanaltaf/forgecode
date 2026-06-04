import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_MODEL_ID } from "@forgecode/ai/registry";

interface ModelContextValue {
  modelId: string;
  setModelId: (id: string) => void;
  /** Latest value without re-subscribing — fed to the chat transport (like getMode). */
  getModelId: () => string;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [modelId, setModelIdState] = useState<string>(DEFAULT_MODEL_ID);
  const ref = useRef(modelId);
  ref.current = modelId;

  const setModelId = useCallback((id: string) => setModelIdState(id), []);
  const getModelId = useCallback(() => ref.current, []);

  return (
    <ModelContext.Provider value={{ modelId, setModelId, getModelId }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModelContext() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModelContext must be used within ModelProvider");
  return ctx;
}
