# UI designer (Ravi) persona notes — lessons learned

- Entity Configuration (settings/entity-configuration.tsx + entity-config-sheet.tsx,
  reviewed 2026-07-10 vs Figma 01-8765/12-7931/02-7343/07-7743/08-8521/09-8604/10-8606):
  when a Figma frame shows a designed hierarchy affordance (elbow/connector guide
  lines for a nested tree — frame 12-7931), grep the component for whether it's
  actually drawing lines or just faking depth with `padding-left` + a tint band.
  Padding-only indent reads fine at 1 level but degrades at 2+ levels (Asset →
  Vehicle → Engine) — always check the deepest nesting example in the frame set,
  not just the shallow one, before calling indentation "close enough."
- Icon-well tiles (icon inside a `rounded-lg bg-secondary text-primary` square,
  e.g. `application-management.tsx:68`, `record-detail.tsx:50`) are an established
  DS convention Figma uses on every row/card icon. When a new component renders
  a bare `<Icon className="text-primary" />` with no tile container, that's a
  parity gap even though "just an icon" feels minor — check 2-3 sibling Settings
  components for the icon-container pattern before approving a bare icon as
  intentional simplification.
- "Recommended"/status-flavoured badges must map to the semantic ramp that matches
  their meaning (success = green ramp), not `bg-primary/10` by default just because
  primary is the easiest color at hand. The DS's own `Badge` primitive already
  ships a `success` variant (`badge.tsx:26`) — grep for it and reuse before
  hand-rolling a one-off `<span className="bg-primary/10 ...">` inline pill;
  otherwise you get a same-color-as-everything-else badge that loses meaning
  next to the frame's distinctly-colored one.
- When a frame's "empty preview" state is actually a schematic diagram (numbered
  position dots 1-5 mapped onto a mini card silhouette, showing WHERE fields will
  land, independent of whether any are linked yet) and the build instead swaps in
  a live data-filled mock or a plain instructional sentence, don't wave it through
  as "same idea, different execution" — flag the loss of the structural map
  explicitly; it's real information the frame conveys that prose alone doesn't.
  Also flag (don't silently fix) any "helpful" divergence like a tinted/highlighted
  card for an enabled toggle that the frame renders uniformly — it may be a
  legitimate improvement, but it's a parity call for product/tech-lead, not
  something to wave through as equivalent.

## 2026-07-14 — typography-weight consistency lens (client escalation, T-086)
Client caught agents shipping invented shouting-typography: a status-transition action button in large
bold UPPERCASE tracking-wide next to a small status chip, and bold-caps actor prefixes (SYSTEM/PAYROLL)
breaking an otherwise even timeline. MANDATORY review check from now on: scan every surface for
weight/size/case JUMPS between adjacent elements that hierarchy doesn't justify. New controls NEVER
invent a type treatment — they reuse the DS scale (Button/Badge/chip/feed typography). Established
caps idioms (THEAD headers, popup section labels, KPI labels) are fine; one-off uppercase+tracking+bold
on actions/values/feed rows is the defect. Adjacent-pair test: screenshot the element WITH its neighbor —
if one shouts, fail it.
