import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const githubDarkTheme: Theme = {
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
