export function AsciiLogo() {
  return (
    <box flexDirection="row" justifyContent="center" alignItems="flex-end">
      <ascii-font font="tiny" text="light" color="#808080" />
      <text> </text>
      <ascii-font font="tiny" text="code" color="#FFFFFF" />
    </box>
  );
}
