import { RouterProvider } from "react-router";
import { ChatInputProvider } from "./lib/chat-input-context";
import { ModeProvider } from "./lib/mode-context";
import { router } from "./router";

export function App() {
  return (
    <ModeProvider>
      <ChatInputProvider>
        <RouterProvider router={router} />
      </ChatInputProvider>
    </ModeProvider>
  );
}
