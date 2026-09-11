---
name: setup-workspace
description: Use for first-time FAMS designer workspace setup — when slash commands like /figma-parity-loop are unknown or missing from autocomplete, when a user says "set up my workspace" / "prepare my FAMS workspace" / mentions they just cloned the repos, or when workspace-root .claude/skills symlinks are absent.
---

# Setup Workspace

Bootstrap a designer's FAMS workspace so the repo-shipped skills work as slash commands. **You run everything — never hand the user a terminal command.**

1. Locate the setup script relative to the CWD: `fams-design-system/scripts/setup-workspace.sh` (workspace root) or `scripts/setup-workspace.sh` (inside the repo). Run it with `bash`.
2. It symlinks all skills from `fams-design-system/.claude/skills/` into the workspace root's `.claude/skills/` and writes a workspace `CLAUDE.md` if missing. Idempotent — rerunning is always safe.
3. If it warns that `fams-v5-demo-environment` is missing, ask for the repo's location or clone it: `git clone https://github.com/voltro-dxb/fams-v5-demo-environment.git` next to `fams-design-system`.
4. Tell the user, in plain words: setup is done, **close this session and start a new Claude Code session in the workspace folder** (name the exact folder the script printed) — slash commands only appear in new sessions. Then they can type `/figma-parity-loop <figma-url>` plus any feedback in normal language.

If the user asked for something else (e.g. pasted a Figma URL) and setup was just a missing prerequisite: finish setup, then continue their actual request in THIS session by invoking the target skill via the Skill tool directly (skills work for you immediately; only typed slash commands need the new session).
