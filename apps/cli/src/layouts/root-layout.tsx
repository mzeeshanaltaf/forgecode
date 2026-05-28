import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { chatLocationStateSchema } from "@lightcode/ai/messages";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ChatTextarea } from "../components/chat-textarea";
import { client } from "../lib/client";
import { useChatInput } from "../lib/chat-input-context";
import { useModeContext } from "../lib/mode-context";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { submit: activeChatSubmit } = useChatInput();
  const { cycleMode, cycleModePrev } = useModeContext();
  const [creatingSession, setCreatingSession] = useState(false);
  const isHome = location.pathname === "/";

  useKeyboard((key) => {
    if (key.name === "tab") {
      if (key.shift) cycleModePrev();
      else cycleMode();
    }
  });

  const handleSubmit = async (value: string) => {
    if (activeChatSubmit) {
      activeChatSubmit(value);
      return;
    }
    const parsed = chatLocationStateSchema.safeParse({ input: value });
    if (!parsed.success || creatingSession) return;
    setCreatingSession(true);
    try {
      const response = await client.sessions.$post();
      const { id } = await response.json();
      navigate(`/sessions/${id}`, { state: parsed.data });
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor="#0A0A0A">
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        borderStyle="single"
        border={["bottom"]}
        flexShrink={0}
      >
        <text attributes={TextAttributes.BOLD}>Lightcode</text>
        <text attributes={TextAttributes.DIM}>
          Current: {location.pathname}
        </text>
      </box>

      {isHome ? (
        <box
          flexGrow={1}
          flexShrink={1}
          flexBasis={0}
          minHeight={0}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          padding={1}
        >
          <Outlet />
          <box marginTop={1}>
            <ChatTextarea onSubmit={handleSubmit} placeholder="Ask anything..." />
          </box>
        </box>
      ) : (
        <>
          <box flexGrow={1} flexShrink={1} flexBasis={0} minHeight={0} padding={1}>
            <Outlet />
          </box>
          <box
            flexDirection="row"
            justifyContent="center"
            paddingTop={1}
            paddingBottom={1}
            flexShrink={0}
          >
            <ChatTextarea onSubmit={handleSubmit} placeholder="Send a message..." />
          </box>
        </>
      )}
    </box>
  );
}
