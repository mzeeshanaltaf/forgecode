import { useTheme } from "../lib/theme";

export function AsciiLogo() {
  const theme = useTheme();
  return (
    <box flexDirection="row" justifyContent="center" alignItems="flex-end">
      <ascii-font font="tiny" text="forge" color={theme.textSubtle} />
      <text> </text>
      <ascii-font font="tiny" text="code" color={theme.text} />
    </box>
  );
}
