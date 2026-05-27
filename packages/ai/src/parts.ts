import type { UIMessagePart } from "ai";

export type StoredPart = UIMessagePart<Record<string, unknown>, Record<string, never>>;

export type ToolPartRow = {
  toolCallId: string;
  toolName: string;
  state: string;
  input: unknown;
  output: unknown;
  errorText: string | null;
  providerExecuted: boolean;
};

export function extractToolRows(parts: readonly StoredPart[]): ToolPartRow[] {
  const rows: ToolPartRow[] = [];
  for (const part of parts) {
    const isDynamic = part.type === "dynamic-tool";
    const isStatic = part.type.startsWith("tool-");
    if (!isDynamic && !isStatic) continue;
    const p = part as unknown as {
      type: string;
      toolName?: string;
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      providerExecuted?: boolean;
    };
    if (!p.toolCallId || !p.state) continue;
    const toolName = isDynamic ? p.toolName ?? "unknown" : part.type.slice(5);
    rows.push({
      toolCallId: p.toolCallId,
      toolName,
      state: p.state,
      input: p.input,
      output: p.output,
      errorText: p.errorText ?? null,
      providerExecuted: p.providerExecuted ?? false,
    });
  }
  return rows;
}
