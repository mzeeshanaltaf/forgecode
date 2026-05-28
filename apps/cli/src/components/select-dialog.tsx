import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import { DialogOverlay } from "./dialog-overlay";

const MAX_VISIBLE = 8;
const HIGHLIGHT_BG = "#EFA56A";
const SURFACE_BG = "#141414";
const SELECTED_FG = "#1A1A1A";
const LABEL_FG = "#D4D4D4";
const HINT_FG = "#6B6B6B";

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
  placeholder = "Search",
  width = 60,
  emptyText = "No matches",
}: SelectDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

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
          backgroundColor={SURFACE_BG}
          focusedBackgroundColor={SURFACE_BG}
          textColor={LABEL_FG}
          onInput={setQuery}
          onSubmit={commitSelection}
        />
        <box marginTop={1} flexDirection="column">
          {filtered.length === 0 ? (
            <text fg={HINT_FG}>{emptyText}</text>
          ) : (
            <scrollbox
              ref={scrollRef}
              width={innerWidth}
              height={visibleRows}
              style={{
                rootOptions: { backgroundColor: SURFACE_BG },
                wrapperOptions: { backgroundColor: SURFACE_BG },
                viewportOptions: { backgroundColor: SURFACE_BG },
                contentOptions: { backgroundColor: SURFACE_BG },
                scrollbarOptions: {
                  showArrows: false,
                  trackOptions: {
                    foregroundColor: "#3A3A3A",
                    backgroundColor: SURFACE_BG,
                  },
                },
              }}
            >
              {filtered.map((option, i) => {
                const selected = i === safeIndex;
                const fg = selected ? SELECTED_FG : undefined;
                return (
                  <box
                    key={option.value}
                    id={rowId(option.value)}
                    flexDirection="row"
                    width="100%"
                    backgroundColor={selected ? HIGHLIGHT_BG : SURFACE_BG}
                    paddingLeft={1}
                    onMouseMove={() => setSelectedIndex(i)}
                    onMouseDown={() => onSelect(option)}
                  >
                    <text fg={fg ?? LABEL_FG}>{option.label}</text>
                    {option.hint ? (
                      <text fg={fg ?? HINT_FG}> {option.hint}</text>
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
