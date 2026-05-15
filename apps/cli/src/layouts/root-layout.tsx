import { TextAttributes } from "@opentui/core";
import { chatLocationStateSchema } from "@lightcode/shared";
import { Outlet, useLocation, useNavigate } from "react-router";
import { PromptTextarea } from "../components/prompt-textarea";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (value: string) => {
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
      >
        <text attributes={TextAttributes.BOLD}>Lightcode</text>
        <text attributes={TextAttributes.DIM}>
          Current: {location.pathname}
        </text>
      </box>

      <box flexGrow={1} padding={1}>
        <Outlet />
      </box>

      <box
        flexDirection="row"
        justifyContent="center"
        paddingTop={1}
        paddingBottom={1}
      >
        <PromptTextarea onSubmit={handleSubmit} />
      </box>
    </box>
  );
}
