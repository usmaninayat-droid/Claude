#!/usr/bin/env bash
# fams-sync.sh — save and back up the branch you're working on. Nothing else.
#
# Runs automatically on SessionStart (throttled to once per 6 hours) and on
# demand when someone says "sync". Its whole job is that work is never left
# only on one laptop.
#
#   1. save any uncommitted work as a WIP commit   (skip with --no-save)
#   2. push the current branch to GitHub
#
# It deliberately does NOT rebase, merge, or pull anything into your branch.
# Picking up the team's build is a decision someone makes on purpose — see
# fams-done.sh — not something that happens to you while you weren't looking.
# It never touches main or design-master, and always exits 0: a sync problem
# must never block a designer's session.
#
# Usage:  bash scripts/fams-sync.sh [--force] [--no-save] [--quiet]
#   --force     ignore the 6-hour throttle (this is what "sync" does)
#   --no-save   report uncommitted work instead of committing it
#   --quiet     print nothing when there was nothing to do
#
# Env:  FAMS_SYNC_INTERVAL  seconds between automatic runs (default 21600 = 6h)

set -uo pipefail

FORCE=0; SAVE=1; QUIET=0
for arg in "$@"; do
  case "$arg" in
    --force|-f)  FORCE=1 ;;
    --no-save)   SAVE=0 ;;
    --quiet|-q)  QUIET=1 ;;
    --help|-h)   sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "fams-sync: unknown option '$arg'" >&2; exit 0 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
note() { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  say "Sync skipped — this folder isn't a Git repository."; exit 0; }
cd "$ROOT" || exit 0
REPO=$(basename "$ROOT")

# ── refuse to act in a half-finished state ────────────────────────────────────
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
  say "⚠ $REPO: something is half-finished here (a merge or rebase). Ask the design lead before doing anything else."
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$BRANCH" = "HEAD" ]; then
  say "⚠ $REPO: you're not on a branch (detached HEAD). Ask the design lead."; exit 0
fi

# ── throttle ──────────────────────────────────────────────────────────────────
INTERVAL=${FAMS_SYNC_INTERVAL:-21600}
STAMP=.git/fams-sync-last            # inside .git, so it is never committed
NOW=$(date +%s)
if [ "$FORCE" -eq 0 ] && [ -f "$STAMP" ]; then
  LAST=$(cat "$STAMP" 2>/dev/null || echo 0)
  case "$LAST" in ''|*[!0-9]*) LAST=0 ;; esac
  if [ $((NOW - LAST)) -lt "$INTERVAL" ]; then
    note "$REPO: backed up $(( (NOW - LAST) / 3600 ))h ago — nothing to do."; exit 0
  fi
fi

ONLINE=1
git fetch --quiet --prune origin 2>/dev/null || ONLINE=0

# ── on a protected branch: report only, never modify ──────────────────────────
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "design-master" ]; then
  DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
  if [ "$DIRTY" -gt 0 ]; then
    say "⚠ $REPO: you're on $BRANCH with $DIRTY changed file(s) — and nobody works on $BRANCH."
    say "  Tell me which tenant and module this is, and I'll move it onto its own branch."
  else
    note "$REPO: on $BRANCH. Tell me what you're working on and I'll start a branch."
  fi
  echo "$NOW" > "$STAMP"; exit 0
fi

# ── 1. save ───────────────────────────────────────────────────────────────────
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
SAVED=0
if [ "$DIRTY" -gt 0 ]; then
  if [ "$SAVE" -eq 0 ]; then
    say "⚠ $REPO: $DIRTY file(s) not saved yet — sync stopped so nothing is disturbed."; exit 0
  fi
  git add -A >/dev/null 2>&1
  if git commit --quiet --no-verify \
      -m "wip($BRANCH): autosave $(date '+%Y-%m-%d %H:%M')" \
      -m "Saved automatically by fams-sync so nothing is left only on one laptop." >/dev/null 2>&1; then
    SAVED=$DIRTY
  else
    say "⚠ $REPO: couldn't save your $DIRTY changed file(s). Tell the design lead before continuing."; exit 0
  fi
fi

# ── 2. push ───────────────────────────────────────────────────────────────────
if [ "$ONLINE" -eq 0 ]; then
  [ "$SAVED" -gt 0 ] && say "$REPO · $BRANCH — saved $SAVED change(s) locally."
  say "⚠ $REPO: couldn't reach GitHub, so it isn't backed up yet. It will go up on the next sync."
  echo "$NOW" > "$STAMP"; exit 0
fi

PUSHED=0
if git rev-parse --abbrev-ref "@{upstream}" >/dev/null 2>&1; then
  AHEAD=$(git rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo 0)
  if [ "$AHEAD" -gt 0 ]; then
    if git push --quiet origin HEAD >/dev/null 2>&1; then PUSHED=$AHEAD
    else
      say "⚠ $REPO: couldn't back up $BRANCH — someone else may have pushed to it. Ask the design lead."
      echo "$NOW" > "$STAMP"; exit 0
    fi
  fi
else
  if git push --quiet -u origin HEAD >/dev/null 2>&1; then PUSHED=1
  else
    say "⚠ $REPO: couldn't publish $BRANCH to GitHub. Your work is saved locally. Tell the design lead."
    echo "$NOW" > "$STAMP"; exit 0
  fi
fi

echo "$NOW" > "$STAMP"

# ── report ────────────────────────────────────────────────────────────────────
PARTS=""
[ "$SAVED"  -gt 0 ] && PARTS="saved $SAVED change(s)"
[ "$PUSHED" -gt 0 ] && PARTS="${PARTS:+$PARTS, }backed up to GitHub"

if [ -n "$PARTS" ]; then
  say "$REPO · $BRANCH — $PARTS."
else
  note "$REPO · $BRANCH — already backed up."
fi

# Informational only: how far this branch has drifted from the team's build.
# Never acted on automatically — it just tells the designer it's time to decide.
if git show-ref --verify --quiet refs/remotes/origin/design-master; then
  BEHIND=$(git rev-list --count "HEAD..origin/design-master" 2>/dev/null || echo 0)
  if [ "$BEHIND" -ge 20 ]; then
    say "  The team's build has moved on quite a bit since you branched ($BEHIND changes)."
    say "  When this module is finished, say so and I'll fold it in."
  fi
fi
exit 0
