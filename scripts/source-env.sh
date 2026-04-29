#!/usr/bin/env sh

# Usage:
#   source scripts/source-env.sh
#   source scripts/source-env.sh path/to/.env.file

SCRIPT_DIR="$(cd "$(dirname "${0:-$PWD}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${1:-$REPO_ROOT/.env.local}"

if [ ! -f "$ENV_FILE" ] && [ -f "$REPO_ROOT/$ENV_FILE" ]; then
  ENV_FILE="$REPO_ROOT/$ENV_FILE"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  return 1 2>/dev/null || exit 1
fi

set -a
. "$ENV_FILE"
set +a

echo "Loaded environment from $ENV_FILE"
