#!/bin/bash
# Refresh the BUILD_TIME stamp in main.js with the current UTC timestamp
set -e
cd "$(dirname "$0")"
STAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"
sed -i "s/const BUILD_TIME = '[^']*';/const BUILD_TIME = '$STAMP';/" main.js
if ! grep -q "const BUILD_TIME = '$STAMP';" main.js; then
  echo "ERROR: stamp replacement failed" >&2
  exit 1
fi
echo "Stamped: $STAMP"
