# KanbanCard — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/components/kanban-card.tsx`
- Walkthrough: `knowledge-base/live-product-references/11-truemax-production-shell-and-kanban.md`
- Figma: Pattern #26 in `knowledge-base/product-context/30-pattern-ledger.md`

## Card chrome

- Background: `bg-card` (white)
- Border: 1px solid `var(--border)` (`#EAECF0`)
- Corner radius: **6px** (`rounded-[6px]`) — NOT 8px
- Padding: 16px all sides
- Gap between sections: 16px

## Anatomy (top to bottom)

```
┌──────────────────────────────────────────┐
│ [#L-204] [WEB] [● CRITICAL]              │  ← Badge row (6px gap)
│ Acme Fleet RFP Modernization             │  ← Title (16px BOLD 700, ellipsis)
│ 🚚 Toyota Innova  🏷 W-5778  ⏱ 32K km    │  ← Metadata icon chips
│ ─────────────────────────────────────────│
│ ⚫ DOWNTIME ACTIVE · 2h 30m / 6h          │  ← Downtime badge (conditional, live tick)
│ ─────────────────────────────────────────│
│ ○ SK Sarah K.            📅 Jun 12        │  ← Footer (avatar + due date)
└──────────────────────────────────────────┘
```

## Badge row (6px gap, flex-wrap)

Three slot types, all `rounded-[2px]` (sharp corners — NOT pill):

| Slot | Bg | Padding | Font |
|---|---|---|---|
| WO-ID | `bg-border` (gray-200, `#EAECF0`) | 8×4 | 12px 600 uppercase, `muted-foreground` |
| Priority | from `PRIORITY_CONFIG[priority]` (varies) | 8×4 | 10px 600 uppercase, color from config |
| Type | from `MAINTENANCE_TYPE_CONFIG[type]` (varies) | 8×4 | 10px 600 uppercase, color from config |

Priority badge includes a **flag icon** with `fillColor` + `strokeColor` from config.

## Title

- 16px font, BOLD 700 (NOT semibold)
- `text-foreground`
- `text-ellipsis whitespace-nowrap` (single-line, truncates)

## Metadata icon chips

Up to 4 chips in a flex-wrap row with 8px gap. Each chip:
- 12px stroke icon in `var(--muted-foreground)`
- Text: 10px 600 weight, `text-card-foreground`
- 4px gap between icon and text

Standard chip types:
- Equipment Name → Container icon
- Equipment ID → Tag icon
- Meter Value → Clock icon
- Location → MapPin icon

## Downtime badge (conditional — 3 visual scenarios)

Renders only when `downtimeEnabled && downtimeStart`.

| Scenario | Bg | Text | Icon | Live tick? |
|---|---|---|---|---|
| End in past (resolved) | `bg-muted` | `DOWNTIME · 2h 30m` (muted-foreground 10px 600) | static clock outline | no |
| End today/future (active w/ ETA) | `bg-[rgba(240,68,56,0.06)]` (red 6%) | `DOWNTIME ACTIVE · {live} / {expected}` (destructive 10px 600 tabular-nums) | pulsing 6px red dot | YES (1s) |
| Open-ended (no end set) | same red 6% | `DOWNTIME ACTIVE · {elapsed}` | pulsing dot | YES (1s) |

Live tick uses `setInterval(setNow, 1000)`. Format helpers:
- `fmtCompact(ms)` → `{d}d {h}h {m}m`
- `fmtLive(ms)` → `{d}d {h}h {m}m {s}s` (tabular nums)

## Footer

Border-top 1px, 16px top padding. Two slots:

**Left**: 24×24 colored circle with single letter (NOT initials).
- Background = avatar's brand color (per-user, from `assignedAvatar.color`)
- Letter = `assignedAvatar.letter` (uppercase, 12px 600 white)
- When `isNewRequest && !assignedAvatar`: render `<UnassignedIcon />` as a popover trigger button (clicking opens AssignSchedulePopover)

**Right**: Calendar icon + date label.
- Icon: 14px Calendar stroke
- Text: 12px
- Overdue: both icon AND text use `var(--destructive)` color + font-weight 600
- Not overdue: muted-foreground icon, card-foreground text, font-weight 500

## Hard constraints

1. **Card corners are 6px**, NOT 8px (`rounded-[6px]`, NOT `rounded-lg`)
2. **All three top badges are `rounded-[2px]`** — never pill, never `rounded`
3. **Title weight is 700 (BOLD)** — not 600 (semibold)
4. **Metadata uses ICONIC CHIPS** with 12px stroke icons, not text-only
5. **Downtime badge has 3 visual scenarios** with live ticking — not a single style
6. **Footer avatar is single letter**, not initials (Truemax convention)
7. **Overdue date renders in destructive RED** with semibold 600

## Props

```ts
interface KanbanCardProps {
  // Identity
  ticketId?: string;       // "JO-12345"
  title: string;           // bold heading
  
  // Top badges
  priority: Priority;      // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MINOR"
  type: MaintenanceType;   // "CORRECTIVE" | "PREVENTIVE"
  
  // Metadata chips
  equipmentName?: string;
  equipmentId?: string;
  meterValue?: string;
  location?: string;
  
  // Downtime
  downtimeEnabled?: boolean;
  downtimeStart?: string;
  downtimeEnd?: string;
  
  // Footer
  avatar: { letter: string; color: string };
  assignedAvatar?: { letter: string; color: string } | null;
  isNewRequest?: boolean;
  date: string;
  isOverdue?: boolean;
  
  // Behavior
  onClick?: () => void;
  onAssignAndSchedule?: (id: string, result: AssignScheduleResult) => void;
  
  // DnD (auto-wires via @dnd-kit/sortable when id+stageId set)
  id?: string;
  stageId?: string;
}
```

## Anti-patterns

- ❌ Hand-rolling a kanban card — always import from `@fams-v5/ui`
- ❌ Using initials instead of single letter in the avatar circle
- ❌ Forgetting the metadata icon chips (most common mistake — visually it looks "minimal" without them)
- ❌ Skipping the DowntimeBadge live-tick scenario for active downtime
- ❌ Using `rounded` (4px default) on the card instead of `rounded-[6px]`

## Cross-references

- Used by: `@fams-v5/modules/pipeline/PipelineKanbanView`
- Reads: `PRIORITY_CONFIG`, `MAINTENANCE_TYPE_CONFIG` from `mock-data.ts` per tenant
- Related: `kanban-column.spec.md`, `assign-schedule-popover.spec.md`
