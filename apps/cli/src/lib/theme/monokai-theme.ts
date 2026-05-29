import { RGBA } from "@opentui/core";
import type { Theme } from "./types";

export const monokaiTheme: Theme = {
  name: "Monokai",

  background: "#272822",
  surface: "#383830",
  panel: "#1E1F1C",

  text: "#F8F8F2",
  textSecondary: "#D8D8D0",
  textMuted: "#908E80",
  textSubtle: "#75715E",
  textFaint: "#56544A",

  border: "#49483E",

  accent: "#66D9EF",
  highlight: "#E6DB74",
  highlightText: "#272822",

  error: "#F92672",

  scrollbarThumb: "#75715E",
  scrollbarTrack: "#383830",
  scrollbarTrackMuted: "#49483E",

  overlay: RGBA.fromValues(0, 0, 0, 0.5),

  mode: {
    build: "#66D9EF",
    plan: "#FD971F",
  },
};
