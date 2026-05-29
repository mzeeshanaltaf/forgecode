import type { RGBA } from "@opentui/core";
import type { ModeName } from "@lightcode/ai/modes";

export interface Theme {
  name: string;

  // Surfaces, from deepest to most elevated.
  background: string;
  surface: string;
  panel: string;

  // Text, from brightest to faintest.
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;

  border: string;

  accent: string;
  highlight: string;
  highlightText: string;

  error: string;

  scrollbarThumb: string;
  scrollbarTrack: string;
  scrollbarTrackMuted: string;

  overlay: RGBA;

  mode: Record<ModeName, string>;
}
