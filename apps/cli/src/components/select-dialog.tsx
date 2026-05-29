import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import { DialogOverlay } from "./dialog-overlay";
import { useTheme } from "../lib/theme";

const MAX_VISIBLE = 8;

export interface SelectDialogOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectDialogProps {
  title: string;
  options: SelectDialogOption[];
  onSelect: (option: SelectDialogOption) => void;
  onClose: () => void;
  /** Fires when the highlighted option changes (keyboard nav or mouse hover). */
  onHighlight?: (option: SelectDialogOption) => void;
  /** Value to highlight initially; defaults to the first option. */
  initialSelectedValue?: string;
  placeholder?: string;
  width?: number;
  emptyText?: string;
}

function rowId(value: string) {
  return `select-row-${value}`;
}

function matches(option: SelectDialogOption, query: string) {
  const q = query.toLowerCase();
  return (
    option.label.toLowerCase().includes(q) ||
    (option.hint?.toLowerCase().includes(q) ?? false)
  );
}

export function SelectDialog({
  title,
  options,
  onSelect,
  onClose,
  onHighlight,
  initialSelectedValue,
  placeholder = "Search",
  width = 60,
  emptyText = "No matches",
}: SelectDialogProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (!initialSelectedValue) return 0;
    const i = options.findIndex((o) => o.value === initialSelectedValue);
    return i >= 0 ? i : 0;
  });
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  // Call the latest onHighlight without re-firing the effect on its identity,
  // and only when the highlighted value actually changes.
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;
  const lastHighlightedRef = useRef<string | null>(null);

  const filtered = query === "" ? options : options.filter((o) => matches(o, query));
  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
  const visibleRows = Math.min(Math.max(filtered.length, 1), MAX_VISIBLE);
  const innerWidth = width - 4;

  // Latest values for the global keyboard handler without re-subscribing.
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedIndexRef = useRef(safeIndex);
  selectedIndexRef.current = safeIndex;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selected = filtered[safeIndex];
    if (!selected) return;
    scrollRef.current?.scrollChildIntoView(rowId(selected.value));
    if (lastHighlightedRef.current !== selected.value) {
      lastHighlightedRef.current = selected.value;
      onHighlightRef.current?.(selected);
    }
  }, [safeIndex, filtered]);

  useKeyboard((key) => {
    const count = filteredRef.current.length;
    if (count === 0) return;
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, Math.min(i, count - 1) - 1));
    } else if (key.name === "down") {
      setSelectedIndex((i) => Math.min(count - 1, i + 1));
    }
  });

  const commitSelection = () => {
    const option = filteredRef.current[selectedIndexRef.current];
    if (option) onSelect(option);
  };

  return (
    <DialogOverlay onBackdropClick={onClose}>
      <Dialog title={title} width={width} onClose={onClose}>
        <input
          focused
          width={innerWidth}
          placeholder={placeholder}
          backgroundColor={theme.panel}
          focusedBackgroundColor={theme.panel}
          textColor={theme.textSecondary}
          onInput={setQuery}
          onSubmit={commitSelection}
        />
        <box marginTop={1} flexDirection="column">
          {filtered.length === 0 ? (
            <text fg={theme.textFaint}>{emptyText}</text>
          ) : (
            <scrollbox
              ref={scrollRef}
              width={innerWidth}
              height={visibleRows}
              style={{
                rootOptions: { backgroundColor: theme.panel },
                wrapperOptions: { backgroundColor: theme.panel },
                viewportOptions: { backgroundColor: theme.panel },
                contentOptions: { backgroundColor: theme.panel },
                scrollbarOptions: {
                  showArrows: false,
                  trackOptions: {
                    foregroundColor: theme.scrollbarTrackMuted,
                    backgroundColor: theme.panel,
                  },
                },
              }}
            >
              {filtered.map((option, i) => {
                const selected = i === safeIndex;
                const fg = selected ? theme.highlightText : undefined;
                return (
                  <box
                    key={option.value}
                    id={rowId(option.value)}
                    flexDirection="row"
                    width="100%"
                    backgroundColor={selected ? theme.highlight : theme.panel}
                    paddingLeft={1}
                    onMouseMove={() => setSelectedIndex(i)}
                    onMouseDown={() => onSelect(option)}
                  >
                    <text fg={fg ?? theme.textSecondary}>{option.label}</text>
                    {option.hint ? (
                      <text fg={fg ?? theme.textFaint}> {option.hint}</text>
                    ) : null}
                  </box>
                );
              })}
            </scrollbox>
          )}
        </box>
      </Dialog>
    </DialogOverlay>
  );
}
