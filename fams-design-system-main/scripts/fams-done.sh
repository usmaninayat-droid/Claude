#!/usr/bin/env bash
# fams-done.sh — fold a finished module into the design team's build.
#
# This is the ONLY thing that writes to design-master, and it only ever runs
# because a designer said the work is finished. There are no pull requests:
# three designers cannot meaningfully review each other's blueprint diffs, and
# routing everything through one person makes that person the bottleneck. The
# review that matters is a human promoting design-master to main — looking at a
# running build, visually, which is a thing designers can actually do.
#
#   0. run this repo's own gates — finished means verified, not just written
#   1. save and back up the current branch          (fams-sync.sh)
#   2. bring the team's build into the branch, so any overlap surfaces HERE
#      where only your own work is at risk — never on design-master
#   3. merge the branch into design-master and push
#   4. leave the branch in place (it is the record of the work)
#
# On any conflict it stops and leaves both the branch and design-master exactly
# as they were. design-master is never left half-merged.
#
# Usage:  bash scripts/fams-done.sh [--check] [--skip-gates]
#   --check        say what would happen, change nothing
#   --skip-gates   fold in without running the checks (say why, out loud)

set -uo pipefail

CHECK=0; GATES=1
for arg in "$@"; do
  case "$arg" in
    --check|-n)   CHECK=1 ;;
    --skip-gates) GATES=0 ;;
    --help|-h)  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "fams-done: unknown option '$arg'" >&2; exit 1 ;;
  esac
done

say() { printf '%s\n' "$*"; }
HERE=$(cd "$(dirname "$0")" && pwd)

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { say "Not a Git repository."; exit 1; }
cd "$ROOT" || exit 1
REPO=$(basename "$ROOT")

if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
  say "⚠ $REPO: something is half-finished here. Ask the design lead before doing anything else."; exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$BRANCH" in
  main|design-master|HEAD)
    say "⚠ You're on $BRANCH, which isn't anybody's work branch — there's nothing to finish here."
    exit 1 ;;
esac

git fetch --quiet --prune origin 2>/dev/null || { say "⚠ Can't reach GitHub. Try again when you're back online."; exit 1; }
git show-ref --verify --quiet refs/remotes/origin/design-master || {
  say "⚠ design-master doesn't exist on GitHub yet. Ask the design lead to create it."; exit 1; }

AHEAD=$(git rev-list --count "origin/design-master..HEAD")
BEHIND=$(git rev-list --count "HEAD..origin/design-master")
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')

if [ "$CHECK" -eq 1 ]; then
  say "$REPO · $BRANCH"
  say "  unsaved files:            $DIRTY"
  say "  your changes to fold in:  $AHEAD"
  say "  team changes to pick up:  $BEHIND"
  [ "$AHEAD" -eq 0 ] && [ "$DIRTY" -eq 0 ] \
    && say "  → nothing to fold in; this work is already in the team's build." \
    || say "  → would save, pick up the team's build, then fold this into design-master."
  exit 0
fi

# ── 0. gates ──────────────────────────────────────────────────────────────────
# "Finished" has to mean verified. Whatever reaches design-master reaches every
# designer on their next pick-up, so a broken blueprint would spread silently.
if [ "$GATES" -eq 1 ]; then
  GATE=""
  if   [ -f package.json ] && grep -q '"demo"' package.json 2>/dev/null; then GATE="pnpm demo check"
  elif [ -f package.json ] && grep -q '"lint:tokens"' package.json 2>/dev/null; then GATE="pnpm lint:tokens"
  fi
  if [ -n "$GATE" ]; then
    say "Checking the work before folding it in — $GATE"
    if ! $GATE >/tmp/fams-done-gate.$$ 2>&1; then
      say "⚠ $REPO: the checks didn't pass, so nothing was folded in and the team's build is untouched."
      say "  Your work is saved and backed up on $BRANCH. The last few lines:"
      tail -8 /tmp/fams-done-gate.$$ | sed 's/^/    /'
      rm -f /tmp/fams-done-gate.$$
      say "  Fix it and say \"done\" again, or ask the design lead."
      exit 1
    fi
    rm -f /tmp/fams-done-gate.$$
  fi
fi

# ── 1. save + back up ─────────────────────────────────────────────────────────
bash "$HERE/fams-sync.sh" --force --quiet
AHEAD=$(git rev-list --count "origin/design-master..HEAD")
if [ "$AHEAD" -eq 0 ]; then
  say "$REPO · $BRANCH — nothing new to fold in; it's already in the team's build."; exit 0
fi

# ── 2. pick up the team's build INTO the branch first ─────────────────────────
# Any overlap surfaces here, on the designer's own branch, where the worst case
# is their own work. design-master is never the place a conflict is discovered.
if [ "$BEHIND" -gt 0 ]; then
  if ! git merge --quiet --no-edit origin/design-master >/dev/null 2>&1; then
    git merge --abort >/dev/null 2>&1
    say "⚠ $REPO: your work and the team's build changed the same thing, so I stopped."
    say "  Nothing is lost and nothing has moved — your branch is exactly as it was."
    say "  Ask the design lead to sort out the overlap, and mention: $BRANCH"
    exit 1
  fi
  say "$REPO · $BRANCH — picked up $BEHIND change(s) from the team."
fi

# ── 3. merge into design-master ───────────────────────────────────────────────
TIP=$(git rev-parse HEAD)
git push --quiet origin HEAD >/dev/null 2>&1 || true

TMP=$(mktemp -d)
if ! git worktree add --quiet "$TMP" -b "_done-$$" origin/design-master >/dev/null 2>&1; then
  say "⚠ $REPO: couldn't prepare the merge. Tell the design lead."; rm -rf "$TMP"; exit 1
fi

FAILED=0
(
  cd "$TMP" || exit 1
  git merge --no-ff --no-edit -m "merge($BRANCH): finished work" "$TIP" >/dev/null 2>&1 || exit 1
  git push --quiet origin "HEAD:design-master" >/dev/null 2>&1 || exit 2
) || FAILED=$?

git worktree remove --force "$TMP" >/dev/null 2>&1
git branch -D "_done-$$" >/dev/null 2>&1
rm -rf "$TMP"

case "$FAILED" in
  0) ;;
  2) say "⚠ $REPO: someone else updated the team's build a second ago. Nothing was changed — just say \"done\" again."; exit 1 ;;
  *) say "⚠ $REPO: couldn't fold this in, and design-master was left untouched. Tell the design lead — branch: $BRANCH"; exit 1 ;;
esac

git fetch --quiet origin 2>/dev/null || true
say "$REPO · $BRANCH — folded into the team's build. Everyone gets it on their next sync."
say "  The branch stays as the record of this work. It reaches main when the build demos clean."
exit 0
