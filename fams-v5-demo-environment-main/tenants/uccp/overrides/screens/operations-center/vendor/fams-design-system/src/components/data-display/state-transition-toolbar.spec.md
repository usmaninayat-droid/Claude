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
    "reported-issues→scheduled": { "actionLabel": "SCHEDULE" },
    "reported-issues→invalid": { "actionLabel": "MARK INVALID", "variant": "destructive" }
  }
}
```

Use this when the workflow has branching transitions (e.g. APPROVE / REJECT,
SCHEDULE / INVALID).

### Mode 2 — `getForwardTransitions()` helper

```ts
import { getForwardTransitions } from '@fams-v5/ui/data-display';

const transitions = getForwardTransitions(stages, currentStage.id);
// All later stages, in order. Truemax linear forward-flow.
```

Use this when the workflow is purely linear (no branching).

## Button styling

```css
.transition-button {
  height: 28px;
  padding: 0 14px;
  font: 700 11px/1 'Gilroy', sans-serif;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
  onTransition?: (toStageId: string) => void | Promise<void>;
  onCollapse?: () => void;
  className?: string;
}

interface StateTransitionTransition {
  toStageId: string;
  actionLabel: string;
  confirmMessage?: string;
  variant?: 'outline' | 'primary' | 'destructive';
}
```

## Hard constraints

1. **Renders inline-flex with `gap-1.5`** — no stack on smaller widths;
   horizontal scrolling is acceptable if too many transitions.
2. **Current-state pill is ALWAYS first** (leftmost), then transitions
   left-to-right.
3. **Collapse chevron is OPTIONAL** — pass `onCollapse` only if there's a
   right rail to hide.
4. **Action labels are uppercase + tracked** — match the StatePill style.
5. **Don't render confirmation modals here** — the parent handles
   confirmation; this component just emits the `toStageId`.

## Anti-patterns

- ❌ Wrapping in a `<Card>` (it's an inline toolbar)
- ❌ Stacking transitions vertically (production is horizontal)
- ❌ Disabling the current-state pill click — it's not clickable (already
  the active state)
- ❌ Hardcoding next-state labels — derive from `stage.label` or
  `transitions[].actionLabel`

## Anti-pattern (subtle): WRONG button order

When state has 2 transitions (e.g. APPROVE + REJECT), put the PRIMARY action
LEFT and the negative/destructive action RIGHT. This matches typical
left-to-right reading order for "happy path first."

## Cross-references

- Uses: `StatePill` primitive
- Used by: `PipelineDetail` (`@fams-v5/modules/pipeline`)
- Related: `state-pill.spec.md`, `PipelineDetail.spec.md`
