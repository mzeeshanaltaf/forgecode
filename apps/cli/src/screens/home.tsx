import { AsciiLogo } from "../components/ascii-logo";
import { useSession } from "../lib/auth";
import { useTheme } from "../lib/theme";

/** Matches the success accent used by toasts. */
const SIGNED_IN_COLOR = "#3FB950";

export function Home() {
  const theme = useTheme();
  const session = useSession();

  const label = session
    ? `● Signed in${session.user?.email ? ` as ${session.user.email}` : ""}`
    : "○ Not signed in — type /login";

  return (
    <box alignItems="center" flexDirection="column">
      <AsciiLogo />
      <box marginTop={1}>
        <text fg={session ? SIGNED_IN_COLOR : theme.textMuted}>{label}</text>
      </box>
    </box>
  );
}
