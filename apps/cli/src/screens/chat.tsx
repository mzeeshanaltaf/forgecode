import { chatLocationStateSchema, sessionMessagesResponseSchema } from "@lightcode/shared";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const response = await client.sessions[":id"].messages.$get({ param: { id } });
      if (cancelled) return;
      if (response.status === 404) {
        navigate("/", { replace: true });
        return;
      }
      const json = await response.json();
      const parsed = sessionMessagesResponseSchema.safeParse(json);
      if (!parsed.success) {
        navigate("/", { replace: true });
        return;
      }
      setHistory(parsed.data.messages as UIMessage[]);
    })().catch(() => {
      if (!cancelled) navigate("/", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (!id || history === null) {
    return (
      <box flexGrow={1} padding={1}>
        <text fg="#888888">Loading session…</text>
      </box>
    );
  }

  return <ChatSession sessionId={id} initialMessages={history} />;
}

interface ChatSessionProps {
  sessionId: string;
  initialMessages: UIMessage[];
}

function ChatSession({ sessionId, initialMessages }: ChatSessionProps) {
  const location = useLocation();
  const parsed = chatLocationStateSchema.safeParse(location.state);
  const initialInput = parsed.success ? parsed.data.input : "";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: client.sessions[":id"].messages.$url({ param: { id: sessionId } }).toString(),
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, message: messages[messages.length - 1] },
        }),
      }),
    [sessionId],
  );
  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

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
