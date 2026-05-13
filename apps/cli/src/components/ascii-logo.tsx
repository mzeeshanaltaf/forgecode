import { APP_NAME } from "@lightcode/shared";

export function AsciiLogo() {
  return (
    <box justifyContent="center" alignItems="flex-end">
      <ascii-font font="tiny" text={APP_NAME} />
    </box>
  );
}
