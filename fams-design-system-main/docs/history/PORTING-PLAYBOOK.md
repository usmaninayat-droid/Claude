# PORTING PLAYBOOK — the shared contract for every port agent

> Historical working document from the initial port project (June–July 2026). Kept for provenance — not part of the living documentation.

> You are one of many agents porting components into this design system, working in parallel.
> This file is your **single source of truth**. Read it fully before doing anything.
> The orchestrator (Opus) assigned you exactly one component and will review your output against this contract.
> **Prime directive: quality and coherence over quantity.** We would rather ship 30 pristine components
> than 100 that turn this into the incoherent pile we already have from the design team. If in doubt, do less, cleaner.

---

## 0. What this task is (and is NOT)

There is a **reference** repo (`v5-design-system-ai`, cloned read-only) full of visually-nice components authored by
our design team. It is a **DESIGN REFERENCE ONLY.** We do **not** copy its code. Its React version, its libraries
(recharts, Leaflet, its Radix pins), its file layout — **all irrelevant.** What matters is its *visual & interaction
intent*: variants, states, spacing feel, affordances.

Your job: **re-implement that intent as a clean, beautiful, state-agnostic component in OUR stack and OUR architecture.**

- OUR stack wins, always: React 19 + `forwardRef`, Radix primitives, `cva` + `cn`, Tailwind v4 utilities backed by `@fams/tokens`, TypeScript strict, Vitest.
- If — and only if — you judge the reference's *approach* genuinely better than ours on some specific point, **do not silently adopt it**: FLAG it in your return envelope (`deviationsFlagged`) and follow our convention anyway. The orchestrator decides.

---

## 1. Read these four files first (verbatim — do not rely on this summary)

1. `CLAUDE.md` — the 11 hard rules + Definition of Done. Non-negotiable.
2. `docs/BOUNDARIES.md` — the L0–L4 layer model; what each layer may know; the 3-question test; anti-patterns with real cases.
3. `LIBRARIES.md` — the ONLY dependencies you may use. Adding any other dependency is forbidden.
4. This playbook.

Then open your **golden exemplar** (below) and match its structure, prop patterns, test shape, and demo exactly.

---

## 2. Golden exemplars — imitate the one that matches your layer

| Your layer | Study this file (+ its `.test.tsx` + its showcase section) |
|---|---|
| **L1 primitive** | `packages/ui-react/src/primitives/Button.tsx` (cva + forwardRef + asChild + deprecated-alias pattern) and `Select.tsx` (Radix-wrapped compound) |
| **L2 layout** | `packages/ui-react/src/layout/Stack.tsx` (semantic gap presets only) |
| **L3 composite** | `packages/ui-react/src/composites/Combobox.tsx` (behavior baked in, data via props) and `EmptyState.tsx` (simple state-display) |
| **L4 shell** | `packages/ui-react/src/shells/ProfileLayout.tsx` (chrome + slots, zero content) |
| **domain** | `packages/ui-react/src/domain/map/VehiclePopupCard.tsx` (Rule-10 exception, still token-only + presenter) |

Your component should look like it was written by the same hand that wrote the exemplar. Same import order, same JSDoc header style, same `data-slot` usage, same test skeleton.

---

## 3. The 11 hard rules, distilled (full text in CLAUDE.md — read it)

1. Open-source deps only, and **only** those already in `LIBRARIES.md` / `package.json`. No new deps.
2. **Tokens are the only source of visual values.** NEVER a raw hex, `px`, `rem`, or `rgb()` in a component. Use the Tailwind utilities in §4.
3. TypeScript strict. No `any`.
4. **RTL-safe always.** Logical properties only: `ms-`/`me-`/`ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`. NEVER `ml-`/`mr-`/`left-`/`right-`/`text-left`/`text-right`.
5. **A11y built-in.** Build on a Radix primitive for anything interactive; every interactive element is keyboard-operable and labelled. `eslint-plugin-jsx-a11y` is a real CI gate.
6. No per-tenant forks. One component; tenancy is tokens + `data-tenant` only.
7. No cross-framework imports.
8. **State-agnostic presenter.** Data + callbacks in via props. NO fetch, NO global store, NO routing, NO business logic inside the component. Memoizable; stable prop identities; virtualize anything that can be large.
9. **Layout owns spacing between components.** Inside a component, spacing comes from tokens. Never emit margins for a consumer to inherit.
10. **No business vocabulary in shared props.** `options`, `columns`, `renderItem`, `tone` — never `vehicleType`, `binStatus`, `isInspectorMode`. Variation goes through three axes: behavior→props, content→render slots, data→(app's problem, not yours).
11. Rule of three for admission — the orchestrator already applied this when assigning you; don't add speculative props "just in case."

**Sizes** are always `size="sm" | "md" | "lg"` (+ `"icon"` where a square icon button applies) — never numeric.
**State props:** native `disabled`; `loading` (spinner + disables) for async; `hasError` for invalid inputs. `isLoading`/`isDisabled` may exist ONLY as `@deprecated` aliases if the exemplar has them.

---

## 4. Token vocabulary — the ONLY visual values you may use

Use Tailwind utilities that resolve to these tokens. If you need a value with no token, **STOP and request it** in `tokensRequested` — do not invent one, do not hardcode.

- **Color (semantic):** `bg-background bg-card bg-muted bg-popover bg-primary bg-secondary bg-accent bg-destructive` and their `-foreground` pairs; `text-foreground text-muted-foreground text-primary` etc.; `border-border border-input`; `ring-ring`. Status: `bg-success bg-warning bg-info bg-destructive` (+ the `success/warning/error/info` numeric scales `-50…-900` when a subtle tint is needed). Surfaces: `bg-surface-primary bg-surface-secondary bg-surface-minimal bg-surface-low-contrast`.
- **Charts (if ever relevant):** `--color-chart-series-1…10` — but charts are OUT of scope for ports (ECharts phase, later).
- **Radius:** `rounded-sm rounded-md rounded-lg rounded-xl` (+ `rounded-full` for pills/avatars).
- **Type:** `text-h1…h6`, `text-body-xs…xl`, `text-caption`; weights `font-normal font-medium font-semibold font-bold`; family `font-sans`.
- **Shadow:** `shadow-sm md lg xl 2xl 3xl`, `shadow-elevation`.
- **Spacing scale:** `0 1 2 3 4 5 6 8 10 12 16` (via `p-` `gap-` `size-` etc.), plus the **semantic** `gap-field gap-section gap-inline` — but per Rule 9 semantic gaps belong to LAYOUT components, not arbitrary ones.

Never `style={{…}}` with literal values. Never a hex in a `.tsx` or in an SVG string.

---

## 5. Procedure (do these in order)

1. **Study the reference.** Read the assigned reference file(s) in `<REF_DIR>` (path in your assignment). Extract: purpose, every variant, every state (default/hover/focus/active/disabled/loading/error/empty/selected), sizing, and the interaction model. Ignore its code style entirely.
2. **Study the exemplar + any existing sibling.** Match conventions.
3. **Design the API** on the three-axes model. Minimal, presenter-only, business-vocabulary-free. Write the JSDoc header (see exemplar) including the `@usage-v5` block from step 6.
4. **Implement** `packages/ui-react/src/<layer>/<Name>.tsx`. One component family per file. `forwardRef`, extend the right native element props, `cva` for variants, `cn` for classes, Radix where interactive.
5. **Test** `packages/ui-react/src/<layer>/<Name>.test.tsx` — Vitest + Testing Library: renders, each variant/size applies, key states behave, keyboard interaction where relevant. Match the exemplar's test skeleton.
6. **Usage discovery** (see §6) — grep the real v5 app and record where/how this pattern is needed.
7. **Showcase demo** — create a STANDALONE new file `apps/showcase/src/demos/<Name>Demo.tsx` (default-export a React component) demonstrating every variant + size + key states + one `dir="rtl"` example. Import the component by relative path to its source file (the barrel won't export it yet). Do NOT edit any existing showcase page or `nav.ts`.
8. **Do NOT run `pnpm` / `vitest` / `tsc` / `eslint` / `git`.** You share this worktree with other agents running concurrently — running gates or git corrupts their in-flight state and yours. Self-check by READING your code against the DoD (§9); the orchestrator runs the authoritative gates serially. You create ONLY three files: `<Name>.tsx`, `<Name>.test.tsx`, `demos/<Name>Demo.tsx`. Fill the **return envelope** (§8) as your final message.

---

## 6. Usage-discovery protocol (this is what makes the DS *useful* to the team later)

The real requirements live in the existing Vue app. Read-only target:
`/Users/benjaminbraun/Development/v5/iwmp/v5-codebase` — the real component library is under
`src/frontend/packages/{shared,iwmp,fams,ead}/components` (NOT `src/frontend/components`, which is legacy/empty).

For your component, find where the equivalent pattern is used today (e.g. for a Badge: `q-badge`, status pills, chips; for a Timeline: activity/history lists). Use ripgrep, don't open everything.

Record findings in TWO places:

**(a) A `@usage-v5` JSDoc block in the component header:**
```ts
/**
 * Badge — compact status/label chip. [L1 primitive]
 *
 * @usage-v5
 *   Consolidates ~12 ad-hoc status indicators in v5:
 *   - packages/iwmp/components/bins/BinStatusPill.vue  (bin lifecycle status)
 *   - packages/shared/components/AssetProfile.vue       (q-badge for vehicle state)
 *   Forms needed: tone {neutral|info|success|warning|danger}, size {sm|md}, optional leading dot.
 * @usage-index badge
 */
```
Keep it factual and short (≤8 lines). If you find **zero** real usage, say so explicitly — that is a signal the component may not belong (flag it).

**(b) The `usageFindings` field of your return envelope** (structured — the orchestrator aggregates these into `docs/USAGE-INDEX.md`). Include file paths, the current mechanism, count of occurrences, and the prop-forms the real usages imply.

---

## 7. Showcase demo — your OWN new file only (never a shared page)

Create `apps/showcase/src/demos/<Name>Demo.tsx`: a new file you own, `export default function <Name>Demo()` that renders every variant + size + key states + one `dir="rtl"` example. Import the real component by relative path to its source (e.g. `import { Badge } from '../../../../packages/ui-react/src/primitives/Badge'`) since the barrel won't export it until the orchestrator wires it. Do NOT edit any existing showcase page (`Primitives.tsx`, `Overlays.tsx`, `Data.tsx`, …) or `nav.ts` — those are shared, serialized by the orchestrator. In your envelope `notes`, say which showcase page it belongs under.

---

## 8. Return envelope (your final message — JSON, nothing else after it)

```json
{
  "component": "Badge",
  "layer": "primitives",
  "status": "done | blocked | needs-decision",
  "filesCreated": ["packages/ui-react/src/primitives/Badge.tsx", "packages/ui-react/src/primitives/Badge.test.tsx"],
  "filesModified": ["apps/showcase/src/showcase/Tags.tsx"],
  "exportsToAdd": ["export { Badge, badgeVariants, type BadgeProps } from './primitives/Badge'"],
  "tokensRequested": [],
  "usageFindings": [
    {"file": "packages/iwmp/components/bins/BinStatusPill.vue", "mechanism": "q-badge", "occurrences": 3, "impliedProps": "tone, size, dot"}
  ],
  "deviationsFlagged": [],
  "dodSelfCheck": {
    "tokensOnly": true, "rtlSafe": true, "a11y": true, "stateAgnostic": true,
    "test": true, "showcase": true, "noBusinessVocab": true, "matchesExemplar": true
  },
  "notes": "one or two sentences, only if something non-obvious"
}
```

If `status` is `blocked` or `needs-decision`, explain precisely what you need. Never guess past a real ambiguity — escalate.

---

## 9. Definition of Done — the orchestrator runs these gates on your output

**You do NOT run these yourself (§5.8) — running them in the shared worktree interferes with parallel agents. The orchestrator runs them serially.** You self-check by reading. An output that fails ANY of these is bounced back (you get two attempts, then it escalates to the human):

- **typecheck:** `pnpm --filter @fams/ui-react typecheck` — clean.
- **test:** `pnpm --filter @fams/ui-react test` — your test green, nothing else broken.
- **lint / a11y:** `pnpm --filter @fams/ui-react lint` — clean (jsx-a11y gate).
- **token-lint:** no `#`-hex, no `px`/`rem` literals, no `rgb(`/`hsl(` in your `.tsx`.
- **RTL-lint:** no `ml-` `mr-` `pl-` `pr-` `left-` `right-` `text-left` `text-right` in your `.tsx`.
- **export present** in your envelope; **no edits** to `index.ts` / `nav.ts` / token files.
- **matches exemplar** structurally; **state-agnostic** (no fetch/store/route/business logic); **showcase demo** covers variants + RTL.

---

## 10. Hard prohibitions (instant bounce)

- ❌ Editing `packages/ui-react/src/index.ts` (orchestrator serializes the barrel).
- ❌ Editing `apps/showcase/src/nav.ts` (orchestrator owns nav).
- ❌ Editing any file under `packages/tokens/` (request tokens instead).
- ❌ Touching `FileUploader.tsx` / any file-upload component (another agent owns it).
- ❌ Adding a dependency.
- ❌ Copying reference code, or importing recharts/Leaflet/anything not in `LIBRARIES.md`.
- ❌ Committing, staging, running git, or starting a dev server.
- ❌ Running `pnpm` / `vitest` / `tsc` / `eslint` (the orchestrator runs gates — you'd corrupt parallel agents' state).
- ❌ Editing any existing showcase page (`Primitives.tsx`, `Overlays.tsx`, …) — create your own `demos/<Name>Demo.tsx`.
- ❌ Editing another component's files. Stay in your lane — you own exactly your three files.
