import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const oneDarkTheme: Theme = {
  name: "One Dark",

  background: "#282C34",
  surface: "#2C313C",
  panel: "#21252B",

  text: "#ABB2BF",
  textSecondary: "#9DA5B4",
  textMuted: "#7F8696",
  textSubtle: "#5C6370",
  textFaint: "#4B5263",

  border: "#3E4451",

  accent: "#61AFEF",
  highlight: "#E5C07B",
  highlightText: "#282C34",

  error: "#E06C75",

  scrollbarThumb: "#4B5263",
  scrollbarTrack: "#2C313C",
  scrollbarTrackMuted: "#3E4451",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#61AFEF",
    plan: "#D19A66",
  },
};
