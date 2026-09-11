#!/usr/bin/env bash
# Designer workspace bootstrap — run BY CLAUDE, not by hand.
#
# Claude Code only registers slash commands from the .claude/skills/ of the
# folder the session is OPENED in. Designers open Claude Code in the parent
# workspace folder (the one containing fams-design-system and
# fams-v5-demo-environment side by side), so this script:
#   1. symlinks every skill shipped in this repo into <workspace>/.claude/skills/
#   2. writes a workspace-level CLAUDE.md (if none exists) so future sessions
#      know what this workspace is and which slash commands exist
# Idempotent — safe to run any number of times.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_name="$(basename "$repo_root")"
ws_root="$(dirname "$repo_root")"

echo "Workspace root: $ws_root"

if [ ! -d "$ws_root/fams-v5-demo-environment" ]; then
  echo "WARNING: ./fams-v5-demo-environment not found next to $repo_name."
  echo "         Clone it into $ws_root — the parity loop needs both repos."
fi

mkdir -p "$ws_root/.claude/skills"
linked=""
for skill_dir in "$repo_root"/.claude/skills/*/; do
  name="$(basename "$skill_dir")"
  ln -sfn "../../$repo_name/.claude/skills/$name" "$ws_root/.claude/skills/$name"
  linked="$linked /$name"
  echo "  linked /$name"
done

if [ ! -f "$ws_root/CLAUDE.md" ]; then
  cat > "$ws_root/CLAUDE.md" <<EOF
# FAMS Design Workspace

This folder holds the FAMS design-system workspace: \`./fams-design-system\`
(tokens + React component library) and \`./fams-v5-demo-environment\`
(metadata-only demo app on :6300). Run docs live in \`./plan/\`.

Both repos present as siblings means the demo environment runs in **link
mode**: it consumes your local design system, and \`pnpm dev\` (from
\`./fams-v5-demo-environment\`) builds it and clears the Vite cache before
starting the app on :6300. Never start the app with \`pnpm --filter app dev\`
here — skipping the build is why a component edit appears to do nothing.

Someone who has ONLY \`./fams-v5-demo-environment\` gets **registry mode**
instead: installed, read-only packages, so component changes are a request for
the design-system owner rather than work to do. Details in that repo's
CLAUDE.md under *Design-system consumption*. Design-system-editing workflows
(\`/figma-parity-loop\`) hard-stop outside link mode.

Available slash commands (skills shipped in fams-design-system):$linked

For Figma work, designers paste Figma URLs to \`/figma-parity-loop\` — it runs
the whole compare→implement→verify loop autonomously, always dispatched to a
background subagent.

SELF-HEALING RULE: if a user message contains a slash command that the harness
reports as unknown (e.g. "/figma-parity-loop <url>"), treat it as an invocation
of the same-named skill in \`fams-design-system/.claude/skills/\` — run
\`bash fams-design-system/scripts/setup-workspace.sh\` yourself (idempotent),
then read that skill and execute the user's request in this session. Never
tell the user to run setup themselves.
EOF
  echo "  wrote $ws_root/CLAUDE.md"
else
  echo "  CLAUDE.md already present at workspace root — left untouched."
fi

echo ""
echo "Setup complete. IMPORTANT: slash commands appear in NEW sessions only —"
echo "tell the user to start a fresh Claude Code session in: $ws_root"
