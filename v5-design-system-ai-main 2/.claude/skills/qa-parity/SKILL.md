---
name: qa-parity
description: QA design-parity + test-case generation. Use to compare a built screen against its design (Figma frame vs live screenshot) and to derive test cases from the spec + team learnings. In DS mode compares implementation to the Figma snapshot in depth; in product mode verifies the product consumes the DS correctly and matches the design.
allowed-tools: Bash, Read, Grep, Glob
---
# qa-parity (gates G4 functional + G2 parity)

## Test cases (G4)
Derive from: the spec's acceptance criteria + `.claude/team/knowledge/ux-rules.md`
+ `.claude/team/memory/defect-log.md` (past misses). Cover every interactive state:
default · hover · focus · active · disabled · loading · empty · error. One row per case
with expected result.

## Parity (G2) — design vs implementation
1. Get the design: Figma frame screenshot (Figma MCP) at a readable size.
2. Get the build: **use the parity screenshotter — deterministic, WebGL-capable, not the
   flaky live preview:** `node scripts/team/parity/shoot.mjs <url> <out.png> [--wait <sel>] [--delay ms]`.
   It drives the local Chrome/Edge headless with software WebGL, so it captures normal
   screens AND MapLibre/canvas maps (the live-preview MCP times out on those). Start a
   dev server first (`pnpm dev`, port 5180) or shoot `pnpm preview` of the build.
3. Diff in depth: layout, spacing, tokens/colours, typography, states, behaviours
   (drag, filter, tab-switch, transitions).
4. **Product mode:** also confirm the product uses DS components (no bespoke
   re-implementations) and honours coherence.
5. Log each miss as a `defect` ticket assigned to `tech-lead`; **do not edit code**.

Emit the standard `verdict` block (see agents/qa.md). Append lessons to
`persona-notes/qa.md` and recurring classes to `defect-log.md`.
