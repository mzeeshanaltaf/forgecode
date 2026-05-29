import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const catppuccinMochaTheme: Theme = {
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
