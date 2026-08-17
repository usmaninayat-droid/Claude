#!/usr/bin/env bash
# Append a learning after a loop:  retro-append.sh "the lesson"
DS="${CLAUDE_PROJECT_DIR:-.}"; L="$DS/.claude/team/memory/learnings.md"
[ -n "${1:-}" ] && printf -- "- %s\n" "$1" >> "$L" && echo "learning appended."
