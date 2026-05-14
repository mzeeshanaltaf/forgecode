import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
import { client } from "../lib/client";

type State =
  | { kind: "loading" }
  | { kind: "ok"; status: "ok"; uptime: number }
  | { kind: "error"; message: string };

export function Status() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await client.health.$get();
        const data = await res.json();
        if (!cancelled) setState({ kind: "ok", ...data });
      } catch (err) {
        if (!cancelled)
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="cyan" attributes={TextAttributes.BOLD} marginBottom={1}>
        Server Status
      </text>
      {state.kind === "loading" && (
        <text attributes={TextAttributes.DIM}>Pinging /health…</text>
      )}
      {state.kind === "ok" && (
        <>
          <text>
            status: <span fg="green">{state.status}</span>
          </text>
          <text>uptime: {state.uptime.toFixed(2)}s</text>
        </>
      )}
      {state.kind === "error" && (
        <text fg="red">unreachable: {state.message}</text>
      )}
    </box>
  );
}
