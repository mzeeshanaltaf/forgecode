import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const defaultTheme: Theme = {
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
