import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const gruvboxDarkTheme: Theme = {
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
