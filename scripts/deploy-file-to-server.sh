#!/bin/bash
# Deploy selected project files to remote server preserving directory structure.
#
# Usage:
#   ./scripts/deploy-file-to-server.sh server/index.js scripts/init-fresh-instance.js
#
# Optional env:
#   TEAMBUH_DEPLOY_HOST=oleg@cloud-server
#   TEAMBUH_DEPLOY_ROOT=/srv/teambuh

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${TEAMBUH_DEPLOY_HOST:-oleg@cloud-server}"
REMOTE_ROOT="${TEAMBUH_DEPLOY_ROOT:-/srv/teambuh}"

if [ "$#" -lt 1 ]; then
  echo "Usage: ./scripts/deploy-file-to-server.sh <file1> [file2 ...]"
  exit 1
fi

FILES=()
for rel in "$@"; do
  case "$rel" in
    /*)
      echo "[ERROR] Use paths relative to project root, not absolute: $rel"
      exit 1
      ;;
  esac

  if [ ! -e "$BASE_DIR/$rel" ]; then
    echo "[ERROR] File not found: $rel"
    exit 1
  fi

  FILES+=("$rel")
done

if ! command -v rsync >/dev/null 2>&1; then
  echo "[ERROR] rsync is required"
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "[ERROR] ssh is required"
  exit 1
fi

echo "Deploy host: $HOST"
echo "Remote root: $REMOTE_ROOT"

# Ensure remote root exists before syncing.
ssh "$HOST" "mkdir -p '$REMOTE_ROOT'"

for rel in "${FILES[@]}"; do
  echo "[SYNC] $rel"
  rsync -av --relative "$BASE_DIR/./$rel" "$HOST:$REMOTE_ROOT/"
done

echo "Done."
