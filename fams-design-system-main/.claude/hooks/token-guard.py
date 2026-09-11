#!/usr/bin/env python3
"""Instant-feedback guard for fams-design-system (root CLAUDE.md rules 2 & 4).

PreToolUse on Write|Edit to packages/*/src/**/*.tsx: denies ADDED text that
contains hardcoded hex colors, physical-direction Tailwind utilities
(ml-/mr-/pl-/pr-/text-left/text-right), or arbitrary px/hex bracket values.
This is the edit-time twin of `pnpm lint:tokens` — it catches the violation
before it lands instead of at lint time. Stdlib only; fails open.
"""
import json
import os
import re
import sys

HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
PHYSICAL = re.compile(r"(?<![\w-])(?:m[lr]|p[lr])-(?:\d|\[)|(?<![\w-])text-(?:left|right)(?![\w-])")
ARBITRARY = re.compile(r"-\[\d+(?:\.\d+)?px\]|-\[#")

PKG_SRC = re.compile(r"packages/(?!tokens/)[^/]+/src/.+\.tsx$")


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return

    if payload.get("hook_event_name") != "PreToolUse":
        return
    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR", payload.get("cwd") or os.getcwd()))
    path = os.path.realpath(file_path) if file_path else ""
    if not path.startswith(root + os.sep):
        return
    rel = path[len(root) + 1 :]
    base = os.path.basename(rel)
    if not PKG_SRC.search(rel) or ".test." in base or ".stories." in base:
        return

    added = tool_input.get("content") or tool_input.get("new_string") or ""
    hits = []
    if HEX.search(added):
        hits.append(f"hardcoded hex color ({HEX.search(added).group(0)}) — use a token utility (bg-primary, text-foreground, ...); a new visual value is a new token in packages/tokens (rule 2)")
    if PHYSICAL.search(added):
        hits.append(f"physical-direction utility ({PHYSICAL.search(added).group(0).strip()}) — RTL-safe logical properties only: ms-/me-/ps-/pe-/text-start (rule 4)")
    if ARBITRARY.search(added):
        hits.append(f"arbitrary px/hex Tailwind value ({ARBITRARY.search(added).group(0)}) — use token-backed utilities/sizes (rule 2)")

    if hits:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    f"Blocked by root CLAUDE.md hard rules in {rel}: " + "; ".join(hits)
                    + ". Rewrite the change with tokens/logical properties (see the styling-change skill)."
                ),
            }
        }))


if __name__ == "__main__":
    main()
