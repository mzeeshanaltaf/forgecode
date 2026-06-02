import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog-context";
import { ChatInputProvider } from "./lib/chat-input-context";
import { KeyboardLayerProvider } from "./lib/keyboard-layers";
import { ModeProvider } from "./lib/mode-context";
import { ModelProvider } from "./lib/model-context";
import { ThemeProvider } from "./lib/theme";
import { router } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <ModeProvider>
          <ModelProvider>
            <DialogProvider>
              <ChatInputProvider>
                <RouterProvider router={router} />
              </ChatInputProvider>
            </DialogProvider>
          </ModelProvider>
        </ModeProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );
}
