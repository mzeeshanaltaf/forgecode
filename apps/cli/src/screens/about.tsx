import { TextAttributes } from "@opentui/core";

export function About() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="cyan" attributes={TextAttributes.BOLD} marginBottom={1}>
        About
      </text>
      <text>
        Lightcode is a terminal application built with OpenTUI and React Router.
      </text>
    </box>
  );
}
