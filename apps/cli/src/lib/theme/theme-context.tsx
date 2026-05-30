import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadThemeName, saveThemeName } from "../config";
import { getTheme, type Theme, type ThemeName } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  /** Commit a theme: updates the active theme and persists it to the config file. */
  setThemeName: (name: ThemeName) => void;
  /** Apply a theme transiently (e.g. live preview) without persisting it. */
  previewThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>(() => loadThemeName());

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    saveThemeName(name);
  }, []);

  const previewThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: getTheme(themeName), themeName, setThemeName, previewThemeName }),
    [themeName, setThemeName, previewThemeName],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}
