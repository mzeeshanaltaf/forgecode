import { chatLocationStateSchema } from "@lightcode/shared";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { TextAttributes } from "@opentui/core";
import { ChatError } from "../components/chat-error";
import { ChatMessage } from "../components/chat-message";
import { client } from "../lib/client";
import { useRegisterChatInput } from "../lib/chat-input-context";

function hasVisibleContent(message: UIMessage): boolean {
  return message.parts.some((p) => {
    if (p.type === "text") return p.text.length > 0;
    if (p.type === "reasoning") return p.text.length > 0;
    return p.type === "dynamic-tool" || p.type.startsWith("tool-");
  });
}

export function Chat() {
  const location = useLocation();
  const parsed = chatLocationStateSchema.safeParse(location.state);
  const initialInput = parsed.success ? parsed.data.input : "";

  const transport = useMemo(
    () => new DefaultChatTransport({ api: client.chat.$url().toString() }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  useRegisterChatInput((value) => {
    if (!value.trim()) return;
    void sendMessage({ text: value });
  });

  const sentInitialRef = useRef(false);
  useEffect(() => {
    if (sentInitialRef.current || !initialInput) return;
    sentInitialRef.current = true;
    void sendMessage({ text: initialInput });
  }, [initialInput, sendMessage]);

  const isBusy = status === "submitted" || status === "streaming";

  const visibleMessages = messages.filter(
    (m) => m.role !== "assistant" || hasVisibleContent(m),
  );
  const showThinking =
    isBusy && visibleMessages.at(-1)?.role !== "assistant";

  return (
    <scrollbox flexGrow={1} paddingTop={1} stickyScroll stickyStart="bottom">
      {visibleMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {showThinking && (
        <box flexDirection="column" marginBottom={1}>
          <text fg="#3B82F6" attributes={TextAttributes.BOLD}>
            Assistant
          </text>
          <text fg="#888888">Thinking...</text>
        </box>
      )}
      {error && <ChatError error={error} />}
    </scrollbox>
  );
}
