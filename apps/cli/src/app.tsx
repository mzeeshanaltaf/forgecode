import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog-context";
import { ChatInputProvider } from "./lib/chat-input-context";
import { ModeProvider } from "./lib/mode-context";
import { router } from "./router";

export function App() {
  return (
    <ModeProvider>
      <DialogProvider>
        <ChatInputProvider>
          <RouterProvider router={router} />
        </ChatInputProvider>
      </DialogProvider>
    </ModeProvider>
  );
}
