import { TextAttributes } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { chatLocationStateSchema } from "@forgecode/ai/messages";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ChatTextarea } from "../components/chat-textarea";
import { useDialog } from "../components/dialog-context";
import { SessionsDialog } from "../components/sessions-dialog";
import { ThemesDialog } from "../components/themes-dialog";
import { ModelsDialog } from "../components/models-dialog";
import { BalanceDialog } from "../components/balance-dialog";
import { Toaster } from "../components/toaster";
import { client } from "../lib/client";
import { getValidAccessToken } from "../lib/auth";
import { toast } from "../lib/toast";
import { useChatInput } from "../lib/chat-input-context";
import {
  KeyboardLayerPriority,
  useKeyboardLayer,
} from "../lib/keyboard-layers";
import { useModeContext } from "../lib/mode-context";
import { useTheme } from "../lib/theme";
import type { Command } from "../lib/commands";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const renderer = useRenderer();
  const { submit: activeChatSubmit } = useChatInput();
  const { cycleMode, cycleModePrev } = useModeContext();
  const { open: openDialog } = useDialog();
  const theme = useTheme();
  const [creatingSession, setCreatingSession] = useState(false);
  const isHome = location.pathname === "/";

  // Lowest-priority layer: app-wide shortcuts that any modal surface can
  // shadow. Ctrl+C here exits, but only after higher layers (a draft to clear,
  // an open dialog to close) have declined the key.
  useKeyboardLayer(
    (key) => {
      if (key.name === "tab") {
        if (key.shift) cycleModePrev();
        else cycleMode();
        return true;
      }
      if (key.ctrl && key.name === "c") {
        renderer.destroy();
        return true;
      }
      return false;
    },
    { priority: KeyboardLayerPriority.GLOBAL },
  );

  const handleSubmit = async (value: string) => {
    // The server gates every /sessions route behind auth, so a message sent
    // without a usable token just 401s with no visible result. Check for one up
    // front (this also refreshes a near-expiry token) and surface a toast
    // otherwise — covering both an explicit /logout and a session whose token
    // expired mid-chat and couldn't refresh, for the home and in-chat inputs
    // alike. Commands (/login, etc.) go through onCommand and aren't affected.
    const token = await getValidAccessToken();
    if (!token) {
      toast.warning("Not signed in", { description: "Type /login to send messages." });
      return;
    }
    if (activeChatSubmit) {
      activeChatSubmit(value);
      return;
    }
    const parsed = chatLocationStateSchema.safeParse({ input: value });
    if (!parsed.success || creatingSession) return;
    setCreatingSession(true);
    try {
      const response = await client.sessions.$post();
      const { id } = await response.json();
      navigate(`/sessions/${id}`, { state: parsed.data });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCommand = (command: Command) => {
    command.run({
      navigate,
      exit: () => renderer.destroy(),
      openSessions: () =>
        openDialog(
          <SessionsDialog onSelectSession={(id) => navigate(`/sessions/${id}`)} />,
        ),
      openThemes: () => openDialog(<ThemesDialog />),
      openModels: () => openDialog(<ModelsDialog />),
      openBalance: () => openDialog(<BalanceDialog />),
    });
  };

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={theme.background}>
      <Toaster />
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        borderStyle="single"
        border={["bottom"]}
        borderColor={theme.border}
        flexShrink={0}
      >
        <text fg={theme.text} attributes={TextAttributes.BOLD}>ForgeCode</text>
        <text fg={theme.text} attributes={TextAttributes.DIM}>
          Current: {location.pathname}
        </text>
      </box>

      {isHome ? (
        <box
          flexGrow={1}
          flexShrink={1}
          flexBasis={0}
          minHeight={0}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          padding={1}
        >
          <Outlet />
          <box marginTop={1}>
            <ChatTextarea
              onSubmit={handleSubmit}
              onCommand={handleCommand}
              placeholder="Ask anything..."
            />
          </box>
        </box>
      ) : (
        <>
          <box flexGrow={1} flexShrink={1} flexBasis={0} minHeight={0} padding={1}>
            <Outlet />
          </box>
          <box
            flexDirection="row"
            justifyContent="center"
            paddingTop={1}
            paddingBottom={1}
            flexShrink={0}
          >
            <ChatTextarea
              onSubmit={handleSubmit}
              onCommand={handleCommand}
              placeholder="Send a message..."
            />
          </box>
        </>
      )}
    </box>
  );
}
