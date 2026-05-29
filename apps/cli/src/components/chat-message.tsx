import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { CodingAgentUIMessage } from "@lightcode/ai";
import type { ModeName } from "@lightcode/ai/modes";
import { useTheme } from "../lib/theme";

interface LeftBorderBlockProps {
  borderColor: string;
  backgroundColor?: string;
  children: ReactNode;
}

export function LeftBorderBlock({
  borderColor,
  backgroundColor,
  children,
}: LeftBorderBlockProps) {
  const padY = backgroundColor === undefined ? 0 : 1;
  return (
    <box flexDirection="row" marginBottom={1}>
      <box border={["left"]} borderStyle="single" borderColor={borderColor} />
      <box
        flexDirection="column"
        flexGrow={1}
        backgroundColor={backgroundColor}
        paddingLeft={1}
        paddingTop={padY}
        paddingBottom={padY}
      >
        {children}
      </box>
    </box>
  );
}

interface ChatMessageProps {
  message: CodingAgentUIMessage;
  mode?: string | null;
}

type MessagePart = CodingAgentUIMessage["parts"][number];
type ToolPart = Extract<
  MessagePart,
  { type: `tool-${string}` } | { type: "dynamic-tool" }
>;

function isToolPart(part: MessagePart): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function describeToolInput(part: ToolPart): string | null {
  const input = (part as { input?: unknown }).input;
  if (!input || typeof input !== "object") return null;
  const fields = ["path", "command", "pattern"] as const;
  for (const key of fields) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) {
      return value.length > 60 ? `${value.slice(0, 57)}…` : value;
    }
  }
  return null;
}

export function ChatMessage({ message, mode }: ChatMessageProps) {
  const theme = useTheme();
  const borderColor = (mode && theme.mode[mode as ModeName]) ?? theme.accent;
  const isUser = message.role === "user";
  const parts = message.parts.map((part, i) => {
    if (part.type === "text") {
      return (
        <text key={i} fg={theme.text} marginLeft={isUser ? 0 : 2}>
          {part.text}
        </text>
      );
    }
    if (part.type === "reasoning") {
      if (part.text.trim().length === 0) return null;
      return (
        <LeftBorderBlock key={i} borderColor={theme.border}>
          <text fg={theme.text} attributes={TextAttributes.DIM}>{part.text}</text>
        </LeftBorderBlock>
      );
    }
    if (isToolPart(part)) {
      const name =
        part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
      const subject = describeToolInput(part);
      const label = subject ? `${name} ${subject}` : name;
      let content: ReactNode;
      if (part.state === "output-error") {
        content = (
          <text fg={theme.error}>
            [tool: {label}] failed: {part.errorText}
          </text>
        );
      } else if (part.state === "output-available") {
        content = <text fg={theme.textMuted}>[tool: {label}] done</text>;
      } else {
        content = <text fg={theme.textMuted}>[tool: {label}] running</text>;
      }
      return (
        <LeftBorderBlock key={i} borderColor={theme.border}>
          {content}
        </LeftBorderBlock>
      );
    }
    return null;
  });

  if (message.role === "user") {
    return (
      <LeftBorderBlock borderColor={borderColor} backgroundColor={theme.surface}>
        <text fg={borderColor} attributes={TextAttributes.BOLD}>
          You
        </text>
        {parts}
      </LeftBorderBlock>
    );
  }

  return (
    <box flexDirection="column" marginBottom={1}>
      {parts}
    </box>
  );
}
