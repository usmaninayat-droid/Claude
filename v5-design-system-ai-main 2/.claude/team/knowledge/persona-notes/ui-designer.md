# UI Designer (Ravi) — persona notes

> Lessons harvested from visual-fidelity reviews. Read before every G2 pass.

## Method that worked (User Accounts review, 2026-07-10)
- Flattened Figma PNG exports are NOT reliable for absolute px measurements
  (different frame widths, canvas-fill quirks — e.g. a frame's "card" bg and
  "page" bg can export as literally identical RGB even when the live app
  correctly uses two different tokens). Prefer **ratios within the same
  image** (e.g. avatar-diameter : row-height) over cross-image absolute px,
  and prefer **code-level precedent** (an existing, already-shipped sibling
  component's documented spec) over pixel-peeping a single frame.
- Before flagging a "deviation," grep the codebase for the same visual pattern
  elsewhere (e.g. `uppercase tracking-wide`, `rounded-full` icon wells). If
  the build's treatment matches an established, already-reviewed DS
  convention used across many other modules, that convention wins over one
  frame's literal (possibly unfinished/placeholder) treatment — don't flag it.
  Conversely, if a frame's treatment repeats **consistently across multiple
  instances/frames** (not just one), that's strong signal of true intent even
  if it contradicts a component's default props.
- Watch for one frame instance that got "real" treatment (icon, fill) while
  its siblings in the same row are unconfigured Figma placeholders (blank
  outline circles) — use the *finished* instance as ground truth, not the
  unfinished ones.
- A single documented, purpose-built primitive (e.g. `KpiTile` — "used at the
  top of every dashboard, asset profile, settings dashboard") is stronger
  evidence than my own read of the frame: if a new module hand-rolls its own
  version of a pattern that already has a named, documented component,
  that's the finding — reuse, don't reimplement.
- Known false trails: Unicode flag emoji (🇦🇪) can render as plain "AE" text
  on Windows/Chrome even when the code is correct (single unified bordered
  field with an internal divider) — check the JSX structure before assuming
  a layout defect from a screenshot; it may be an OS font-rendering gap, not
  a code bug. Nit it, don't blocker it.

## Recurring defect classes to check every time
1. Badge/pill **fill treatment**: solid-fill (status, color+white text) vs
   soft-tint (15% color-mix bg + colored text) vs outline (colored border,
   transparent/white bg) are three distinct, easily-confused variants. Check
   which one the frame actually uses per-context (status column vs role
   column vs tag chips) — don't assume one variant serves all contexts.
2. **List-value chips**: when a field is a list of short values (app names,
   tags), check whether the frame chunks them into individual bordered pills
   vs a plain `join(' · ')` text string. The latter is much cheaper to build
   and easy to ship by mistake.
3. **Row/table density**: compare avatar-diameter : row-height ratio, not
   absolute px. Generous `py-3`+`gap-3` cell padding is a common
   over-spacious mistake vs a denser frame.
4. Numeric KPI/stat sizing: check for a sibling `Kpi*`/`IconBadge` primitive
   before accepting a bespoke number size — reuse over reinvention is itself
   the coherence law.

## Method that worked (Preferences + Subscriptions review, 2026-07-10)
- Pixel-scanning is worth the cost when a called-out defect class is quantitative
  (row density, control height). `PIL`-only (no numpy) column/row-band detection
  on a **text column** (not a border/switch column — those produce false-positive
  lines from anti-aliased track edges) gives a reliable row-height in px; compare
  the *ratio* after scaling by frame-width, not raw px, since Figma export width
  and live screenshot width differ.
- A component that is *correct* in one context can be *misused* in another: here
  `LabeledSelect` (h-14, floating caption) is the right call for a settings-form
  field (Preferences) but wrong for a filter-bar control sitting next to a
  bespoke `h-9` pill button (`RoleFilter`) — same file, same row, mismatched
  height. Check every call site of a shared primitive, not just "does the
  primitive itself look right."
- Cross-frame corroboration matters most for *state* claims, not just static
  layout: a segmented control's "active" fill was checked across **two**
  Figma frames (org-3222 zero-state + org-3573 bulk-selected state) and both
  showed the *same* flat neutral fill for every active option regardless of
  level (Off/On/Mandatory) — no blue-vs-dark distinction. One frame could be
  an unfinished placeholder; two independent frames agreeing is strong intent
  evidence, even against a "sensible" richer treatment already in the code.
- When a build adds a genuinely useful state distinction the frame doesn't
  show (e.g. colour-coding On vs Mandatory for scannability), report it as a
  *deviation from spec* rather than silently accepting or silently blocking —
  let tech-lead decide with product whether it's an intentional improvement
  or drift, since Ravi's mandate is parity-to-frame, not UX judgment calls.
- A hover-reveal affordance (row action menu only visible on `:hover`, as
  already established via `application-management.tsx`'s `group` +
  `opacity-0 group-hover:opacity-100` pattern) is easy to miss when a sibling
  component renders the same trigger unconditionally-visible — check the
  Figma export for a mouse cursor + the affordance appearing on exactly one
  row as a tell that it's hover-gated, not "every row should show this."
