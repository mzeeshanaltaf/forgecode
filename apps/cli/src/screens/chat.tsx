import type { CodingAgentUIMessage } from "@lightcode/ai";
import {
  chatLocationStateSchema,
  sessionMessagesResponseSchema,
} from "@lightcode/ai/messages";
import {
  createChatTransport,
  executeClientTool,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "@lightcode/ai/client";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ChatError } from "../components/chat-error";
import { ChatMessage, LeftBorderBlock } from "../components/chat-message";
import { authHeaders, client } from "../lib/client";
import { useRegisterChatInput } from "../lib/chat-input-context";
import {
  KeyboardLayerPriority,
  useKeyboardLayer,
} from "../lib/keyboard-layers";
import { useModeContext } from "../lib/mode-context";
import { useModelContext } from "../lib/model-context";
import { useTheme } from "../lib/theme";

function hasVisibleContent(message: CodingAgentUIMessage): boolean {
  return message.parts.some((p) => {
    if (p.type === "text") return p.text.length > 0;
    if (p.type === "reasoning") return p.text.length > 0;
    return p.type === "dynamic-tool" || p.type.startsWith("tool-");
  });
}

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [history, setHistory] = useState<CodingAgentUIMessage[] | null>(null);
  const [initialModeMap, setInitialModeMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!id) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    setHistory(null);
    setInitialModeMap(new Map());
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
      setInitialModeMap(new Map(parsed.data.messages.map((m) => [m.id, m.mode])));
      setHistory(parsed.data.messages as CodingAgentUIMessage[]);
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
        <text fg={theme.textMuted}>Loading session…</text>
      </box>
    );
  }

  return (
    <ChatSession
      key={id}
      sessionId={id}
      initialMessages={history}
      initialModeMap={initialModeMap}
    />
  );
}

interface ChatSessionProps {
  sessionId: string;
  initialMessages: CodingAgentUIMessage[];
  initialModeMap: Map<string, string>;
}

function ChatSession({ sessionId, initialMessages, initialModeMap }: ChatSessionProps) {
  const location = useLocation();
  const theme = useTheme();
  const parsed = chatLocationStateSchema.safeParse(location.state);
  const initialInput = parsed.success ? parsed.data.input : "";

  const cwd = useMemo(() => process.cwd(), []);
  const { getMode } = useModeContext();
  const { getModelId } = useModelContext();

  const transport = useMemo(
    () =>
      createChatTransport<CodingAgentUIMessage>({
        url: client.sessions[":id"].messages.$url({ param: { id: sessionId } }).toString(),
        cwd,
        getMode,
        getModel: getModelId,
        headers: authHeaders,
      }),
    [sessionId, cwd, getMode, getModelId],
  );
  const { messages, sendMessage, status, error, stop, addToolOutput } = useChat<CodingAgentUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }): Promise<void> =>
      executeClientTool<CodingAgentUIMessage>({ toolCall, cwd, addToolOutput }),
  });

  const messageModeMap = useRef<Map<string, string>>(new Map(initialModeMap));
  const pendingModeRef = useRef<string>(getMode());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let updated = false;
    for (const msg of messages) {
      if (msg.role === "user" && !messageModeMap.current.has(msg.id)) {
        messageModeMap.current.set(msg.id, pendingModeRef.current);
        updated = true;
      }
    }
    if (updated) {
      forceUpdate((n) => n + 1);
    }
  }, [messages]);

  useRegisterChatInput((value) => {
    if (!value.trim()) return;
    pendingModeRef.current = getMode();
    void sendMessage({ text: value });
  });

  const sentInitialRef = useRef(false);
  useEffect(() => {
    if (sentInitialRef.current || !initialInput) return;
    sentInitialRef.current = true;
    pendingModeRef.current = getMode();
    void sendMessage({ text: initialInput });
  }, [initialInput, sendMessage]);

  const isBusy = status === "submitted" || status === "streaming";

  // Show an "Interrupted by user" notice after Esc aborts a response. Cleared
  // whenever the next response starts (a new send or a tool-call auto-resend
  // both flip `isBusy` back on).
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => {
    if (isBusy) setInterrupted(false);
  }, [isBusy]);

  // Esc interrupts an in-flight response. Only consume the key while busy so it
  // stays available to other layers (e.g. a dialog, priority DIALOG) otherwise.
  useKeyboardLayer(
    (key) => {
      if (key.name === "escape" && isBusy) {
        stop();
        setInterrupted(true);
        return true;
      }
      return false;
    },
    { priority: KeyboardLayerPriority.CHAT_INPUT },
  );

  const visibleMessages = messages.filter(
    (m) => m.role !== "assistant" || hasVisibleContent(m),
  );
  const showThinking =
    isBusy && visibleMessages.at(-1)?.role !== "assistant";

  return (
    <scrollbox flexGrow={1} paddingTop={1} stickyScroll stickyStart="bottom">
      {visibleMessages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          mode={messageModeMap.current.get(message.id) ?? null}
        />
      ))}
      {showThinking && (
        <LeftBorderBlock borderColor={theme.border}>
          <text fg={theme.textMuted}>Thinking...</text>
        </LeftBorderBlock>
      )}
      {interrupted && (
        <LeftBorderBlock borderColor={theme.error}>
          <text fg={theme.textMuted}>⊘ Interrupted by user</text>
        </LeftBorderBlock>
      )}
      {error && <ChatError error={error} />}
    </scrollbox>
  );
}
