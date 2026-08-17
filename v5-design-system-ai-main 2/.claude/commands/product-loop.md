---
description: Loop B — build/extend a product FROM the design system in the Code folder. Same team + gates. Never writes inside the DS (except a classified backport).
argument-hint: "\"<product>\" [figma-url]"
---
Run **Loop B (build a product)** via the `team-loop` skill. Product: **$1** · Design: **$2**

1. `po-analyst` → spec (modules/entities/views; brand = FAMS default) (G1). `figma-to-spec` if `$2`.
2. `frontend-eng` scaffolds/edits in `D:\Claude Projects\Code\<slug>\`, consuming the DS via `@ds`
   (follow `docs/PRODUCT-BUILD-PROTOCOL.md`). NEVER write inside the DS folder.
3. Gates: build (G6) + coherence (G3) + "no files written under the DS" + `qa` (G4/G2 — QA ALWAYS
   references the design + the linked DS) + `a11y` (G5).
4. **Backport check:** if a needed fix is DS-level (not product-specific), `tech-lead` raises a
   `backport` ticket → Conductor runs a scoped `/evolve-ds` on the DS → product consumes the fix.
5. Route defects, cap 3, retro, log, summarize.
