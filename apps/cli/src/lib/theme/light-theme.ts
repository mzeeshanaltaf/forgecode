import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const lightTheme: Theme = {
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
