import { TextAttributes } from "@opentui/core";

export function NotFound() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center">
        <text fg="red" attributes={TextAttributes.BOLD}>
          Screen Not Found
        </text>
        <text attributes={TextAttributes.DIM}>
          Type /home to go back to the home screen
        </text>
      </box>
    </box>
  );
}
