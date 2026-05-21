#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Only run heavy setup on fresh starts, not resume/clear/compact
INPUT=$(cat)
if ! echo "$INPUT" | grep -q '"source"[[:space:]]*:[[:space:]]*"startup"'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing npm dependencies..."
npm install

echo "Generating Prisma client..."
npm run db:generate

echo "Session environment ready."
