import type { ReactNode } from 'react'
import {
  Avatar,
  BreakdownStrip,
  CriticalEventsList,
  IconBadge,
  KpiTile,
  Leaderboard,
  StatBar,
  StatusView,
  TrendIndicator,
  type CriticalEventsListItem,
  type LeaderboardColumn,
  type LeaderboardItem,
} from '@fams/ui-kit'
import type {
  DashboardColumn,
  DashboardListItem,
  DashboardMedia,
  DashboardRow,
  DashboardSeverity,
  DashboardSlice,
} from '@fams/v5-composer'
import { cn } from '../lib/cn'
import {
  WidgetCard,
  WidgetState,
  resolveWidgetIcon,
  sourceOf,
  widgetAriaLabel,
  widgetHeight,
  useWidgetScopeFilter,
  type DashboardWidgetRenderProps,
} from './dashboard-widget-shell'

/**
 * dashboard-data-widgets — the non-chart half of the metadata `type` →
 * component map: `list`, `leaderboard`, `kpi-card`, `stat-with-target`.
 *
 * `geospatial-heatmap` lives in its sibling `dashboard-map-widget.tsx`: it
 * carries the map's lazy `@fams/v5-templates/map` import and its list rail,
 * and splitting it keeps both files inside the ~300-line budget (hard rule 12).
 */

/**
 * The blueprint's severity vocabulary → `CriticalEventsList`'s closed tone
 * enum. Authors write `'critical'` (the word the dashboards use); the list
 * renders it as `'error'`.
 */
const SEVERITY_TONE: Record<DashboardSeverity, CriticalEventsListItem['severity']> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
  success: 'info',
}

/**
 * Fill tone of a `render: 'bar'` leaderboard cell. Generic by construction
 * (rule 10): the author states the thresholds their metric uses, this picks
 * the highest band the value clears. No metric is named anywhere.
 */
export function barTone(value: number, column: DashboardColumn): 'primary' | 'success' | 'warning' | 'danger' {
  return matchedThreshold(value, column)?.tone ?? column.tone ?? 'primary'
}

/** The highest authored band the value clears, if any. */
function matchedThreshold(value: number, column: DashboardColumn) {
  const thresholds = column.thresholds
  if (!thresholds?.length) return undefined
  return [...thresholds]
    .sort((a, b) => a.from - b.from)
    .filter((threshold) => value >= threshold.from)
    .pop()
}

/** Categorical ink for a counter chip. Static map — Tailwind reads whole class names. */
const COUNTER_INK: Record<number, string> = {
  1: 'text-chart-1',
  2: 'text-chart-2',
  3: 'text-chart-3',
  4: 'text-chart-4',
  5: 'text-chart-5',
}

/**
 * A `render: 'counters'` cell — a `number[]` shown as icon + count pairs in the
 * page's own category colours, so the same vocabulary the donut and the stacked
 * bar use also reads on the board. Each pair states its category in an
 * accessible name, so the colour is never the only channel (verdict V12).
 */
function CountersCell({ counts, column }: { counts: number[]; column: DashboardColumn }) {
  const keys = column.counters ?? []
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {counts.map((count, index) => {
        const key = keys[index]
        const Icon = resolveWidgetIcon(key?.icon)
        const label = key?.label ?? `${column.label} ${index + 1}`
        return (
          <span key={label} className="inline-flex items-center gap-1" title={label}>
            {Icon ? (
              <Icon
                // A counter bound to a NON-categorical token paints from the
                // token directly; the categorical class stays the fallback.
                style={key?.colorToken ? { color: key.colorToken } : undefined}
                className={cn('size-3.5 shrink-0', COUNTER_INK[key?.colorIndex ?? 1])}
                aria-hidden="true"
              />
            ) : null}
            <span className="sr-only">{`${label}: `}</span>
            <bdi className="text-body-sm font-medium text-foreground">{count}</bdi>
          </span>
        )
      })}
    </span>
  )
}

/**
 * A row's authored `media` → the leading visual of its entity block. JSON
 * cannot carry a React node, so the blueprint names WHAT to draw and this
 * picks the component: `src`/`initials` are a person-shaped `Avatar`,
 * a bare `icon` is a tinted `IconBadge` (the vehicle/site glyph case).
 * Returns `undefined` for an empty object, so an un-annotated row keeps the
 * text-only entity block rather than rendering an empty chip.
 */
function RowMedia({ media, fallbackLabel }: { media: DashboardMedia; fallbackLabel: string }) {
  const label = media.label ?? fallbackLabel
  if (media.src || media.initials) {
    return <Avatar size="sm" src={media.src} name={media.initials ?? label} alt={label} />
  }
  const Icon = resolveWidgetIcon(media.icon)
  if (!Icon) return null
  return <IconBadge icon={Icon} tone={media.tone === 'neutral' ? undefined : media.tone} size="sm" aria-label={label} />
}

/** A `render: 'delta'` cell — an arrow + value, never colour alone (V12). */
function DeltaCell({ value, unit }: { value: number; unit?: string }) {
  if (!Number.isFinite(value) || value === 0) return <span className="text-muted-foreground">—</span>
  return (
    <TrendIndicator
      size="sm"
      direction={value > 0 ? 'up' : 'down'}
      value={`${Math.abs(value)}${unit ? ` ${unit}` : ''}`}
    />
  )
}

/** Cell values arrive from JSON as scalars or arrays; counters need the array. */
function toCounts(raw: unknown): number[] {
  return Array.isArray(raw) ? raw.map((entry) => Number(entry) || 0) : []
}

/** Any non-counters cell, as display text. An array joins — it never concatenates. */
function arrayToText(value: unknown): string {
  return Array.isArray(value) ? value.join(' · ') : String(value ?? '')
}

/** One KPI tile, sized by its own span rather than by the KPI region. */
export function KpiCardWidget(props: DashboardWidgetRenderProps) {
  const { widget } = props
  const source = sourceOf(widget)
  const isTargetShape = widget.type === 'stat-with-target'
  return (
    <WidgetState count={source.value === undefined ? 0 : 1} source={source} loading={props.loading} error={props.error} onRetry={props.onRetry}>
      <KpiTile
        data-slot="dashboard-widget"
        data-widget-id={widget.id}
        data-widget-type={widget.type}
        layout="stat"
        label={widget.title ?? ''}
        value={String(source.value ?? '')}
        unit={source.unit}
        valueSuffix={source.valueSuffix}
        target={isTargetShape ? source.target : undefined}
        targetLabel={isTargetShape ? source.targetLabel : undefined}
        badge={source.badge}
        icon={resolveWidgetIcon(source.icon)}
        tone={source.tone}
        trend={source.trend}
        className="h-full"
      />
    </WidgetState>
  )
}

/**
 * The "Progress Overview" card (Figma 2227:76502) — a headline stat row and
 * one overlapping-pill proportion bar, over the widget's `slices[]`. Reuses the
 * donut's slice vocabulary (label / value / dimensions) plus a semantic `tone`,
 * so a page pill filters it exactly as it filters a donut. The optional
 * `scopeFilter` renders the header's "All Vehicles" select; a scoped strip
 * keeps the slices whose `dimensions[scopeFilter.id]` carry the chosen value
 * (un-annotated slices survive, so a dataset without dimensions never blanks).
 */
export function BreakdownStripWidget(props: DashboardWidgetRenderProps) {
  const { widget } = props
  const source = sourceOf(widget)
  const scope = useWidgetScopeFilter(source)
  const scopeKey = source.scopeFilter?.id
  const slices = ((source.slices ?? []) as DashboardSlice[]).filter((slice) => {
    if (!scopeKey || !scope.value) return true
    const tagged = slice.dimensions?.[scopeKey]
    if (tagged === undefined) return true
    return Array.isArray(tagged) ? tagged.includes(scope.value) : tagged === scope.value
  })
  return (
    <WidgetCard {...props} count={slices.length} bodyPadding="md" actions={scope.node}>
      <BreakdownStrip
        aria-label={widgetAriaLabel(widget, props.filterSummary)}
        items={slices.map((slice, index) => ({
          id: slice.id ?? String(index),
          label: slice.label,
          value: slice.value,
          tone: slice.tone,
          display: slice.display,
        }))}
      />
    </WidgetCard>
  )
}

/** A scrollable event list — rows carry label-over-value metadata columns. */
export function ListWidget(props: DashboardWidgetRenderProps) {
  const { widget, onItemSelect } = props
  const source = sourceOf(widget)
  const items: CriticalEventsListItem[] = (source.items ?? []).map((item: DashboardListItem) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    severity: SEVERITY_TONE[item.severity ?? 'info'],
    timestamp: item.timestamp,
    meta: item.meta,
  }))
  return (
    <WidgetCard {...props} count={items.length} bodyPadding="none">
      <div
        role="region"
        // Deliberate (WCAG 2.1.1 / UX verdict V5): a scroll container that a
        // mouse can pan MUST be reachable and pannable by keyboard. The rule
        // models "non-interactive elements shouldn't be focusable" and cannot
        // express that exception — same carve-out `ChartContainer`'s sr-only
        // data table documents.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label={widget.title ?? 'Events'}
        className="w-full overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring"
        style={{ maxBlockSize: widgetHeight(widget, 320) }}
      >
        {/* `onItemClick` only when the host gave the widget somewhere to go:
            `ListRow` renders the pointer/focus affordance from the handler's
            presence, so an unwired list stays honestly non-interactive (V11). */}
        <CriticalEventsList
          items={items}
          onItemClick={onItemSelect ? (id) => onItemSelect(widget.id, id) : undefined}
          className="border-0 shadow-none"
        />
      </div>
    </WidgetCard>
  )
}

/** Ranked table, optionally with podium cards and a search box. */
export function LeaderboardWidget(props: DashboardWidgetRenderProps) {
  const { widget, onItemSelect } = props
  const source = sourceOf(widget)
  const scope = useWidgetScopeFilter(source)
  // A scoped board narrows to the rows carrying the chosen value under the
  // filter's own key. A row that does not carry the key at all is kept — a
  // dataset that has not been annotated must not silently render an empty
  // board.
  const scopeKey = source.scopeFilter?.id
  const allRows = (source.rows ?? []) as DashboardRow[]
  const rows =
    scopeKey && scope.value
      ? allRows.filter((row) => {
          const cell = row.cells?.[scopeKey]
          return cell === undefined || String(cell) === scope.value
        })
      : allRows

  const columns: LeaderboardColumn[] = (source.columns ?? []).map((column) => ({
    key: column.key,
    label: column.label,
    align: column.align,
    width: column.width,
    minWidth: column.minWidth,
    render: cellRenderer(column),
  }))

  // The trailing score-delta column is UNLABELLED in the design, which leaves
  // a screen-reader user with an anonymous number; it gets a real header here
  // and the arrow glyph carries the direction visually.
  const withDelta: LeaderboardColumn[] = rows.some((row) => row.scoreDelta !== undefined)
    ? [
        ...columns,
        {
          key: '__score-delta',
          label: 'Score change',
          align: 'end' as const,
          minWidth: '8rem',
          render: function ScoreDeltaCell(item: LeaderboardItem) {
            return <DeltaCell value={Number(item.cells?.['__score-delta'] ?? 0)} unit={source.scoreUnit} />
          },
        },
      ]
    : columns

  // Keys whose cells are consumed as raw `number[]` by a counters renderer.
  const countersKeys = new Set(
    (source.columns ?? []).filter((column) => column.render === 'counters').map((column) => column.key),
  )
  if (source.detailKey) countersKeys.add(source.detailKey)

  const detailColumn = source.detailKey
    ? (source.columns ?? []).find((column) => column.key === source.detailKey)
    : undefined
  const PodiumEmblem = resolveWidgetIcon(source.podiumEmblem)

  const items: LeaderboardItem[] = rows.map((row, index) => ({
    id: row.id,
    rank: row.rank ?? index + 1,
    primary: row.primary,
    secondary: row.secondary,
    media: row.media ? <RowMedia media={row.media} fallbackLabel={row.primary} /> : undefined,
    score: row.score === undefined ? undefined : `${row.score}${source.scoreUnit ? ` ${source.scoreUnit}` : ''}`,
    movement:
      row.rankDelta === undefined || row.rankDelta === 0
        ? undefined
        : { direction: row.rankDelta > 0 ? 'up' : 'down', value: Math.abs(row.rankDelta) },
    detail:
      detailColumn && row.cells?.[detailColumn.key] !== undefined ? (
        <CountersCell counts={toCounts(row.cells[detailColumn.key])} column={detailColumn} />
      ) : undefined,
    // The emblem is ORDINAL decoration, so it takes the medal family, not the
    // warning status hue it used to borrow (see `LeaderboardPodium`).
    emblem: PodiumEmblem ? <PodiumEmblem className="size-10 text-medal-gold-border" aria-hidden="true" /> : undefined,
    cells: {
      ...Object.fromEntries(
        Object.entries(row.cells ?? {}).map(([key, value]) => [
          key,
          // Only a column that DECLARES itself a counters cell keeps its array
          // (its renderer reads the numbers). Anywhere else an array must
          // collapse to a readable string — React renders `[1,1,0,0]` as the
          // digit run "1100".
          Array.isArray(value) && countersKeys.has(key) ? (value as number[]) : arrayToText(value),
        ]),
      ),
      '__score-delta': row.scoreDelta ?? 0,
    } as Record<string, ReactNode>,
    searchText: `${row.primary} ${row.secondary ?? ''}`,
  }))

  return (
    <WidgetCard {...props} count={items.length} bodyPadding="md" actions={scope.node}>
      <Leaderboard
        items={items}
        columns={withDelta}
        variant={source.variant}
        podiumCount={source.podiumCount}
        entityLabel={source.entityLabel}
        // Figma's High Risk Drivers board has four columns and no rank column:
        // the rows ARE the ranking, so an ordinal column repeats the row order
        // and costs a column the metrics need.
        showRank={source.showRank}
        searchable={source.searchable}
        searchPlaceholder={source.searchPlaceholder}
        scoreLabel={source.scoreLabel}
        detailLabel={source.detailLabel}
        onItemClick={onItemSelect ? (id) => onItemSelect(widget.id, id) : undefined}
        loading={props.loading}
        ariaLabel={widgetAriaLabel(widget, props.filterSummary)}
        emptyState={<StatusView kind="empty" title="No results" description={source.emptyText ?? 'No rows match this filter.'} />}
        // Authorable, because the row pitch a board resolves to depends on
        // what its rows carry (an avatar + a two-line entity block is 54px,
        // not 48) — a fixed 24rem sliced the seventh row of a 7-row board.
        bodyMaxHeight={`${widgetHeight(widget, 384)}px`}
      />
    </WidgetCard>
  )
}

/**
 * Cell presentation for one authored column. `'text'` needs no renderer (the
 * board falls back to `cells[key]`), so only the richer forms are built here.
 */
function cellRenderer(column: DashboardColumn): ((item: LeaderboardItem) => ReactNode) | undefined {
  if (column.render === 'counters') {
    return function CountersColumnCell(item) {
      return <CountersCell counts={toCounts(item.cells?.[column.key])} column={column} />
    }
  }
  if (column.render === 'delta') {
    return function DeltaColumnCell(item) {
      return <DeltaCell value={Number(item.cells?.[column.key] ?? 0)} unit={column.unit} />
    }
  }
  if (column.icon && (column.render ?? 'text') === 'text') {
    // A code-shaped column reads as an anonymous string without its entity
    // glyph — the plate column beside a row of driver avatars was the case
    // that showed it. The glyph is `aria-hidden`: the code is the content, and
    // repeating "vehicle" per cell would only pad every row's accessible name.
    const Icon = resolveWidgetIcon(column.icon)
    if (Icon) {
      return function IconTextCell(item) {
        return (
          <span className="inline-flex min-w-0 items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <bdi className="truncate">{arrayToText(item.cells?.[column.key])}</bdi>
          </span>
        )
      }
    }
  }
  if (column.render === 'bar') {
    return function BarColumnCell(item) {
      const raw = Number(item.cells?.[column.key] ?? 0)
      const band = matchedThreshold(raw, column)
      // The band IN WORDS beside the value, and the bar marked decorative:
      // a fill tone alone leaves the threshold encoded by colour only, and
      // the bar repeats a number the text already carries (verdict V12).
      const text = `${raw}${column.unit ?? ''}${band?.label ? ` — ${band.label}` : ''}`
      return (
        <StatBar
          compact
          decorative
          percent={raw}
          tone={barTone(raw, column)}
          value={text}
          aria-label={`${column.label}: ${text}`}
        />
      )
    }
  }
  return undefined
}
