# Organization Settings — contract (spec / gate G1)

Settings › Organization Settings (FAMS Settings, Figma `2-11415` logo-set /
`2-11663` logo-empty). The org **overview**: identity header + a KPI stat row
(sparklines + a wide billing card) + a day-grouped activity log. Read-only summary
surface (drill-outs + an identity edit affordance); config-driven, token-only.

## Shape
`OrganizationSettings({ identity, stats, activity, activityTitle?, onEditIdentity?, onBack?, className })`

```ts
type TrendDir = 'up' | 'down' | 'flat';
interface OrgIdentity { name: string; email?: string; logo?: string }
interface OrgStat {
  id: string; label: string; value: React.ReactNode;
  icon?: React.ReactNode;
  subValue?: React.ReactNode;                 // e.g. "Next billing date: 12 Jan, 2023"
  trend?: { value: string; direction: TrendDir };
  caption?: string;                           // e.g. "Compared to last month"
  spark?: number[];                           // Sparkline series
  wide?: boolean;                             // billing-style tall/spanning card
  onDrill?: () => void;                       // top-right drill arrow
}
interface OrgActivity {
  id: string; actor: string; actorRole?: string;
  action: React.ReactNode; timestamp: string;
  dateGroup: string;                          // "Today" | "Yesterday" | "27th November, 2023"
  onActorClick?: () => void;
}
```

## Regions (frame `2-11415`, top→bottom)
1. **Identity header** — round logo (or placeholder when `identity.logo` is unset — frame
   `2-11663`) with a small **edit** badge (→ `onEditIdentity`); org `name` (h4/bold) + muted `email`.
2. **Stat row** — `stats` in a responsive 3-col grid. Each card: leading `icon` + top-right drill
   arrow (`onDrill`), big `value` (+ optional `subValue`), `label`, a trend delta
   (`trend.value` tinted by direction — up = success/green, down = error/red), a muted `caption`,
   and a `Sparkline` (reused from data-viz; green/red per trend). A `wide` card (billing) spans a
   taller cell (`md:row-span-2`) with a larger sparkline.
3. **Activity log** — `activityTitle` (default "Organization Activity Logs"). `activity` grouped by
   `dateGroup` (first-seen order); each row = linked **actor** (+ `(actorRole)`) · `action` text ·
   right-aligned `timestamp`.

## Laws / a11y
- **Token-only.** Trend/spark tones are `--status-*` / chart tokens; no raw hex. Config-driven —
  identity/stats/activity all passed in, nothing domain-specific hardcoded. Reuses `Sparkline`; no fork.
- **a11y.** Drill + edit buttons are icon-only with `aria-label`; the logo edit control has a label;
  actor is a real `<button>`; the stat grid uses semantic headings; trend direction is conveyed by
  text (the delta value), not colour alone.

## Acceptance criteria
1. Renders identity (logo or placeholder + edit badge), the stat grid, and the day-grouped activity
   log entirely from props — no hardcoded org data.
2. Each stat card shows value/label and, when provided, icon · subValue · trend delta (tinted by
   direction) · caption · Sparkline; `wide` cards render the taller spanning variant.
3. `onDrill` fires from a stat's drill arrow; `onEditIdentity` from the logo edit badge;
   `onActorClick` from an activity actor; `onBack` from the breadcrumb.
4. Activity rows are grouped under their `dateGroup` label in first-seen order.
5. `identity.logo` unset → placeholder state (frame `2-11663`).
6. Coherence + a11y-static + tsc/build green.
