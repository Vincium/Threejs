#!/bin/bash
# Refresh the BUILD_TIME stamp in main.js and cache-bust all local module imports
set -e
cd "$(dirname "$0")"

STAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"
VERSION="$(date -u '+%Y%m%d%H%M%S')"

sed -i "s/const BUILD_TIME = '[^']*';/const BUILD_TIME = '$STAMP';/" main.js

if ! grep -q "const BUILD_TIME = '$STAMP';" main.js; then
  echo "ERROR: stamp replacement failed" >&2
  exit 1
fi

# Cache-bust the entry point in index.html
sed -i -E "s|(\./main\.js)\?v=[0-9]+|\1|; s|(\./main\.js)|\1?v=$VERSION|g" index.html

# Cache-bust all local module imports
for f in main.js src/*.js; do
  sed -i -E "s|(\./src/[A-Za-z0-9_-]+\.js)\?v=[0-9]+|\1|g; s|(\./src/[A-Za-z0-9_-]+\.js)|\1?v=$VERSION|g" "$f"
  sed -i -E "s|(\./utils\.js)\?v=[0-9]+|\1|g; s|(\./utils\.js)|\1?v=$VERSION|g" "$f"
done

echo "Stamped: $STAMP (v$VERSION)"
