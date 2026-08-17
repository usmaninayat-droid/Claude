# HybridMapListWidget — `hybrid-map-list`

**Schema type:** `hybrid-map-list` (registered in
`DashboardModuleConfig.schema.json` widget `type` enum and in the
`DashboardWidgetGrid` renderer switch as `kind: 'hybrid-map-list'`).

**What it is.** The dashboard-embedded cousin of the Live Monitoring hybrid
pattern (spec 10): one widget, two synced panes — an event list (left) and a
map plotting the same events (right). Used for Critical Events (Overview),
safety-filtered events (Safety) and fuel events (Fuel). Span 12.

## Anatomy

```
┌ WidgetShell ──────────────────────────────────────────────┐
│ Title                                                     │
├ [Idling] [Overspeed] [Harsh] [Blackspot] [Fuel Theft] ────┤  shared filter chips
├───────────────────┬───────────────────────────────────────┤
│ ⚠ Overspeed  CRIT │                                       │
│   Rashid · 12:40  │        ● ● pins (severity-coloured,   │
│ ▍selected row     │           selected halo)              │
│ ⚠ Harsh braking   │                                       │
└───────────────────┴───────────────────────────────────────┘
```

- Row anatomy mirrors `CriticalEventsList` (severity icon · title ·
  description · timestamp) + an uppercase **CRITICAL** badge for
  `severity: 'critical'`.
- Stacks vertically (`flex-col`) below `md`; list stays usable on a phone.

## Behaviours

- **Bi-directional selection sync.** Row click → selects + `flyTo` its pin
  (halo highlight). Pin click → selects + scrolls its row into view
  (`scrollIntoView`, smooth unless reduced motion) and focuses it. Clicking the
  selected row deselects. Controlled (`selectedId`/`onSelect`) or internal.
- **Filter chips** scope BOTH panes. Empty selection = all types. Chips derive
  from distinct `event.type`s when not configured. Controlled
  (`activeChips`/`onChipsChange`) or internal. "Clear" resets.
- **Empty state** — "No events for this filter." (configurable via
  `emptyState`) in the list pane; map keeps its camera.

## Tokens & a11y

- Token-only styling (`--status-*` for severity, `--secondary` selected tint,
  `--destructive` badge). Severity is double-encoded (icon shape + colour).
- Chips are `aria-pressed` buttons in a labelled `role="group"`; rows are
  buttons with `aria-current` on the selection; full keyboard operability.

## Config example

```json
{ "id": "o7", "title": "Critical Events", "type": "hybrid-map-list", "span": 12,
  "dataSource": { "entityId": "event",
    "chips": ["idling","overspeed","harsh","blackspot","fuel-theft"] } }
```
