import { TextAttributes } from "@opentui/core";
import { useLocation } from "react-router";

export function NotFound() {
  const location = useLocation();
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="red" attributes={TextAttributes.BOLD}>
        Not Found
      </text>
      <text attributes={TextAttributes.DIM}>
        no route matches {location.pathname}
      </text>
    </box>
  );
}
