#!/usr/bin/env bash
# Durable, app-independent static server for the Shift Rostering prototype.
#
# WHY: the FAMS preview servers (:6300 / :6395) are managed by the app and get
# stopped on idle — and when you're out of usage hours you can't ask Claude to
# restart them. This serves the prototype as a plain OS process that nothing
# manages, so it stays up on its own. It reads files from disk each request, so
# any edit to the prototype is live on the next refresh.
#
# USE:
#   ./serve-standalone.sh          # start (or report it's already running)
#   ./serve-standalone.sh stop     # stop it
#   ./serve-standalone.sh restart  # stop then start
#
# Then open:  http://127.0.0.1:8787/shift-rostering.html

set -euo pipefail
PORT=8787
DIR="$(cd "$(dirname "$0")/public/screens/shift-rostering" && pwd)"
PIDFILE="/tmp/roster-static-server.pid"
LOG="/tmp/roster-static-server.log"
URL="http://127.0.0.1:${PORT}/shift-rostering.html"

running() { lsof -iTCP:"$PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; }

stop() {
  if running; then
    lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
    sleep 1
    echo "stopped server on :$PORT"
  else
    echo "nothing running on :$PORT"
  fi
  rm -f "$PIDFILE"
}

start() {
  if running; then
    echo "already running → $URL"
    return 0
  fi
  # nohup + background detaches from this shell so the process outlives it.
  nohup python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIR" > "$LOG" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1.5
  if running; then
    echo "serving $DIR"
    echo "open → $URL"
  else
    echo "failed to start — see $LOG"; exit 1
  fi
}

case "${1:-start}" in
  stop)    stop ;;
  restart) stop; start ;;
  *)       start ;;
esac
