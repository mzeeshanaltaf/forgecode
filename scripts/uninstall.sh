#!/bin/sh
# forgecode uninstaller — removes the CLI binary installed by install.sh.
#
#   curl -fsSL https://raw.githubusercontent.com/mzeeshanaltaf/forgecode/main/scripts/uninstall.sh | sh
#
# By default this removes only the binary and leaves ~/.forgecode/ (your saved
# login, config, and theme) intact, so a later reinstall keeps you signed in.
# Pass --purge to also delete ~/.forgecode/:
#
#   curl -fsSL .../uninstall.sh | sh -s -- --purge
set -eu

BIN_NAME="forgecode"
CFG_DIR="${HOME}/.forgecode"

purge=0
for arg in "$@"; do
  case "$arg" in
    --purge) purge=1 ;;
    *) printf 'warning: ignoring unknown argument %s\n' "$arg" >&2 ;;
  esac
done

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }

# --- Remove the binary from the known install locations ----------------------
removed=0
for dir in "${HOME}/.local/bin" "/usr/local/bin"; do
  target="${dir}/${BIN_NAME}"
  [ -e "$target" ] || continue
  if rm -f "$target" 2>/dev/null; then
    info "Removed ${target}"
    removed=1
  else
    info "Removing ${target} (needs sudo)"
    sudo rm -f "$target" && removed=1
  fi
done

if [ "$removed" -eq 0 ]; then
  info "No ${BIN_NAME} binary found in ~/.local/bin or /usr/local/bin."
  # Fall back to wherever it resolves on PATH, if anywhere.
  resolved="$(command -v "$BIN_NAME" 2>/dev/null || true)"
  if [ -n "$resolved" ]; then
    info "Note: '${BIN_NAME}' still resolves to ${resolved} — remove it manually."
  fi
fi

# --- Config / login / theme --------------------------------------------------
if [ "$purge" -eq 1 ]; then
  if [ -d "$CFG_DIR" ]; then
    rm -rf "$CFG_DIR"
    info "Purged ${CFG_DIR} (config, saved login, theme)."
  fi
elif [ -d "$CFG_DIR" ]; then
  info "Left ${CFG_DIR} in place (saved login, config, theme)."
  info "To remove it too: rm -rf \"${CFG_DIR}\"  (or re-run with --purge)"
fi

printf '\n\033[1;32mDone.\033[0m forgecode has been uninstalled.\n'
