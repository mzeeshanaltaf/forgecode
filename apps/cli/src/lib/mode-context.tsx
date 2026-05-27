import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_MODE, nextMode, prevMode, type ModeName } from "@lightcode/ai/modes";

interface ModeContextValue {
  mode: ModeName;
  cycleMode: () => void;
  cycleModePrev: () => void;
  getMode: () => ModeName;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ModeName>(DEFAULT_MODE);
  const modeRef = useRef<ModeName>(mode);
  modeRef.current = mode;

  const cycleMode = useCallback(() => {
    setMode((m) => nextMode(m));
  }, []);
  const cycleModePrev = useCallback(() => {
    setMode((m) => prevMode(m));
  }, []);
  const getMode = useCallback(() => modeRef.current, []);

  return (
    <ModeContext.Provider value={{ mode, cycleMode, cycleModePrev, getMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useModeContext() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useModeContext must be used within ModeProvider");
  return ctx;
}
