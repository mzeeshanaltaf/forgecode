import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatAddToolOutputFunction,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from "ai";
import { handlers } from "./tools/handlers";
import type { ToolName } from "./tools";
import type { ModeName } from "./modes";

export { lastAssistantMessageIsCompleteWithToolCalls };

export interface CreateChatTransportParams<UI_MESSAGE extends UIMessage> {
  url: string;
  cwd: string;
  getMode: () => ModeName;
  /**
   * Per-request headers (e.g. an auth bearer token). The transport fetches the
   * streaming endpoint directly rather than through the RPC client, so anything
   * that endpoint requires — like auth — must be supplied here. Resolvable, so
   * a function can mint a fresh token on each send.
   */
  headers?: HttpChatTransportInitOptions<UI_MESSAGE>["headers"];
}

export function createChatTransport<UI_MESSAGE extends UIMessage>({
  url,
  cwd,
  getMode,
  headers,
}: CreateChatTransportParams<UI_MESSAGE>): DefaultChatTransport<UI_MESSAGE> {
  return new DefaultChatTransport<UI_MESSAGE>({
    api: url,
    headers,
    prepareSendMessagesRequest: ({ messages, body }) => ({
      body: { ...body, cwd, mode: getMode(), message: messages[messages.length - 1] },
    }),
  });
}

export interface ExecuteClientToolParams<UI_MESSAGE extends UIMessage> {
  toolCall: {
    dynamic?: boolean;
    toolName: string;
    toolCallId: string;
    input: unknown;
  };
  cwd: string;
  addToolOutput: ChatAddToolOutputFunction<UI_MESSAGE>;
}

export async function executeClientTool<UI_MESSAGE extends UIMessage>({
  toolCall,
  cwd,
  addToolOutput,
}: ExecuteClientToolParams<UI_MESSAGE>): Promise<void> {
  if (toolCall.dynamic) return;
  const name = toolCall.toolName as ToolName;
  const handler = handlers[name] as
    | ((input: unknown, ctx: { cwd: string }) => Promise<unknown>)
    | undefined;
  if (!handler) {
    addToolOutput({
      tool: name as never,
      toolCallId: toolCall.toolCallId,
      state: "output-error",
      errorText: `unknown tool: ${name}`,
    });
    return;
  }
  try {
    const output = await handler(toolCall.input, { cwd });
    addToolOutput({
      tool: name as never,
      toolCallId: toolCall.toolCallId,
      output: output as never,
    });
  } catch (err) {
    addToolOutput({
      tool: name as never,
      toolCallId: toolCall.toolCallId,
      state: "output-error",
      errorText: err instanceof Error ? err.message : String(err),
    });
  }
}
