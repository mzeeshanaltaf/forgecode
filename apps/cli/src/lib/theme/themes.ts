import { RGBA } from "@opentui/core";
import type { ModeName } from "@lightcode/ai/modes";

export interface Theme {
  name: string;

  // Surfaces, from deepest to most elevated.
  background: string;
  surface: string;
  panel: string;

  // Text, from brightest to faintest.
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;

  border: string;

  accent: string;
  highlight: string;
  highlightText: string;

  error: string;

  scrollbarThumb: string;
  scrollbarTrack: string;
  scrollbarTrackMuted: string;

  overlay: RGBA;

  mode: Record<ModeName, string>;
}

const defaultTheme: Theme = {
  name: "Default",

  background: "#0A0A0A",
  surface: "#1E1E1E",
  panel: "#141414",

  text: "#FFFFFF",
  textSecondary: "#D4D4D4",
  textMuted: "#888888",
  textSubtle: "#808080",
  textFaint: "#6B6B6B",

  border: "#666666",

  accent: "#3B82F6",
  highlight: "#EFA56A",
  highlightText: "#1A1A1A",

  error: "red",

  scrollbarThumb: "#888888",
  scrollbarTrack: "#333333",
  scrollbarTrackMuted: "#3A3A3A",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#5C9CF5",
    plan: "#F5A742",
  },
};

const lightTheme: Theme = {
  name: "Light",

  background: "#FFFFFF",
  surface: "#F4F4F4",
  panel: "#ECECEC",

  text: "#1A1A1A",
  textSecondary: "#404040",
  textMuted: "#6B6B6B",
  textSubtle: "#808080",
  textFaint: "#A0A0A0",

  border: "#C0C0C0",

  accent: "#2563EB",
  highlight: "#EFA56A",
  highlightText: "#1A1A1A",

  error: "red",

  scrollbarThumb: "#808080",
  scrollbarTrack: "#D0D0D0",
  scrollbarTrackMuted: "#C8C8C8",

  overlay: RGBA.fromValues(0, 0, 0, 0.4),

  mode: {
    build: "#2563EB",
    plan: "#D9822B",
  },
};

const draculaTheme: Theme = {
  name: "Dracula",

  background: "#282A36",
  surface: "#343746",
  panel: "#21222C",

  text: "#F8F8F2",
  textSecondary: "#DCDCD6",
  textMuted: "#9CA0BD",
  textSubtle: "#6272A4",
  textFaint: "#4D5066",

  border: "#44475A",

  accent: "#BD93F9",
  highlight: "#FFB86C",
  highlightText: "#282A36",

  error: "#FF5555",

  scrollbarThumb: "#6272A4",
  scrollbarTrack: "#343746",
  scrollbarTrackMuted: "#3C3F50",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#8BE9FD",
    plan: "#FFB86C",
  },
};

const nordTheme: Theme = {
  name: "Nord",

  background: "#2E3440",
  surface: "#3B4252",
  panel: "#272B35",

  text: "#ECEFF4",
  textSecondary: "#D8DEE9",
  textMuted: "#8893A5",
  textSubtle: "#6E7888",
  textFaint: "#4C566A",

  border: "#434C5E",

  accent: "#88C0D0",
  highlight: "#EBCB8B",
  highlightText: "#2E3440",

  error: "#BF616A",

  scrollbarThumb: "#4C566A",
  scrollbarTrack: "#3B4252",
  scrollbarTrackMuted: "#434C5E",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#81A1C1",
    plan: "#D08770",
  },
};

const solarizedDarkTheme: Theme = {
  name: "Solarized Dark",

  background: "#002B36",
  surface: "#073642",
  panel: "#00212B",

  text: "#93A1A1",
  textSecondary: "#839496",
  textMuted: "#657B83",
  textSubtle: "#586E75",
  textFaint: "#4A5E64",

  border: "#586E75",

  accent: "#268BD2",
  highlight: "#B58900",
  highlightText: "#002B36",

  error: "#DC322F",

  scrollbarThumb: "#586E75",
  scrollbarTrack: "#073642",
  scrollbarTrackMuted: "#0A4250",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#268BD2",
    plan: "#CB4B16",
  },
};

const solarizedLightTheme: Theme = {
  name: "Solarized Light",

  background: "#FDF6E3",
  surface: "#EEE8D5",
  panel: "#E4DCC4",

  text: "#586E75",
  textSecondary: "#657B83",
  textMuted: "#839496",
  textSubtle: "#93A1A1",
  textFaint: "#A8B0AC",

  border: "#C4BCA4",

  accent: "#268BD2",
  highlight: "#B58900",
  highlightText: "#FDF6E3",

  error: "#DC322F",

  scrollbarThumb: "#93A1A1",
  scrollbarTrack: "#E4DCC4",
  scrollbarTrackMuted: "#D8D0B8",

  overlay: RGBA.fromValues(0, 0, 0, 0.4),

  mode: {
    build: "#268BD2",
    plan: "#CB4B16",
  },
};

const gruvboxDarkTheme: Theme = {
  name: "Gruvbox Dark",

  background: "#282828",
  surface: "#3C3836",
  panel: "#1D2021",

  text: "#EBDBB2",
  textSecondary: "#D5C4A1",
  textMuted: "#A89984",
  textSubtle: "#928374",
  textFaint: "#665C54",

  border: "#504945",

  accent: "#83A598",
  highlight: "#FABD2F",
  highlightText: "#282828",

  error: "#FB4934",

  scrollbarThumb: "#665C54",
  scrollbarTrack: "#3C3836",
  scrollbarTrackMuted: "#504945",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#83A598",
    plan: "#FE8019",
  },
};

const monokaiTheme: Theme = {
  name: "Monokai",

  background: "#272822",
  surface: "#383830",
  panel: "#1E1F1C",

  text: "#F8F8F2",
  textSecondary: "#D8D8D0",
  textMuted: "#908E80",
  textSubtle: "#75715E",
  textFaint: "#56544A",

  border: "#49483E",

  accent: "#66D9EF",
  highlight: "#E6DB74",
  highlightText: "#272822",

  error: "#F92672",

  scrollbarThumb: "#75715E",
  scrollbarTrack: "#383830",
  scrollbarTrackMuted: "#49483E",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#66D9EF",
    plan: "#FD971F",
  },
};

const oneDarkTheme: Theme = {
  name: "One Dark",

  background: "#282C34",
  surface: "#2C313C",
  panel: "#21252B",

  text: "#ABB2BF",
  textSecondary: "#9DA5B4",
  textMuted: "#7F8696",
  textSubtle: "#5C6370",
  textFaint: "#4B5263",

  border: "#3E4451",

  accent: "#61AFEF",
  highlight: "#E5C07B",
  highlightText: "#282C34",

  error: "#E06C75",

  scrollbarThumb: "#4B5263",
  scrollbarTrack: "#2C313C",
  scrollbarTrackMuted: "#3E4451",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#61AFEF",
    plan: "#D19A66",
  },
};

const tokyoNightTheme: Theme = {
  name: "Tokyo Night",

  background: "#1A1B26",
  surface: "#24283B",
  panel: "#16161E",

  text: "#C0CAF5",
  textSecondary: "#A9B1D6",
  textMuted: "#787C99",
  textSubtle: "#565F89",
  textFaint: "#414868",

  border: "#292E42",

  accent: "#7AA2F7",
  highlight: "#E0AF68",
  highlightText: "#1A1B26",

  error: "#F7768E",

  scrollbarThumb: "#414868",
  scrollbarTrack: "#24283B",
  scrollbarTrackMuted: "#292E42",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#7AA2F7",
    plan: "#FF9E64",
  },
};

const catppuccinMochaTheme: Theme = {
  name: "Catppuccin Mocha",

  background: "#1E1E2E",
  surface: "#313244",
  panel: "#181825",

  text: "#CDD6F4",
  textSecondary: "#BAC2DE",
  textMuted: "#A6ADC8",
  textSubtle: "#7F849C",
  textFaint: "#6C7086",

  border: "#45475A",

  accent: "#89B4FA",
  highlight: "#FAB387",
  highlightText: "#1E1E2E",

  error: "#F38BA8",

  scrollbarThumb: "#585B70",
  scrollbarTrack: "#313244",
  scrollbarTrackMuted: "#45475A",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#89B4FA",
    plan: "#FAB387",
  },
};

const githubDarkTheme: Theme = {
  name: "GitHub Dark",

  background: "#0D1117",
  surface: "#161B22",
  panel: "#010409",

  text: "#C9D1D9",
  textSecondary: "#B1BAC4",
  textMuted: "#8B949E",
  textSubtle: "#6E7681",
  textFaint: "#484F58",

  border: "#30363D",

  accent: "#58A6FF",
  highlight: "#D29922",
  highlightText: "#0D1117",

  error: "#F85149",

  scrollbarThumb: "#484F58",
  scrollbarTrack: "#161B22",
  scrollbarTrackMuted: "#30363D",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#58A6FF",
    plan: "#DB6D28",
  },
};

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
