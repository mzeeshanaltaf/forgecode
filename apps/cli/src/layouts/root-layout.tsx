import { TextAttributes } from "@opentui/core";
import { chatLocationStateSchema } from "@lightcode/shared";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ChatTextarea } from "../components/chat-textarea";
import { useChatInput } from "../lib/chat-input-context";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { submit: activeChatSubmit } = useChatInput();

  const handleSubmit = (value: string) => {
    if (activeChatSubmit) {
      activeChatSubmit(value);
      return;
    }
    const parsed = chatLocationStateSchema.safeParse({ input: value });
    if (!parsed.success) return;
    navigate("/chat", { state: parsed.data });
  };

  return (
    <box flexDirection="column" flexGrow={1}>
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
        <ChatTextarea onSubmit={handleSubmit} />
      </box>
    </box>
  );
}
