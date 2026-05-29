import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { Command } from "../lib/commands";
import { useTheme } from "../lib/theme";

const MAX_VISIBLE = 10;
const NAME_COL = 12;

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
  const theme = useTheme();
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
      {commands.map((command, i) => {
        const selected = i === selectedIndex;
        const fg = selected ? theme.highlightText : undefined;
        return (
          <box
            key={command.name}
            id={rowId(command.name)}
            flexDirection="row"
            width="100%"
            backgroundColor={selected ? theme.highlight : theme.panel}
            onMouseMove={() => onHover(i)}
            onMouseDown={() => onSelect(command)}
          >
            <box width={NAME_COL} paddingLeft={1} flexShrink={0}>
              <text fg={fg ?? theme.textSecondary}>/{command.name}</text>
            </box>
            <text fg={fg ?? theme.textFaint}>{command.description}</text>
          </box>
        );
      })}
    </scrollbox>
  );
}
