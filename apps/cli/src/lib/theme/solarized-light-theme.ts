import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const solarizedLightTheme: Theme = {
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
