import {
  convertToModelMessages,
  generateId,
  generateText,
  type InferAgentUIMessage,
  NoSuchToolError,
  Output,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { tools as agentTools } from "./tools";
import { DEFAULT_MODE, modes, modeSchema, type ModeName } from "./modes";
import { DEFAULT_MODEL_ID, modelIdSchema } from "./registry";
import { providerOptionsFor, resolveLanguageModel } from "./provider";

const baseInstructions = [
  "You are a coding agent.",
  "You have file and shell tools that execute on the user's machine; the server itself has no filesystem access.",
  "All paths are relative to the user's working directory. Do not assume any path outside it is accessible — the CLI will reject such calls.",
  "Prefer reading files before editing them. When using editFile, include enough surrounding context in oldString to make the match unique.",
].join(" ");

const toolDefs: ToolSet = Object.fromEntries(
  Object.entries(agentTools).map(([name, t]) => [
    name,
    tool({
      description: t.description,
      inputSchema: t.inputSchema as never,
    }),
  ]),
);

const callOptionsSchema = z.object({
  cwd: z.string().min(1),
  mode: modeSchema.default(DEFAULT_MODE),
  model: modelIdSchema.default(DEFAULT_MODEL_ID),
});

export const codingAgent = new ToolLoopAgent({
  model: resolveLanguageModel(DEFAULT_MODEL_ID),
  instructions: baseInstructions,
  tools: toolDefs,
  stopWhen: stepCountIs(16),
  providerOptions: providerOptionsFor(DEFAULT_MODEL_ID),
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => {
    const def = modes[options.mode];
    return {
      ...settings,
      model: resolveLanguageModel(options.model),
      providerOptions: providerOptionsFor(options.model),
      instructions: [
        settings.instructions ?? "",
        def.instructions,
        `You are currently operating in "${def.label}" mode. The active mode can change between turns, so it may differ from earlier in this conversation. Always determine your current mode from THIS instruction — never from previous messages or your own earlier replies.`,
        `Working directory: ${options.cwd}`,
      ].join("\n\n"),
      activeTools: def.tools as (keyof typeof toolDefs)[],
    };
  },
  experimental_repairToolCall: async ({ toolCall, tools: toolset, error }) => {
    if (NoSuchToolError.isInstance(error)) return null;
    const matched = (toolset as Record<string, { inputSchema?: unknown }>)[
      toolCall.toolName
    ];
    if (!matched?.inputSchema) return null;
    try {
      const repair = await generateText({
        model: resolveLanguageModel(DEFAULT_MODEL_ID),
        providerOptions: providerOptionsFor(DEFAULT_MODEL_ID),
        output: Output.object({ schema: matched.inputSchema as never }),
        prompt: [
          `The previous call to tool "${toolCall.toolName}" had malformed input.`,
          `Original input: ${
            typeof toolCall.input === "string"
              ? toolCall.input
              : JSON.stringify(toolCall.input)
          }`,
          `Error: ${error.message}`,
          "Return a corrected input that matches the tool's input schema.",
        ].join("\n"),
      });
      return { ...toolCall, input: JSON.stringify(repair.output) };
    } catch (repairErr) {
      console.error("tool-call repair failed", repairErr);
      return null;
    }
  },
});

export type CodingAgentUIMessage = InferAgentUIMessage<typeof codingAgent>;


export interface RunCodingTurnParams {
  history: UIMessage[];
  cwd: string;
  mode?: ModeName;
  model?: string;
  onError?: (err: Error) => void | Promise<void>;
  onFinish?: (args: { responseMessage: UIMessage }) => void | Promise<void>;
}

export async function runCodingTurn(params: RunCodingTurnParams): Promise<Response> {
  const { history, cwd, mode = DEFAULT_MODE, model = DEFAULT_MODEL_ID, onError, onFinish } = params;
  const modelMessages = await convertToModelMessages(history);

  const result = await codingAgent.stream({
    messages: modelMessages,
    options: { cwd, mode, model },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    originalMessages: history,
    generateMessageId: generateId,
    onError(streamErr) {
      const err =
        streamErr instanceof Error ? streamErr : new Error(String(streamErr));
      if (onError) {
        void Promise.resolve(onError(err)).catch((handlerErr) => {
          console.error("runCodingTurn onError handler failed", handlerErr);
        });
      }
      return err.message;
    },
    onFinish: onFinish
      ? async ({ responseMessage }) => {
          try {
            await onFinish({ responseMessage });
          } catch (handlerErr) {
            console.error("runCodingTurn onFinish handler failed", handlerErr);
          }
        }
      : undefined,
  });
}
