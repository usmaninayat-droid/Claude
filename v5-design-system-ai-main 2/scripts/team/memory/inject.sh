#!/usr/bin/env bash
# SessionStart / tick memory injector — prints a compact state digest into context.
DS="${CLAUDE_PROJECT_DIR:-.}"; T="$DS/.claude/team"
echo "=== FAMS TEAM STATE ==="
echo "-- Top backlog --"; grep -m3 '^- \[ \]' "$T/workspace/backlog.md" 2>/dev/null | sed 's/^/  /'
echo "-- Open tickets --"; sed -n '/^## Open/,/^## In progress/p' "$T/workspace/tickets.md" 2>/dev/null | grep -v '^##' | grep -v '^(none)' | head -5 | sed 's/^/  /'
echo "-- Recent learnings --"; grep -m4 '^- ' "$T/memory/learnings.md" 2>/dev/null | sed 's/^/  /'
echo "=== read .claude/team/ before acting; append after. ==="
