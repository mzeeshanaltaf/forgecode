import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const draculaTheme: Theme = {
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
