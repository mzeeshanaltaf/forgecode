#!/bin/sh
# forgecode installer — downloads the prebuilt CLI binary from GitHub Releases,
# installs it on your PATH, and seeds the public runtime config.
#
#   curl -fsSL https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/install.sh | sh
#
# No Bun or Node required — the binary embeds the Bun runtime.
set -eu

REPO="mzeeshanaltaf/forgecode"
BIN_NAME="forgecode"

# --- Public runtime config (PKCE public client — safe to distribute) ---------
FORGECODE_SERVER_URL="https://forgecode-server.vercel.app"
CLERK_FRONTEND_API="https://adapted-rattler-83.clerk.accounts.dev"
CLERK_OAUTH_CLIENT_ID="Mzo5IbivZ8NESTyC"
# Note: CLERK_OAUTH_CLIENT_SECRET is intentionally NOT distributed. Everything
# works without it; only `/whoami` token introspection is unavailable.

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$1" >&2; }
err()  { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

# --- Detect platform → release asset name ------------------------------------
os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Linux)  os_tag="linux" ;;
  Darwin) os_tag="darwin" ;;
  *) err "unsupported OS '$os'. On Windows, use scripts/install.ps1 instead." ;;
esac

case "$arch" in
  x86_64|amd64)   arch_tag="x64" ;;
  arm64|aarch64)  arch_tag="arm64" ;;
  *) err "unsupported architecture '$arch'." ;;
esac

asset="${BIN_NAME}-${os_tag}-${arch_tag}"
info "Detected ${os_tag}-${arch_tag}, asset: ${asset}"

# --- Resolve latest release tag ----------------------------------------------
api="https://api.github.com/repos/${REPO}/releases/latest"
tag="$(curl -fsSL "$api" | grep -m1 '"tag_name"' | cut -d'"' -f4 || true)"
[ -n "$tag" ] || err "could not resolve the latest release tag from ${api}"
info "Latest release: ${tag}"

archive="${asset}.tar.gz"
url="https://github.com/${REPO}/releases/download/${tag}/${archive}"

# --- Download + extract ------------------------------------------------------
# Assets are shipped gzip-compressed (~3x smaller download); the binary inside
# is named `forgecode`.
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
info "Downloading ${url}"
curl -fSL --progress-bar "$url" -o "${tmpdir}/${archive}" || err "download failed for ${url}"
info "Extracting…"
tar -xzf "${tmpdir}/${archive}" -C "$tmpdir" || err "failed to extract ${archive}"
binsrc="${tmpdir}/${BIN_NAME}"
[ -f "$binsrc" ] || err "archive ${archive} did not contain a ${BIN_NAME} binary"
chmod +x "$binsrc"

# --- Install onto PATH -------------------------------------------------------
bindir="${HOME}/.local/bin"
mkdir -p "$bindir"
dest="${bindir}/${BIN_NAME}"
if ! mv "$binsrc" "$dest" 2>/dev/null; then
  warn "could not write to ${bindir}; falling back to /usr/local/bin (sudo)"
  bindir="/usr/local/bin"
  dest="${bindir}/${BIN_NAME}"
  sudo mv "$binsrc" "$dest" || err "failed to install to ${dest}"
  sudo chmod +x "$dest"
fi
info "Installed ${BIN_NAME} → ${dest}"

# --- Seed public config (do not clobber an existing file) --------------------
cfg_dir="${HOME}/.forgecode"
cfg="${cfg_dir}/.env"
mkdir -p "$cfg_dir"
if [ -f "$cfg" ]; then
  info "Existing config left untouched: ${cfg}"
else
  cat > "$cfg" <<EOF
FORGECODE_SERVER_URL=${FORGECODE_SERVER_URL}
CLERK_FRONTEND_API=${CLERK_FRONTEND_API}
CLERK_OAUTH_CLIENT_ID=${CLERK_OAUTH_CLIENT_ID}
EOF
  info "Wrote config: ${cfg}"
fi

# --- PATH hint ---------------------------------------------------------------
case ":${PATH}:" in
  *":${bindir}:"*) : ;;
  *) warn "${bindir} is not on your PATH. Add it, e.g.:
    echo 'export PATH=\"${bindir}:\$PATH\"' >> ~/.profile && . ~/.profile" ;;
esac

printf '\n\033[1;32mDone.\033[0m Run \033[1mforgecode\033[0m to start, then \033[1m/login\033[0m to sign in.\n'
