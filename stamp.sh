#!/bin/bash
# Stamp the current UTC timestamp into main.js before committing
set -e
cd "$(dirname "$0")"
STAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"
sed -i "s/__BUILD_TIME__/$STAMP/" main.js
if grep -q '__BUILD_TIME__' main.js; then
  echo "ERROR: placeholder replacement failed" >&2
  exit 1
fi
echo "Stamped: $STAMP"
