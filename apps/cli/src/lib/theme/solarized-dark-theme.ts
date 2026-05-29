import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const solarizedDarkTheme: Theme = {
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
