interface ChatErrorProps {
  error: Error;
}

export function ChatError({ error }: ChatErrorProps) {
  return <text fg="red">Error: {error.message}</text>;
}
