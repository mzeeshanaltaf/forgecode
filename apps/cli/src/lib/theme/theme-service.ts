import { defaultTheme } from "./default-theme";
import { lightTheme } from "./light-theme";
import { draculaTheme } from "./dracula-theme";
import { nordTheme } from "./nord-theme";
import { solarizedDarkTheme } from "./solarized-dark-theme";
import { solarizedLightTheme } from "./solarized-light-theme";
import { gruvboxDarkTheme } from "./gruvbox-dark-theme";
import { monokaiTheme } from "./monokai-theme";
import { oneDarkTheme } from "./one-dark-theme";
import { tokyoNightTheme } from "./tokyo-night-theme";
import { catppuccinMochaTheme } from "./catppuccin-mocha-theme";
import { githubDarkTheme } from "./github-dark-theme";
import type { Theme } from "./types";

export const themes = {
  default: defaultTheme,
  light: lightTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  "solarized-dark": solarizedDarkTheme,
  "solarized-light": solarizedLightTheme,
  "gruvbox-dark": gruvboxDarkTheme,
  monokai: monokaiTheme,
  "one-dark": oneDarkTheme,
  "tokyo-night": tokyoNightTheme,
  "catppuccin-mocha": catppuccinMochaTheme,
  "github-dark": githubDarkTheme,
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;

export const DEFAULT_THEME_NAME: ThemeName = "default";

export function getTheme(name: ThemeName = DEFAULT_THEME_NAME): Theme {
  return themes[name];
}
