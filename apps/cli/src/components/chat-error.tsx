import { useTheme } from "../lib/theme";

interface ChatErrorProps {
  error: Error;
}

export function ChatError({ error }: ChatErrorProps) {
  const theme = useTheme();
  return <text fg={theme.error}>Error: {error.message}</text>;
}
