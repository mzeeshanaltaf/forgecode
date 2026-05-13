import { TextAttributes } from "@opentui/core";
import { Outlet, useLocation, useNavigate } from "react-router";
import { PromptTextarea } from "../components/prompt-textarea";

const HOME_ALIASES = new Set(["/home", "/index"]);

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (value: string) => {
    const command = value.trim();
    if (!command.startsWith("/")) return;
    const path = HOME_ALIASES.has(command.toLowerCase()) ? "/" : command;
    navigate(path);
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
