/**
 * Open a URL in the user's default browser. Cross-platform via `Bun.spawn`
 * (the same subprocess API used by the AI runShell tool). Best-effort: returns
 * `false` if the launch fails so the caller can fall back to showing the URL.
 *
 * Windows note: this is fiddlier than it looks.
 * - `cmd /c start "" "<url>"` truncates the URL at the first `&`: `Bun.spawn`
 *   runs without a shell and won't quote a space-free URL, so `cmd.exe`
 *   re-parses it and treats `&` as a command separator.
 * - `explorer.exe <url>` opens a File Explorer window instead of resolving the
 *   URL's protocol association.
 * So we use PowerShell's `Start-Process`, which ShellExecutes the URL (→ the
 * default browser). The URL is wrapped in single quotes inside the `-Command`
 * string so PowerShell treats `&` literally, and there is no `cmd` layer to
 * re-split it. `Bun.spawn` passes the whole command as one intact argv element.
 */
export async function openInBrowser(url: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(browserCommand(url), {
      stdout: "ignore",
      stderr: "ignore",
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

function browserCommand(url: string): string[] {
  switch (process.platform) {
    case "win32": {
      // Double any single quotes so the URL can't break out of the PS literal.
      const literal = url.replace(/'/g, "''");
      return [
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Start-Process '${literal}'`,
      ];
    }
    case "darwin":
      return ["open", url];
    default:
      return ["xdg-open", url];
  }
}
