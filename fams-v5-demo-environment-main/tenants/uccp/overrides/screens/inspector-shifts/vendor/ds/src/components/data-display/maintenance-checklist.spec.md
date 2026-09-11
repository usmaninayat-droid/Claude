# MaintenanceChecklist — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/components/ticket-detail.tsx`
  `MAINTENANCE_CHECKLISTS` map (~lines 100-260)
- Walkthrough: `knowledge-base/live-product-references/12-truemax-stage-config-and-ticket-schema.md` §"Maintenance Checklists"

## Purpose

A category-driven inspection checklist that lives inside a Pipeline Detail
body. Each asset category (Mixer Trucks, Batching Plant, PE Jaw Crusher,
etc.) has a fixed list of 10 inspection items. The user marks each item
passed / failed / N/A and optionally adds a note + photo.

```
┌─ ▼ Maintenance Checklist · Mixer Trucks   [2 pass] [1 fail] [7 todo] ─┐
│  1  Inspect drum roller rings and track wheels        [✓] [×] [—] 💬 │
│  2  Check drum drive motor and gearbox oil            [ ] [ ] [ ] 💬 │
│  3  Verify water tank level and pump operation        [ ] [ ] [ ] 💬 │
│  …                                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Categories (14 production-shipping categories + Default)

From the Truemax production code:
- Concrete Truck-Mounted Boom Pump
- Concrete Pump Vehicle
- Batching Plant
- Placing Boom
- Mixer Trucks
- Concrete Mixer
- Truck-Mounted Crane
- Mobile Service Truck
- PF Impact Crusher
- PE Jaw Crusher
- Sand Making Machine
- Mobile Jaw Crushing Station
- Belt Conveyer
- Default (10 generic items)

Other tenants ship different category lists. **The category list is data,
not code** — pass `items` to the component, the kit doesn't ship a built-in
category map.

## Per-item state

```ts
type ChecklistItemState = 'pending' | 'passed' | 'failed' | 'na';
```

| State | Visual |
|---|---|
| `pending` (default) | empty bordered button, all 3 state buttons inactive |
| `passed` | green-tinted button with check icon (active) |
| `failed` | red-tinted button with X icon (active) |
| `na` | gray-tinted button with minus icon (active) |

Clicking an active state button reverts to `pending` (toggle).

## Props

```ts
interface MaintenanceChecklistProps {
  title?: string;                    // default "Maintenance Checklist"
  category?: string;                  // e.g. "Mixer Trucks"
  items: ChecklistItem[];            // ALWAYS 10 items per Truemax convention
  editable?: boolean;                 // default true
  onStateChange?: (id, state) => void;
  onNoteChange?: (id, note) => void;
  onPhotoAttach?: (id) => void;
  className?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  state?: ChecklistItemState;
  note?: string;
  photoUrl?: string;
}
```

## Header summary chips

The header renders count chips for non-zero buckets:

| Bucket | Chip |
|---|---|
| `passed > 0` | `success-50` bg + `success-700` text + "N pass" |
| `failed > 0` | `error-50` bg + `error-700` text + "N fail" |
| `na > 0` | `muted` bg + `muted-foreground` text + "N n/a" |
| `pending > 0` | `muted` bg + `muted-foreground` text + "N todo" |

Empty buckets are not rendered (avoid visual noise).

## Hard constraints

1. **10 items per category** — Truemax convention; deviating breaks the
   "consistent checklist" pattern. Document the deviation if you must.
2. **Header is collapsible** (chevron expand/collapse). Collapsed state
   only shows the header row + count chips.
3. **State buttons are TOGGLES** — clicking an active state reverts to
   pending; clicking an inactive state activates it.
4. **Notes are inline-expandable** per item — the note input appears below
   the row when 💬 is clicked.
5. **Read-only mode** (`editable={false}`) hides the state buttons but
   shows the resolved state with the colored icon.

## Anti-patterns

- ❌ Auto-saving on every keystroke for notes (debounce or save-on-blur)
- ❌ Rendering more than 10 items per category (defeats the consistent
  checklist purpose)
- ❌ Mixing kinds (passed + failed + N/A all toggleable simultaneously)
  — only one state active per item
- ❌ Allowing state changes when stage is read-only (e.g. Closed)

## Common parent integration

```tsx
import { MaintenanceChecklists } from './data/checklists';
import { MaintenanceChecklist } from '@fams-v5/ui/data-display';

<MaintenanceChecklist
  category={asset.category}
  items={MaintenanceChecklists[asset.category] ?? MaintenanceChecklists.Default}
  editable={isReportEditable(currentStage)}
  onStateChange={(id, state) => updateChecklist(asset.id, id, state)}
/>
```

## Cross-references

- Used by: `PipelineDetail` (corrective-maintenance variant)
- Data: each tenant maintains its own `MaintenanceChecklists` map
- Related: `PipelineDetail.spec.md`, `kanban-card.spec.md`
