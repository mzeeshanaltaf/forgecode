import { RouterProvider } from "react-router";
import { ChatInputProvider } from "./lib/chat-input-context";
import { router } from "./router";

export function App() {
  return (
    <ChatInputProvider>
      <RouterProvider router={router} />
    </ChatInputProvider>
  );
}
