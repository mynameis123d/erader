#!/bin/bash
# Double-click to start Blitz on macOS (or run ./"Start Blitz.command" on Linux). First run installs everything.
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Node.js is required. Install the LTS version from https://nodejs.org and run this again."; read -r; exit 1; fi
[ -d node_modules ] || npm run setup || { read -r; exit 1; }
[ -d web/dist ] || npm run build
(sleep 3; (open http://localhost:8787 || xdg-open http://localhost:8787) >/dev/null 2>&1) &
npm start
