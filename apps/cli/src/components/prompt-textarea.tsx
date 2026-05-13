import { TextAttributes, type TextareaRenderable } from "@opentui/core";
import { useRef, useState } from "react";

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

const MAX_VISIBLE_LINES = 7;
const BOX_BORDER_ROWS = 2;
const PROMPT_WIDTH = 64;

interface PromptTextareaProps {
  onSubmit: (value: string) => void;
}

export function PromptTextarea({ onSubmit }: PromptTextareaProps) {
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [scrollY, setScrollY] = useState(0);

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

  const visibleLines = Math.min(lineCount, MAX_VISIBLE_LINES);
  const boxHeight = visibleLines + BOX_BORDER_ROWS;
  const showScrollbar = lineCount > visibleLines;

  return (
    <box flexDirection="column" width={PROMPT_WIDTH}>
      <box
        border
        borderStyle="rounded"
        paddingLeft={1}
        paddingRight={1}
        height={boxHeight}
      >
        <box flexDirection="row" flexGrow={1}>
          <textarea
            ref={textareaRef}
            focused
            wrapMode="word"
            placeholder="Type /home, /about, /settings — or describe what to build..."
            flexGrow={1}
            height={visibleLines}
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
      </box>
      <text attributes={TextAttributes.DIM}>
        ↵ submit · Ctrl+↵ newline · Ctrl+C exit
      </text>
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
