import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { Command } from "../lib/commands";

const MAX_VISIBLE = 10;
const NAME_COL = 12;
const HIGHLIGHT_BG = "#EFA56A";
const SURFACE_BG = "#141414";
const SELECTED_FG = "#1A1A1A";
const NAME_FG = "#D4D4D4";
const DESC_FG = "#6B6B6B";

interface CommandPopoverProps {
  commands: Command[];
  selectedIndex: number;
  width: number;
  onHover: (index: number) => void;
  onSelect: (command: Command) => void;
}

function rowId(name: string) {
  return `command-row-${name}`;
}

export function CommandPopover({
  commands,
  selectedIndex,
  width,
  onHover,
  onSelect,
}: CommandPopoverProps) {
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const visibleRows = Math.min(commands.length, MAX_VISIBLE);

  useEffect(() => {
    const selected = commands[selectedIndex];
    if (!selected) return;
    scrollRef.current?.scrollChildIntoView(rowId(selected.name));
  }, [selectedIndex, commands]);

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
      {commands.map((command, i) => {
        const selected = i === selectedIndex;
        const fg = selected ? SELECTED_FG : undefined;
        return (
          <box
            key={command.name}
            id={rowId(command.name)}
            flexDirection="row"
            width="100%"
            backgroundColor={selected ? HIGHLIGHT_BG : SURFACE_BG}
            onMouseMove={() => onHover(i)}
            onMouseDown={() => onSelect(command)}
          >
            <box width={NAME_COL} paddingLeft={1} flexShrink={0}>
              <text fg={fg ?? NAME_FG}>/{command.name}</text>
            </box>
            <text fg={fg ?? DESC_FG}>{command.description}</text>
          </box>
        );
      })}
    </scrollbox>
  );
}
