import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatAddToolOutputFunction,
  type UIMessage,
} from "ai";
import { handlers } from "./tools/handlers";
import type { ToolName } from "./tools";

export { lastAssistantMessageIsCompleteWithToolCalls };

export interface CreateChatTransportParams {
  url: string;
  cwd: string;
}

export function createChatTransport<UI_MESSAGE extends UIMessage>({
  url,
  cwd,
}: CreateChatTransportParams): DefaultChatTransport<UI_MESSAGE> {
  return new DefaultChatTransport<UI_MESSAGE>({
    api: url,
    prepareSendMessagesRequest: ({ messages, body }) => ({
      body: { ...body, cwd, message: messages[messages.length - 1] },
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
