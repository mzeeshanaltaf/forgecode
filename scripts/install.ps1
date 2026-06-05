# forgecode installer (Windows) — downloads the prebuilt CLI binary from GitHub
# Releases, installs it on your PATH, and seeds the public runtime config.
#
#   irm https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.ps1 | iex
#
# No Bun or Node required — the binary embeds the Bun runtime.
$ErrorActionPreference = 'Stop'

$Repo    = 'mzeeshanaltaf/forgecode'
$BinName = 'forgecode'

# --- Public runtime config (PKCE public client — safe to distribute) ---------
$ForgecodeServerUrl  = 'https://forgecode-server.vercel.app'
$ClerkFrontendApi    = 'https://adapted-rattler-83.clerk.accounts.dev'
$ClerkOauthClientId  = 'Mzo5IbivZ8NESTyC'
# CLERK_OAUTH_CLIENT_SECRET is intentionally NOT distributed. Everything works
# without it; only `/whoami` token introspection is unavailable.

function Info($m) { Write-Host "==> $m" -ForegroundColor Blue }
function Warn($m) { Write-Host "warning: $m" -ForegroundColor Yellow }

# --- Detect architecture → release asset name --------------------------------
$archRaw = $env:PROCESSOR_ARCHITECTURE
switch ($archRaw) {
  'AMD64' { $archTag = 'x64' }
  'ARM64' { $archTag = 'arm64' }
  default { throw "unsupported architecture '$archRaw'." }
}
# Only x64 is currently published for Windows.
if ($archTag -ne 'x64') {
  throw "no Windows build is published for '$archTag' yet (only x64)."
}
$asset = "$BinName-win32-$archTag.exe"
Info "Detected win32-$archTag, asset: $asset"

# --- Resolve latest release tag ----------------------------------------------
$api = "https://api.github.com/repos/$Repo/releases/latest"
$rel = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'forgecode-installer' }
$tag = $rel.tag_name
if (-not $tag) { throw "could not resolve the latest release tag from $api" }
Info "Latest release: $tag"

$url = "https://github.com/$Repo/releases/download/$tag/$asset"

# --- Install onto PATH -------------------------------------------------------
$installDir = Join-Path $env:LOCALAPPDATA "Programs\forgecode"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$dest = Join-Path $installDir "$BinName.exe"
Info "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
Info "Installed $BinName -> $dest"

# Add install dir to the user PATH if missing.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $installDir) {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$installDir", 'User')
  Warn "Added $installDir to your user PATH. Open a new terminal to pick it up."
}

# --- Seed public config (do not clobber an existing file) --------------------
$cfgDir = Join-Path $env:USERPROFILE ".forgecode"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfg = Join-Path $cfgDir ".env"
if (Test-Path $cfg) {
  Info "Existing config left untouched: $cfg"
} else {
  $content = @"
FORGECODE_SERVER_URL=$ForgecodeServerUrl
CLERK_FRONTEND_API=$ClerkFrontendApi
CLERK_OAUTH_CLIENT_ID=$ClerkOauthClientId
"@
  Set-Content -Path $cfg -Value $content -Encoding utf8 -NoNewline
  Info "Wrote config: $cfg"
}

Write-Host ""
Write-Host "Done. Run " -NoNewline; Write-Host "forgecode" -ForegroundColor Green -NoNewline
Write-Host " to start, then " -NoNewline; Write-Host "/login" -ForegroundColor Green -NoNewline
Write-Host " to sign in."
