# forgecode uninstaller (Windows) — removes the CLI binary installed by
# install.ps1 and drops it from your user PATH.
#
#   irm https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/uninstall.ps1 | iex
#
# By default this leaves %USERPROFILE%\.forgecode (saved login, config, theme)
# intact so a later reinstall keeps you signed in. To also delete it, run the
# script with -Purge after downloading it, e.g.:
#
#   irm https://raw.githubusercontent.com/.../uninstall.ps1 -OutFile uninstall.ps1
#   ./uninstall.ps1 -Purge
param([switch]$Purge)

$ErrorActionPreference = 'Stop'

$BinName    = 'forgecode'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\forgecode'
$CfgDir     = Join-Path $env:USERPROFILE '.forgecode'

function Info($m) { Write-Host "==> $m" -ForegroundColor Blue }

# --- Remove the binary / install dir -----------------------------------------
if (Test-Path $InstallDir) {
  Remove-Item -Recurse -Force $InstallDir
  Info "Removed $InstallDir"
} else {
  Info "No install directory found at $InstallDir"
  $resolved = Get-Command $BinName -ErrorAction SilentlyContinue
  if ($resolved) {
    Info "Note: '$BinName' still resolves to $($resolved.Source) — remove it manually."
  }
}

# --- Drop the install dir from the user PATH ---------------------------------
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath) {
  $parts = $userPath -split ';' | Where-Object { $_ -and $_ -ne $InstallDir }
  $newPath = $parts -join ';'
  if ($newPath -ne $userPath) {
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Info "Removed $InstallDir from your user PATH (open a new terminal to refresh)."
  }
}

# --- Config / login / theme --------------------------------------------------
if ($Purge) {
  if (Test-Path $CfgDir) {
    Remove-Item -Recurse -Force $CfgDir
    Info "Purged $CfgDir (config, saved login, theme)."
  }
} elseif (Test-Path $CfgDir) {
  Info "Left $CfgDir in place (saved login, config, theme)."
  Info "To remove it too: Remove-Item -Recurse -Force `"$CfgDir`"  (or re-run with -Purge)"
}

Write-Host ""
Write-Host "Done. " -NoNewline; Write-Host "forgecode" -ForegroundColor Green -NoNewline
Write-Host " has been uninstalled."
