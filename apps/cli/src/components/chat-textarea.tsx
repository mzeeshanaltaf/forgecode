import { TextAttributes, type TextareaRenderable } from "@opentui/core";
import { useRef, useState } from "react";
import { modes } from "@lightcode/ai/modes";
import {
  CODING_AGENT_MODEL_ID,
  CODING_AGENT_PROVIDER,
} from "@lightcode/ai/model";
import { useModeContext } from "../lib/mode-context";

const MODE_COLORS: Record<string, string> = {
  build: "#5C9CF5",
  plan: "#F5A742",
};

const KEY_BINDINGS: {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  action: "submit" | "newline";
}[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "return", ctrl: true, action: "newline" },
];

const MIN_VISIBLE_LINES = 3;
const MAX_VISIBLE_LINES = 7;
const BOX_BORDER_ROWS = 0;
const TOP_PADDING_ROW = 1;
const FOOTER_ROWS = 2;
const PROMPT_WIDTH = 64;

interface ChatTextareaProps {
  onSubmit: (value: string) => void;
  placeholder: string;
}

export function ChatTextarea({ onSubmit, placeholder }: ChatTextareaProps) {
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const { mode } = useModeContext();
  const modeDef = modes[mode];
  const modeColor = MODE_COLORS[mode] ?? "#FFFFFF";

  const syncFromBuffer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setLineCount(
      Math.max(1, textarea.lineCount, textarea.virtualLineCount),
    );
    setScrollY(textarea.scrollY);
  };

  const handleSubmit = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const value = textarea.plainText;
    textarea.clear();
    setLineCount(1);
    setScrollY(0);
    onSubmit(value);
  };

  const visibleLines = Math.min(
    Math.max(lineCount, MIN_VISIBLE_LINES),
    MAX_VISIBLE_LINES,
  );
  const boxHeight =
    visibleLines + BOX_BORDER_ROWS + TOP_PADDING_ROW + FOOTER_ROWS;
  const showScrollbar = lineCount > visibleLines;

  return (
    <box flexDirection="column" width={PROMPT_WIDTH}>
      <box flexDirection="row">
        <box flexDirection="column" width={1}>
          {Array.from({ length: boxHeight }, (_, i) => (
            <text key={i} fg={modeColor}>│</text>
          ))}
        </box>
        <box
          flexDirection="column"
          backgroundColor="#1E1E1E"
          paddingTop={1}
          paddingLeft={1}
          paddingRight={1}
          marginLeft={0}
          height={boxHeight}
          flexGrow={1}
        >
          <box flexDirection="row" flexGrow={1}>
            <textarea
              ref={textareaRef}
              focused
              wrapMode="word"
              placeholder={placeholder}
              flexGrow={1}
              height={visibleLines}
              backgroundColor="#1E1E1E"
              focusedBackgroundColor="#1E1E1E"
              onSubmit={handleSubmit}
              onContentChange={syncFromBuffer}
              onCursorChange={syncFromBuffer}
              keyBindings={KEY_BINDINGS}
            />
            {showScrollbar && (
              <ScrollIndicator
                visibleLines={visibleLines}
                totalLines={lineCount}
                scrollY={scrollY}
              />
            )}
          </box>
          <box flexDirection="row" flexShrink={0}>
            <text fg={modeColor} attributes={TextAttributes.BOLD}>
              ● {modeDef.label}
            </text>
            <text fg="#808080"> · </text>
            <text fg="#FFFFFF">{CODING_AGENT_MODEL_ID}</text>
            <text fg="#808080"> {CODING_AGENT_PROVIDER}</text>
          </box>
          <text> </text>
        </box>
      </box>
    </box>
  );
}

interface ScrollIndicatorProps {
  visibleLines: number;
  totalLines: number;
  scrollY: number;
}

function ScrollIndicator({
  visibleLines,
  totalLines,
  scrollY,
}: ScrollIndicatorProps) {
  const thumbSize = Math.max(
    1,
    Math.round((visibleLines / totalLines) * visibleLines),
  );
  const trackSpan = Math.max(0, visibleLines - thumbSize);
  const maxScroll = Math.max(1, totalLines - visibleLines);
  const thumbStart = Math.min(
    trackSpan,
    Math.round((scrollY / maxScroll) * trackSpan),
  );

  return (
    <box width={1} flexDirection="column" marginLeft={1}>
      {Array.from({ length: visibleLines }, (_, i) => {
        const isThumb = i >= thumbStart && i < thumbStart + thumbSize;
        return (
          <text key={i} fg={isThumb ? "#888888" : "#333333"}>
            {isThumb ? "█" : "│"}
          </text>
        );
      })}
    </box>
  );
}
