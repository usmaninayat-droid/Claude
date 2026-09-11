#!/usr/bin/env bash
# Durable FAMS demo environment — the FULL host (:6300) with the Shift
# Rostering screen embedded, plus the screen's own dev server (:6395).
#
# WHY: the app's preview manager stops these on idle, and when you're out of
# usage hours you can't ask Claude to restart them. This runs the SAME two dev
# servers as plain detached OS processes (nohup), so nothing the app does can
# stop them. They behave exactly like the managed demo, just durable.
#
# USE:
#   ./serve-demo.sh            # start both (frees the ports first)
#   ./serve-demo.sh stop       # stop both
#   ./serve-demo.sh restart    # stop then start
#
# Then open:  http://localhost:6300/shift-rostering?tenant=iwmp&persona=u_admin

set -uo pipefail
PNPM=/opt/homebrew/bin/pnpm
ROOT=/Users/usmaninayat/Documents/GitHub/Claude/fams-v5-demo-environment-main
SCREEN="$ROOT/tenants/iwmp/overrides/screens/shift-rostering"
HOST_PORT=6300
SCREEN_PORT=6395
HOST_LOG=/tmp/fams-demo-host.log
SCREEN_LOG=/tmp/fams-demo-screen.log
URL="http://localhost:${HOST_PORT}/shift-rostering?tenant=iwmp&persona=u_admin"

listening() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null; }

free_port() {
  local pids; pids="$(listening "$1")"
  if [ -n "$pids" ]; then echo "$pids" | xargs kill 2>/dev/null || true; sleep 1; fi
}

wait_up() { # port, seconds
  local p="$1" secs="$2" i=0
  while [ "$i" -lt "$secs" ]; do
    if curl -s -o /dev/null "http://127.0.0.1:$p/"; then return 0; fi
    sleep 1; i=$((i+1))
  done
  return 1
}

stop() {
  free_port "$SCREEN_PORT"; free_port "$HOST_PORT"
  echo "stopped demo servers (:$HOST_PORT, :$SCREEN_PORT)"
}

start() {
  # Free whatever holds the ports (app-managed instances included) so our
  # detached processes own them.
  free_port "$SCREEN_PORT"; free_port "$HOST_PORT"

  nohup "$PNPM" --dir "$SCREEN" dev > "$SCREEN_LOG" 2>&1 &
  nohup "$PNPM" --dir "$ROOT"   dev > "$HOST_LOG"   2>&1 &

  echo "booting screen (:$SCREEN_PORT) and host (:$HOST_PORT) — Vite takes a few seconds…"
  if wait_up "$SCREEN_PORT" 40 && wait_up "$HOST_PORT" 40; then
    echo "demo up → $URL"
  else
    echo "one server did not come up — check $HOST_LOG / $SCREEN_LOG"; exit 1
  fi
}

case "${1:-start}" in
  stop)    stop ;;
  restart) stop; start ;;
  *)       start ;;
esac
