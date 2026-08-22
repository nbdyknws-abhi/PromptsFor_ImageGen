#!/bin/bash
# ==============================================================================
# Auto-Restart Watchdog & Process Supervisor
# Runs the Vite / Node server continuously. If it crashes or exits, restarts it.
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1

echo "Starting server watchdog in $DIR..."

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting server..."
  npm run dev
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited with code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
