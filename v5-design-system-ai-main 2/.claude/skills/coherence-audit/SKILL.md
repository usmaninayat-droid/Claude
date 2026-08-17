---
name: coherence-audit
description: Audit a DS or product against the 6 coherence laws — token-only styling (no raw hex in components), no products written inside the DS, config-driven modules. Use before any gate/sign-off, when reviewing a change, or when the conductor runs G3. Wraps scripts/team/gates/coherence.mjs and explains how to triage results.
allowed-tools: Bash, Read, Grep
---
# coherence-audit (gate G3)

Deterministic, token-free. The team's cheapest quality gate.

## Run
```
node scripts/team/gates/coherence.mjs .
```
Exit 0 = PASS, 1 = FAIL (prints `hex …file:line` and `leak …` rows).

## Triage (Tech Lead)
For each `hex` hit decide:
- **Real violation** → replace the hex with the mapped token
  (`#FFFFFF`→`var(--primary-foreground)` / `var(--card)`, status hexes→`--status-*`, etc.).
- **Legitimate colour source** (a `STATUS_COLORS`/`PRIORITY_CONFIG` map that IS the
  token bridge, or an SVG data-URI, or a documented prop default) → mark it with a
  trailing `// coherence-allow: <reason>` comment; the gate then skips that line.
- **False-positive class** → add the pattern to the allowlist and record it in
  `defect-log.md` so the gate learns.

## Laws checked
1. token-only (no raw hex in `src/components`)  2. no product dirs inside the DS.
Extend this script as new deterministic laws are found (that's the team adapting).
