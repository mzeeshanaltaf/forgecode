import { TextAttributes } from "@opentui/core";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
}

type MessagePart = UIMessage["parts"][number];
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

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg="#3B82F6" attributes={TextAttributes.BOLD}>
        {message.role === "user" ? "You" : "Assistant"}
      </text>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return <text key={i}>{part.text}</text>;
        }
        if (part.type === "reasoning") {
          return (
            <text key={i} attributes={TextAttributes.DIM}>
              {part.text}
            </text>
          );
        }
        if (isToolPart(part)) {
          const name =
            part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
          const subject = describeToolInput(part);
          const label = subject ? `${name} ${subject}` : name;
          if (part.state === "output-error") {
            return (
              <text key={i} fg="red">
                [tool: {label}] failed: {part.errorText}
              </text>
            );
          }
          if (part.state === "output-available") {
            return (
              <text key={i} fg="#888888">
                [tool: {label}] done
              </text>
            );
          }
          return (
            <text key={i} fg="#888888">
              [tool: {label}] running
            </text>
          );
        }
        return null;
      })}
    </box>
  );
}
