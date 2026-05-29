import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog-context";
import { ChatInputProvider } from "./lib/chat-input-context";
import { KeyboardLayerProvider } from "./lib/keyboard-layers";
import { ModeProvider } from "./lib/mode-context";
import { ThemeProvider } from "./lib/theme";
import { router } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <ModeProvider>
          <DialogProvider>
            <ChatInputProvider>
              <RouterProvider router={router} />
            </ChatInputProvider>
          </DialogProvider>
        </ModeProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );
}
