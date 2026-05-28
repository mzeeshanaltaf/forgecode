import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";

const MAX_VISIBLE = 10;
const HIGHLIGHT_BG = "#EFA56A";
const SURFACE_BG = "#141414";
const SELECTED_FG = "#1A1A1A";
const PATH_FG = "#D4D4D4";

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
      {files.map((path, i) => {
        const selected = i === selectedIndex;
        return (
          <box
            key={path}
            id={rowId(path)}
            flexDirection="row"
            width="100%"
            paddingLeft={1}
            backgroundColor={selected ? HIGHLIGHT_BG : SURFACE_BG}
            onMouseMove={() => onHover(i)}
            onMouseDown={() => onSelect(path)}
          >
            <text fg={selected ? SELECTED_FG : PATH_FG}>
              {truncate(path, maxText)}
            </text>
          </box>
        );
      })}
    </scrollbox>
  );
}
