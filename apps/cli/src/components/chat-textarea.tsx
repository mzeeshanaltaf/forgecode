import { TextAttributes, type TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { modes } from "@forgecode/ai/modes";
import { getModel, PROVIDER_LABELS } from "@forgecode/ai/registry";
import { useModeContext } from "../lib/mode-context";
import { useModelContext } from "../lib/model-context";
import { useTheme } from "../lib/theme";
import {
  KeyboardLayerPriority,
  useKeyboardLayer,
} from "../lib/keyboard-layers";
import {
  filterCommands,
  getCommandQuery,
  type Command,
} from "../lib/commands";
import {
  filterFiles,
  getFileMentionQuery,
  loadProjectFiles,
} from "../lib/file-mentions";
import { CommandPopover } from "./command-popover";
import { FileMentionPopover } from "./file-mention-popover";
import { useDialog } from "./dialog-context";

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
  onCommand: (command: Command) => void;
  placeholder: string;
}

export function ChatTextarea({ onSubmit, onCommand, placeholder }: ChatTextareaProps) {
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [text, setText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const { mode } = useModeContext();
  const { modelId } = useModelContext();
  const { isOpen: dialogOpen } = useDialog();
  const theme = useTheme();
  const modeDef = modes[mode];
  const modeColor = theme.mode[mode] ?? theme.text;
  const model = getModel(modelId);

  // A leading "/" command takes precedence over an "@" file mention; the two
  // contexts are otherwise mutually exclusive.
  const commandQuery = getCommandQuery(text);
  const commandMatches = commandQuery !== null ? filterCommands(commandQuery) : [];
  const commandOpen = commandMatches.length > 0;

  const fileMention = commandQuery === null ? getFileMentionQuery(text) : null;
  const fileMatches = fileMention ? filterFiles(fileMention.query, files) : [];
  const fileOpen = !commandOpen && fileMatches.length > 0;

  const activeMatches: (Command | string)[] = commandOpen ? commandMatches : fileMatches;
  const popoverOpen = commandOpen || fileOpen;
  const safeIndex = Math.min(selectedIndex, activeMatches.length - 1);
  const activeQuery = commandOpen ? commandQuery : (fileMention?.query ?? null);

  // Lazily scan the project for files the first time an "@" mention appears.
  const filesRequested = useRef(false);
  const mentionActive = fileMention !== null;
  useEffect(() => {
    if (!mentionActive || filesRequested.current) return;
    filesRequested.current = true;
    loadProjectFiles().then(setFiles).catch(() => {});
  }, [mentionActive]);

  // Latest values available to the keyboard/submit handlers without re-subscribing.
  const matchesRef = useRef(activeMatches);
  matchesRef.current = activeMatches;
  const filesRef = useRef(files);
  filesRef.current = files;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // Reset the highlight to the top whenever the filtered set changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeQuery]);

  useKeyboard((key) => {
    const count = matchesRef.current.length;
    if (count === 0) return;
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, Math.min(i, count - 1) - 1));
    } else if (key.name === "down") {
      setSelectedIndex((i) => Math.min(count - 1, i + 1));
    }
  });

  const syncFromBuffer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setText(textarea.plainText);
    setLineCount(
      Math.max(1, textarea.lineCount, textarea.virtualLineCount),
    );
    setScrollY(textarea.scrollY);
  };

  const resetInput = () => {
    textareaRef.current?.clear();
    setText("");
    setLineCount(1);
    setScrollY(0);
  };

  const runCommand = (command: Command) => {
    resetInput();
    onCommand(command);
  };

  // Replace the trailing "@<query>" with the chosen path plus a trailing space.
  const insertFileMention = (path: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const current = textarea.plainText;
    const mention = getFileMentionQuery(current);
    if (!mention) return;
    const before = current.slice(0, mention.start);
    const after = current.slice(mention.start + 1 + mention.query.length);
    const insertion = `${path} `;
    textarea.setText(before + insertion + after);
    textarea.cursorOffset = (before + insertion).length;
    syncFromBuffer();
  };

  // Ctrl+C clears a non-empty draft; an empty draft falls through to the
  // global layer, which exits the app.
  useKeyboardLayer(
    (key) => {
      if (key.ctrl && key.name === "c" && text.length > 0) {
        resetInput();
        return true;
      }
      return false;
    },
    { priority: KeyboardLayerPriority.CHAT_INPUT },
  );

  const handleSubmit = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const value = textarea.plainText;
    const cmdQuery = getCommandQuery(value);
    if (cmdQuery !== null) {
      const cmdMatches = filterCommands(cmdQuery);
      const command =
        cmdMatches[Math.min(selectedIndexRef.current, cmdMatches.length - 1)];
      if (command) {
        runCommand(command);
        return;
      }
    } else {
      const mention = getFileMentionQuery(value);
      if (mention) {
        const matches = filterFiles(mention.query, filesRef.current);
        const path =
          matches[Math.min(selectedIndexRef.current, matches.length - 1)];
        if (path) {
          insertFileMention(path);
          return;
        }
      }
    }
    resetInput();
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
    <box flexDirection="column" width={PROMPT_WIDTH} position="relative">
      {popoverOpen && (
        <box
          position="absolute"
          left={1}
          bottom={boxHeight}
          width={PROMPT_WIDTH - 1}
          zIndex={100}
        >
          {commandOpen ? (
            <CommandPopover
              commands={commandMatches}
              selectedIndex={safeIndex}
              width={PROMPT_WIDTH - 1}
              onHover={setSelectedIndex}
              onSelect={runCommand}
            />
          ) : (
            <FileMentionPopover
              files={fileMatches}
              selectedIndex={safeIndex}
              width={PROMPT_WIDTH - 1}
              onHover={setSelectedIndex}
              onSelect={insertFileMention}
            />
          )}
        </box>
      )}
      <box flexDirection="row">
        <box flexDirection="column" width={1}>
          {Array.from({ length: boxHeight }, (_, i) => (
            <text key={i} fg={modeColor}>│</text>
          ))}
        </box>
        <box
          flexDirection="column"
          backgroundColor={theme.surface}
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
              focused={!dialogOpen}
              wrapMode="word"
              placeholder={placeholder}
              flexGrow={1}
              height={visibleLines}
              backgroundColor={theme.surface}
              focusedBackgroundColor={theme.surface}
              textColor={theme.text}
              focusedTextColor={theme.text}
              cursorColor={theme.text}
              placeholderColor={theme.textFaint}
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
            <text fg={theme.textSubtle}> · </text>
            <text fg={theme.text}>{model.label}</text>
            <text fg={theme.textSubtle}> {PROVIDER_LABELS[model.provider]}</text>
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
  const theme = useTheme();
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
          <text key={i} fg={isThumb ? theme.scrollbarThumb : theme.scrollbarTrack}>
            {isThumb ? "█" : "│"}
          </text>
        );
      })}
    </box>
  );
}
