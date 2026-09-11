# DowntimeBadge — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/components/kanban-card.tsx` (lines ~162-228)
- Walkthrough: `knowledge-base/live-product-references/11-truemax-production-shell-and-kanban.md` §"Downtime badge"

## Purpose

A live, single-line badge that surfaces equipment downtime status on
kanban cards and ticket detail headers. Renders ONE of three visual states
based on the relationship between `start`, `end`, and now.

## The 3 scenarios

| # | Condition | Visual | Live tick? |
|---|---|---|---|
| 1 | `end` is in the past | `bg-muted` + clock outline icon + `DOWNTIME · 2h 30m` (muted, static) | NO |
| 2 | `end` is today/future | red 6% bg + pulsing red dot + `DOWNTIME ACTIVE · {live} / {expected}` | YES, every 1s |
| 3 | No `end` set | red 6% bg + pulsing red dot + `DOWNTIME ACTIVE · {elapsed}` | YES, every 1s |

## Format helpers

```ts
fmtCompact(ms) → "2h 30m" or "3d 4h 5m"   // for resolved + expected durations
fmtLive(ms)    → "2h 30m 15s" or "3d 4h 5m 15s"   // tabular-nums, for active counters
```

Both helpers cascade: days only appear above 24h, otherwise hours.

## Styling

- Container: `inline-flex w-full items-center gap-1.5 rounded px-2 py-1`
- Resolved bg: `bg-muted`
- Active/open-ended bg: `rgba(240,68,56,0.06)` (red 6% — destructive at low alpha)
- Active dot: 6×6 destructive, `animate-pulse`
- Text: `text-caption font-semibold tabular-nums` (so digit width is stable as time ticks)
- Resolved text color: `muted-foreground`
- Active text color: `destructive`

## Props

```ts
interface DowntimeBadgeProps {
  start: string;      // ISO or parseable timestamp
  end?: string;       // omit for open-ended
  className?: string;
}
```

## Live tick mechanism

```ts
const [now, setNow] = useState(() => new Date());
useEffect(() => {
  if (!needsLiveTick) return;
  const interval = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(interval);
}, [needsLiveTick, start, end]);
```

The effect cleanup ensures no zombie timers when cards unmount or re-render.

## Hard constraints

1. **Tabular nums on the elapsed counter** — digits jitter without this.
2. **Cleanup the interval** on unmount/state change — leaking timers cause
   crashes on big boards (50+ active downtimes).
3. **6×6 dot pulses ONLY in active/open scenarios** — resolved is static
   (no animation; misleads otherwise).
4. **Text format includes "DOWNTIME ACTIVE ·" prefix** when red; just
   "DOWNTIME ·" when resolved — visually distinguishes at a glance.

## Anti-patterns

- ❌ Using `setInterval` outside `useEffect` (no cleanup)
- ❌ Using non-tabular fonts for the counter (visual jitter)
- ❌ Animating the dot in the resolved scenario (visually inconsistent)
- ❌ Hardcoding the red color — use `var(--destructive)` for accessibility

## When to use this

- Inside `KanbanCard` (when `downtimeEnabled && downtimeStart` is set on the record)
- Inside `PipelineDetail` body's "Schedule Info" accordion
- Inside list-view rows that show downtime state

NOT for general status indication — for that, use `<StatePill>` or `<Badge>`.

## Cross-references

- Used by: `KanbanCard` (`@fams-v5/ui/data-display`)
- Related: `state-pill.spec.md` (general state pills), `kanban-card.spec.md`
