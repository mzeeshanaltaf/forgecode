import { chatLocationStateSchema } from "@lightcode/shared";
import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { client } from "../lib/client";

export function Chat() {
  const location = useLocation();
  const parsed = chatLocationStateSchema.safeParse(location.state);
  const prompt = parsed.success ? parsed.data.input : "";

  const { completion, complete, isLoading, error } = useCompletion({
    api: client.generate.$url().toString(),
    streamProtocol: "text",
  });

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current || !prompt) return;
    submittedRef.current = true;
    void complete(prompt);
  }, [prompt, complete]);

  return (
    <box flexDirection="column" flexGrow={1} paddingTop={1}>
      <box flexDirection="column" marginBottom={1}>
        <text fg="#888888">You</text>
        <text>{prompt}</text>
      </box>
      <box flexDirection="column">
        <text fg="#888888">Assistant</text>
        {error ? (
          <text fg="red">{error.message}</text>
        ) : (
          <text>
            {completion || (isLoading ? "…" : "")}
          </text>
        )}
      </box>
    </box>
  );
}
