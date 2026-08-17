# StateTransitionToolbar — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/components/ticket-detail.tsx` (toolbar above the body)
- Figma: Web Portal `29893:13664` (Maintenance detail), Launch Pad `345:1913` (Lead detail)
- Walkthrough: `knowledge-base/product-context/24-state-transition-toolbar.md`

## Purpose

Top-right of every Pipeline Detail body. Combines:

1. **Current-state pill** — the active stage (uses `StatePill` primitive)
2. **Next-state action buttons** — one button per legal transition
3. **Collapse chevron** (optional) — toggles the right-rail timeline

```
[CURRENT-STATE-PILL]  [TRANSITION-BUTTON]  [TRANSITION-BUTTON]  [>>]
```

## Transitions — two derivation modes

### Mode 1 — explicit `nextStates` (recommended)

```json
{
  "stages": [
    {
      "id": "reported-issues",
      "label": "Reported Issues",
      "color": "#8B6439",
      "nextStates": ["scheduled", "invalid"]
    }
  ],
  "transitions": {
    "reported-issues→scheduled": { "actionLabel": "Schedule" },
    "reported-issues→invalid": { "actionLabel": "Mark Invalid", "variant": "destructive" }
  }
}
```

Use this when the workflow has branching transitions (e.g. Approve / Reject,
Schedule / Invalid).

### Mode 2 — `getForwardTransitions()` helper

```ts
import { getForwardTransitions } from '@fams-v5/ui/data-display';

const transitions = getForwardTransitions(stages, currentStage.id);
// All later stages, in order. Truemax linear forward-flow.
```

Use this when the workflow is purely linear (no branching).

## Button styling

> **T-086 revision:** the action buttons previously copied `StatePill`'s
> small-caps tracked treatment (`font-bold uppercase tracking-wider`,
> matching hard constraint #4 below in its pre-T-086 form). A client review
> flagged the result as "shouting next to the small status chip" — two
> different UI roles (a STATUS label vs. an ACTION button) were sharing one
> heavy typographic treatment. Action labels now use standard DS action
> typography (`text-body-sm font-medium`, sentence case) — the SAME scale
> as the `Button` primitive — while `StatePill` keeps its uppercase/tracked
> idiom unchanged. Callers must pass sentence-case `actionLabel`s ("Approve",
> not "APPROVE") — `getForwardTransitions()` was updated to stop
> `.toUpperCase()`-ing derived labels.

```css
.transition-button {
  height: 28px;
  padding: 0 14px;
  font: 500 14px/1 'Gilroy', sans-serif;
  border-radius: 6px;
  border: 1px solid;
}

/* Variants */
.outline    { background: var(--card);        color: var(--muted-foreground);    border-color: var(--border); }
.primary    { background: var(--primary);     color: var(--primary-foreground);  border-color: var(--primary); }
.destructive{ background: var(--destructive); color: var(--destructive-foreground); border-color: var(--destructive); }

/* Hover (outline default) */
.outline:hover { border-color: var(--foreground); color: var(--foreground); }
```

Default variant is `outline`. Use `primary` for the most-common action,
`destructive` for irreversible / negative transitions.

## Props

```ts
interface StateTransitionToolbarProps {
  currentStage: {
    id: string;
    label: string;
    color: string;
    textColor?: string;
  };
  transitions: StateTransitionTransition[];
  onTransition?: (toStageId: string, note?: string) => void | Promise<void>;
  onCollapse?: () => void;
  className?: string;
}

interface StateTransitionTransition {
  toStageId: string;
  actionLabel: string;
  confirmMessage?: string;
  variant?: 'outline' | 'primary' | 'destructive';
  /** T-102 — set to require a short note/reason before this transition
   *  fires (e.g. "Reason for rejection"). */
  noteLabel?: string;
}
```

## Optional note/reason capture (T-102)

A transition can opt into a note-capture dialog by setting `noteLabel` (e.g.
`"Reason for rejection"`). This is **additive and backward-compatible** —
transitions that omit `noteLabel` behave exactly as before (no dialog,
`onTransition(toStageId)` fires immediately with `note` simply absent).

```ts
{
  toStageId: 'invalid',
  actionLabel: 'Mark Invalid',
  variant: 'destructive',
  noteLabel: 'Reason for rejection',
  confirmMessage: 'Add a note for the record timeline.',
}
```

When a transition with `noteLabel` is clicked, the toolbar opens **its own**
confirm dialog (reusing the DS `Dialog` + `Textarea` + `Button` primitives —
no bespoke modal, no product-level dialog needed):

- `DialogTitle` = the transition's `actionLabel`
- `DialogDescription` = `confirmMessage` (falls back to a generic "optional"
  hint if omitted)
- `Textarea` — `placeholder` = `noteLabel`; the note is optional to the user
  (blank submit is allowed)
- `DialogFooter` — Cancel (`tertiary`) + a confirm button (`destructive`
  variant matches the transition's `variant`, otherwise `primary`) labelled
  with `actionLabel`

On confirm, `onTransition(toStageId, note)` fires with the trimmed note, or
`undefined` if the textarea was left blank. Canceling closes the dialog and
calls `onTransition` NOT AT ALL (no side effect — this is the one case where
the caller's rule-enforced action does not run).

This backports ifm-workforce's product-level `PipelineStatusControl` wrapper
(`modules/pipeline-controls.tsx`, 8 pipeline consumers) into the DS component
itself so every consumer gets note-capture for free without hand-rolling a
wrapper. Constraint #5 below ("don't render confirmation modals here") is
superseded for this ONE narrow, opt-in case — the toolbar still never
confirms a PLAIN transition (no `noteLabel` → no dialog, unchanged).

## Hard constraints

1. **Renders inline-flex with `gap-1.5`** — no stack on smaller widths;
   horizontal scrolling is acceptable if too many transitions.
2. **Current-state pill is ALWAYS first** (leftmost), then transitions
   left-to-right.
3. **Collapse chevron is OPTIONAL** — pass `onCollapse` only if there's a
   right rail to hide.
4. **Action labels are sentence case, `text-body-sm font-medium`** (T-086) —
   they must NOT match StatePill's uppercase/tracked treatment; that idiom is
   reserved for STATUS labels (pills/chips), not action buttons.
5. **Don't render confirmation modals here** — the parent handles
   confirmation; this component just emits the `toStageId`. **Exception
   (T-102):** a transition with `noteLabel` set IS allowed to open the
   toolbar's own note-capture dialog (see above) — this is the one
   narrow, opt-in case; plain transitions (no `noteLabel`) still never
   show a modal.

## Anti-patterns

- ❌ Wrapping in a `<Card>` (it's an inline toolbar)
- ❌ Stacking transitions vertically (production is horizontal)
- ❌ Disabling the current-state pill click — it's not clickable (already
  the active state)
- ❌ Hardcoding next-state labels — derive from `stage.label` or
  `transitions[].actionLabel`

## Anti-pattern (subtle): WRONG button order

When state has 2 transitions (e.g. Approve + Reject), put the PRIMARY action
LEFT and the negative/destructive action RIGHT. This matches typical
left-to-right reading order for "happy path first."

## Cross-references

- Uses: `StatePill` primitive
- Used by: `PipelineDetail` (`@fams-v5/modules/pipeline`)
- Related: `state-pill.spec.md`, `PipelineDetail.spec.md`
