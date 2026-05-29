import { TextAttributes } from "@opentui/core";
import { useLocation } from "react-router";
import { useTheme } from "../lib/theme";

export function NotFound() {
  const location = useLocation();
  const theme = useTheme();
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg={theme.error} attributes={TextAttributes.BOLD}>
        Not Found
      </text>
      <text fg={theme.text} attributes={TextAttributes.DIM}>
        no route matches {location.pathname}
      </text>
    </box>
  );
}
