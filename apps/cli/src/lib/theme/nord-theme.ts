import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const nordTheme: Theme = {
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
