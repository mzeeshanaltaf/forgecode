import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { useTheme } from "../lib/theme";

const MAX_VISIBLE = 10;

interface FileMentionPopoverProps {
  files: string[];
  selectedIndex: number;
  width: number;
  onHover: (index: number) => void;
  onSelect: (path: string) => void;
}

function rowId(path: string) {
  return `file-row-${path}`;
}

/** Keep the filename visible by eliding the front of a too-long path. */
function truncate(path: string, max: number) {
  if (path.length <= max) return path;
  return `…${path.slice(path.length - (max - 1))}`;
}

export function FileMentionPopover({
  files,
  selectedIndex,
  width,
  onHover,
  onSelect,
}: FileMentionPopoverProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const visibleRows = Math.min(files.length, MAX_VISIBLE);
  const maxText = width - 1;

  useEffect(() => {
    const selected = files[selectedIndex];
    if (!selected) return;
    scrollRef.current?.scrollChildIntoView(rowId(selected));
  }, [selectedIndex, files]);

  return (
    <scrollbox
      ref={scrollRef}
      width={width}
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
      {files.map((path, i) => {
        const selected = i === selectedIndex;
        return (
          <box
            key={path}
            id={rowId(path)}
            flexDirection="row"
            width="100%"
            paddingLeft={1}
            backgroundColor={selected ? theme.highlight : theme.panel}
            onMouseMove={() => onHover(i)}
            onMouseDown={() => onSelect(path)}
          >
            <text fg={selected ? theme.highlightText : theme.textSecondary}>
              {truncate(path, maxText)}
            </text>
          </box>
        );
      })}
    </scrollbox>
  );
}
