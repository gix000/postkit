#!/bin/bash
# PostKit installer for macOS — copies the panel into Premiere's extensions
# folder, allows unsigned panels, and downloads ffmpeg for this Mac.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/PostKit"

echo "Installing PostKit…"
mkdir -p "$DEST"
# Copy the panel (keep an existing ffmpeg so updates are quick).
for item in CSXS css js jsx index.html .debug; do
  rm -rf "$DEST/$item"
  cp -R "$SRC/$item" "$DEST/$item"
done
mkdir -p "$DEST/bin"

# Premiere only loads unsigned panels with debug mode on.
for v in 11 12 13; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
done

if [ ! -x "$DEST/bin/ffmpeg" ]; then
  ARCH="$(uname -m)"
  [ "$ARCH" = "arm64" ] && BUILD=arm64 || BUILD=amd64
  echo "Downloading ffmpeg for $ARCH (about 30 MB)…"
  TMP="$(mktemp -d)"
  curl -fsSL "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$BUILD/release/ffmpeg.zip" -o "$TMP/ffmpeg.zip"
  unzip -oq "$TMP/ffmpeg.zip" -d "$TMP"
  mv "$TMP/ffmpeg" "$DEST/bin/ffmpeg"
  chmod +x "$DEST/bin/ffmpeg"
  xattr -dr com.apple.quarantine "$DEST/bin/ffmpeg" 2>/dev/null || true
  rm -rf "$TMP"
fi

"$DEST/bin/ffmpeg" -hide_banner -version | head -1
echo
echo "Done. Quit and reopen Premiere Pro, then open Window → Extensions → PostKit."
