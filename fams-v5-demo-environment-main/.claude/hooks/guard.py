#!/usr/bin/env python3
"""Rule-zero guard for fams-v5-demo-environment (see CLAUDE.md).

PreToolUse  (Write|Edit): deny NEW source files under app/ — components/styles
            belong in ../fams-design-system, never here.
PostToolUse (Write|Edit): after edits to resolved/ or core/, remind the agent of
            the mandatory follow-up commands (capture/resolve + check).
Stdlib only; fails open on unexpected input (never blocks unrelated work).
"""
import json
import os
import sys


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return  # fail open

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    if not file_path:
        return

    project = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR", project))
    path = os.path.realpath(file_path)
    if not path.startswith(root + os.sep):
        return
    rel = path[len(root) + 1 :]
    event = payload.get("hook_event_name", "")

    if event == "PreToolUse":
        new_file = not os.path.exists(path)
        src_ext = os.path.splitext(rel)[1] in {".tsx", ".jsx", ".css", ".scss", ".vue"}
        is_test = ".test." in os.path.basename(rel) or "/e2e/" in rel
        if rel.startswith("app/") and new_file and src_ext and not is_test:
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        "Rule zero (CLAUDE.md): the demo environment contains NO custom "
                        "components or styling. Create the component in "
                        "../fams-design-system (skill: new-component / styling-change), "
                        "rebuild it (pnpm --filter <pkg> build), then wire it here by "
                        "editing an EXISTING seam file (app/src/demo/). Refused: " + rel
                    ),
                }
            }))
        return

    if event == "PostToolUse":
        msg = None
        if rel.startswith("resolved/"):
            parts = rel.split("/")
            tenant = parts[1] if len(parts) > 2 else "<t>"
            msg = (
                f"You edited {rel}. Mandatory next steps (CLAUDE.md primary path): "
                f"`pnpm demo capture {tenant}` to canonicalize into typed ops, then "
                f"`pnpm demo check`. Also verify the change is VISIBLE in the running "
                f"app (:6300?tenant={tenant}) — fields must be placed AND in systemColumns."
            )
        elif rel.startswith("core/"):
            msg = (
                f"You edited {rel} (shared across ALL tenants). Mandatory: "
                "`pnpm demo resolve --all` then `pnpm demo check`, and review the "
                "inheritance diff in every tenant's resolved/. Never use core/ to "
                "customize a single tenant."
            )
        elif rel.startswith("tenants/") and rel.endswith(".ops.json"):
            t = rel.split("/")[1]
            msg = (
                f"You edited delta ops for tenant '{t}'. Mandatory: "
                f"`pnpm demo resolve {t}` then `pnpm demo check`. Ops must reference "
                "stable ids only, and new fields need placements + systemColumns to render."
            )
        if msg:
            print(msg, file=sys.stderr)
            sys.exit(2)  # exit 2 feeds the reminder back to the agent


if __name__ == "__main__":
    main()
