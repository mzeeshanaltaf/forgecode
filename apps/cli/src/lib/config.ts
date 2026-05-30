import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  DEFAULT_THEME_NAME,
  themes,
  type ThemeName,
} from "./theme/themes";

const themeNames = Object.keys(themes) as [ThemeName, ...ThemeName[]];

const configSchema = z.object({
  theme: z.enum(themeNames).optional(),
});

type Config = z.infer<typeof configSchema>;

function configPath(): string {
  return join(homedir(), ".lightcode", "config.json");
}

export function loadConfig(): Config {
  try {
    const raw = readFileSync(configPath(), "utf8");
    const parsed = configSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    // Missing or unreadable config — fall back to defaults.
    return {};
  }
}

export function loadThemeName(): ThemeName {
  return loadConfig().theme ?? DEFAULT_THEME_NAME;
}

export function saveThemeName(theme: ThemeName): void {
  const next: Config = { ...loadConfig(), theme };
  try {
    const path = configPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch {
    // Best-effort persistence; a write failure shouldn't crash the TUI.
  }
}
