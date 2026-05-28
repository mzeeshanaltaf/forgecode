// hello
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app";

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  useKittyKeyboard: {
    disambiguate: true,
    alternateKeys: true,
    events: true,
    allKeysAsEscapes: true,
    reportText: true,
  },
});
createRoot(renderer).render(<App />);
