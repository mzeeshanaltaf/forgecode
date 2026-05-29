import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const tokyoNightTheme: Theme = {
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
