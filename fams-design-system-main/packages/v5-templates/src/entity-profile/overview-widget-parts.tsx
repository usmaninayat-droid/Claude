import { getIcon, Bell, Clock, ExternalLink, MapPin, Maximize2, Minus, Plus, type LucideIcon } from '@fams/ui-kit/icons'
import { BarChart, Badge, ChartCard, IconBadge, KpiTile, LineChart, StatusPill } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import type {
  OverviewBarChartWidget,
  OverviewEventListWidget,
  OverviewKpiTilesWidget,
  OverviewLevelSummaryWidget,
  OverviewLineChartWidget,
  OverviewLocationCardStrings,
  OverviewStatusCardRowWidget,
  OverviewStatusCardWidget,
  OverviewTone,
} from './OverviewWidgets.types'

/**
 * The individual `OverviewWidgets` widget BODIES. [tier-2 internal]
 *
 * Split out of `OverviewWidgets.tsx` purely for the ~300-line file budget (root
 * `CLAUDE.md` rule 12): that file now owns the widget UNION, the two-column
 * layout and the dispatch switch, this one owns the per-variant markup. Every
 * function here is a pure presenter over a record plus its widget config —
 * no fetching, no formatting beyond `String(value)` (Rule 8), and every value
 * reached through FIELD-KEY INDIRECTION so nothing here knows a business shape.
 */

/**
 * Named-icon resolution for every `icon`/`iconField` string in an
 * `OverviewWidget`. Delegates to `@fams/ui-kit/icons`' own `getIcon` — the
 * canonical registry of all ~200 vendored glyphs plus its alias table
 * (`"telematics"`, `"gauge"`, `"bell"`, `"map-pin"`, …) — instead of the
 * hand-maintained four-entry map this file's predecessor carried, which is why
 * a blueprint naming any glyph outside `bell|calendar|clock|hash` used to fall
 * back to a bell. An unknown name still degrades to `Bell` rather than
 * rendering nothing (the same "opt in by name, never crash" contract every
 * named registry in this system uses).
 */
export function resolveNamedIcon(name: string | undefined): LucideIcon {
  return getIcon(name) ?? Bell
}

/** Same resolution, but `undefined` when no name was authored (for an optional icon slot). */
export function resolveOptionalIcon(name: string | undefined): LucideIcon | undefined {
  return name ? getIcon(name) : undefined
}

/** Reads `record[field]` as a display string; `undefined` for null/empty. */
export function readText(record: EntityRecord | undefined, field: string | undefined): string | undefined {
  if (!record || !field) return undefined
  const value = record[field]
  if (value == null || value === '') return undefined
  return String(value)
}

/** Reads `record[field]` as an array of plain row objects; `[]` when absent or not an array. */
export function readRows(record: EntityRecord | undefined, field: string): Record<string, unknown>[] {
  const value = record?.[field]
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

/**
 * Resolves a widget's tone from the record: an explicit `toneField` value first
 * (mapped through `toneMap` when one is authored, otherwise used verbatim when
 * it already names a tone), falling back to `fallback`. Keeps tone DATA-driven
 * — a blueprint says "the tone lives in this field", never a hardcoded hue.
 */
export function resolveTone(
  record: EntityRecord | undefined,
  toneField: string | undefined,
  toneMap: Record<string, OverviewTone> | undefined,
  fallback: OverviewTone = 'neutral',
): OverviewTone {
  const raw = readText(record, toneField)
  if (raw == null) return fallback
  if (toneMap?.[raw]) return toneMap[raw]
  return TONES.includes(raw as OverviewTone) ? (raw as OverviewTone) : fallback
}

const TONES: OverviewTone[] = ['primary', 'success', 'warning', 'danger', 'info', 'neutral']

/**
 * Tone → VALUE ink. The DARK step of each ramp, so a tinted status word clears
 * 4.5:1 on the white card surface — the same static lookup (never a template
 * literal, so Tailwind's build-time scanner sees every class) and the same
 * ramp steps `KpiTile`'s own `VALUE_INK_CLASSES` already uses.
 */
const TONE_INK: Record<OverviewTone, string> = {
  primary: 'text-primary',
  success: 'text-success-scale-700',
  warning: 'text-warning-scale-700',
  danger: 'text-error-700',
  info: 'text-info-scale-700',
  neutral: 'text-foreground',
}

/** Tone → the solid fill a status pill overlay paints, as a token `var()`. */
const TONE_FILL_VAR: Record<OverviewTone, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success-scale-500)',
  warning: 'var(--color-warning-scale-500)',
  danger: 'var(--color-error-500)',
  info: 'var(--color-info-scale-500)',
  neutral: 'var(--color-muted-foreground)',
}

/* ── statusCard ─────────────────────────────────────────────────────────────
 * Frame anatomy: a white card whose start side carries a device glyph, a small
 * muted caption ("Telematics") and a LARGE tone-coloured status value
 * ("Reporting" in success green) under it; the end side carries one muted meta
 * line ("Last Received: 5 min ago"), baseline-aligned with the caption. */
export function StatusCardWidget({
  widget,
  record,
}: {
  widget: OverviewStatusCardWidget
  record: EntityRecord | undefined
}) {
  const Glyph = resolveOptionalIcon(readText(record, widget.iconField) ?? widget.icon)
  const value = readText(record, widget.valueField)
  const tone = resolveTone(record, widget.toneField, widget.toneMap, 'neutral')
  const meta = readText(record, widget.metaField)

  return (
    <div
      data-slot="overview-status-card"
      data-tone={tone}
      className="flex flex-col gap-2 rounded-md border border-border bg-card p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        {Glyph ? <IconBadge icon={Glyph} tone="neutral" shape="square" size="md" /> : null}
        <div className="min-w-0">
          <p className="truncate text-caption font-medium text-muted-foreground">{widget.label}</p>
          {/* Tone is stated in the WORD, not by hue alone — the value text IS
              the status name, so the colour is a reinforcement, never the only
              channel (dataviz: no colour-only encoding). */}
          {/* Not `truncate`: a narrow 4-across tile @1440 can be tighter than
              a status word like "Reporting" — wrapping to a second line
              beats an ellipsis mid-word, and the card's height already
              flexes for the optional meta row below. */}
          <p className={cn('break-words text-body-lg font-semibold', TONE_INK[tone])}>{value ?? '—'}</p>
        </div>
      </div>
      {/* Meta sits on its own row rather than beside the label/value — a
          4-across tile row is narrow enough (esp. @1440) that a shrink-0
          meta chunk sharing the row squeezed the label into a mid-word
          truncation ("T.. R.."). Stacking it below guarantees the label
          always has the FULL tile width, at the cost of a slightly taller
          card only when a meta value is actually present. */}
      {meta ? (
        <p className="truncate ps-11 text-caption font-medium text-muted-foreground">
          {widget.metaLabel ? <>{widget.metaLabel}: </> : null}
          {meta}
        </p>
      ) : null}
    </div>
  )
}

/** Tone → `Badge` variant, for every chip this file renders (severity chips, pin-filter swatches). */
const TONE_BADGE: Record<OverviewTone, 'muted' | 'info' | 'success' | 'warning' | 'destructive'> = {
  primary: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  info: 'info',
  neutral: 'muted',
}

/* ── statusCardRow ──────────────────────────────────────────────────────────
 * N equal-width `statusCard` tiles side by side — the frame's 4-across
 * Telematics/DMS/Temperature/Fill-Level strip. Reuses `StatusCardWidget`'s own
 * markup per tile (same tone/icon/meta contract), just laid out in a grid
 * instead of one full-width card. */
export function StatusCardRowWidget({
  widget,
  record,
}: {
  widget: OverviewStatusCardRowWidget
  record: EntityRecord | undefined
}) {
  return (
    <div
      data-slot="overview-status-card-row"
      className={cn('grid items-stretch gap-4', KPI_GRID[widget.columns ?? 4])}
    >
      {widget.cards.map((card, index) => (
        <StatusCardWidget key={card.valueField ?? index} widget={{ type: 'statusCard', ...card }} record={record} />
      ))}
    </div>
  )
}

/* ── levelSummary ─────────────────────────────────────────────────────────
 * Frame anatomy: header icon+title, a divider-separated stat row (Fill Level
 * %, Fill Level L "of 60L", Range, Refuel By), and a full-width filled bar
 * with min/max tick captions underneath — the Overview end column's fuel/
 * fill-level summary card. */
export function LevelSummaryWidget({
  widget,
  record,
}: {
  widget: OverviewLevelSummaryWidget
  record: EntityRecord | undefined
}) {
  const tone = widget.tone ?? 'success'
  const raw = Number(record?.[widget.barValueField] ?? 0)
  const fraction = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 100) : 0
  return (
    <ChartCard title={widget.title} icon={resolveOptionalIcon(widget.icon)} data-slot="overview-level-summary">
      <div className="flex flex-col gap-4">
        <div className="flex items-stretch divide-x divide-border">
          {widget.stats.map((stat, index) => (
            <div key={stat.valueField ?? index} className={cn('min-w-0 flex-1 px-3', index === 0 && 'ps-0')}>
              <p className="truncate text-caption font-medium text-muted-foreground">{stat.label}</p>
              {/* The VALUE wraps rather than truncating (finding: a "Refuel
                  By" date rendered as "Tue, Se…" in the equal-width 4-stat
                  row) — a clipped number or date is a lost fact, whereas a
                  clipped label is still recoverable from position. */}
              <p className="text-body-lg font-semibold text-balance text-foreground">
                {readText(record, stat.valueField) ?? '—'}
                {stat.unit ? (
                  <span className="ms-1 text-caption font-normal text-muted-foreground">{stat.unit}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-label={typeof widget.title === 'string' ? widget.title : 'Level'}
            aria-valuenow={fraction}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width]',
                tone === 'success' && 'bg-success-scale-500',
                tone === 'warning' && 'bg-warning-scale-500',
                tone === 'danger' && 'bg-error-500',
                tone === 'info' && 'bg-info-scale-500',
                tone === 'primary' && 'bg-primary',
                tone === 'neutral' && 'bg-muted-foreground',
              )}
              style={{ width: `${fraction}%` }}
            />
          </div>
          {widget.barMinLabel != null || widget.barMaxLabel != null ? (
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <span>{widget.barMinLabel}</span>
              <span>{widget.barMaxLabel}</span>
            </div>
          ) : null}
        </div>
      </div>
    </ChartCard>
  )
}

/* ── lineChart ──────────────────────────────────────────────────────────── */
export function LineChartWidget({
  widget,
  record,
}: {
  widget: OverviewLineChartWidget
  record: EntityRecord | undefined
}) {
  const rows = readRows(record, widget.rowsField)
  const categoryKey = widget.categoryKey ?? 'label'
  return (
    <ChartCard title={widget.title} icon={resolveOptionalIcon(widget.icon)} data-slot="overview-line-chart">
      <LineChart
        categories={rows.map((row) => String(row[categoryKey] ?? ''))}
        series={widget.series.map((series) => ({
          id: series.key,
          label: series.label,
          unit: series.unit,
          axis: series.axis,
          color: series.color,
          data: rows.map((row) => Number(row[series.key] ?? 0)),
        }))}
        yAxisTitle={widget.yAxisTitle}
        yAxisTitleTrailing={widget.yAxisTitleTrailing}
        height={widget.height ?? 280}
        aria-label={typeof widget.title === 'string' ? widget.title : 'Line chart'}
      />
    </ChartCard>
  )
}

/* ── kpiTiles ───────────────────────────────────────────────────────────── */
const KPI_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

export function KpiTilesWidget({
  widget,
  record,
}: {
  widget: OverviewKpiTilesWidget
  record: EntityRecord | undefined
}) {
  return (
    <div
      data-slot="overview-kpi-tiles"
      className={cn('grid items-start gap-4', KPI_GRID[widget.columns ?? 2])}
    >
      {widget.tiles.map((tile, index) => (
        <KpiTile
          key={tile.valueField ?? index}
          layout="stat"
          label={tile.label}
          value={readText(record, tile.valueField) ?? '—'}
          unit={tile.unit}
          icon={resolveOptionalIcon(tile.icon)}
          tone={tile.tone}
        />
      ))}
    </div>
  )
}

/* ── barChart ───────────────────────────────────────────────────────────────
 * Form: magnitude across an ordered set of categories (months) ⇒ vertical bars,
 * zero-based. ONE series, so there is deliberately no legend — the card title
 * names it (dataviz check 6) — and no per-bar value labels, since the value axis
 * plus the hover tooltip `BarChart` already ships carry the numbers. Colour is
 * the tenant's own `--color-primary` by default rather than a categorical
 * swatch: a single-series chart has no identities to distinguish, and binding it
 * to the brand token is what keeps FAMS blue out of a Qatar MME (#6E112D) build.
 */
export function BarChartWidget({
  widget,
  record,
}: {
  widget: OverviewBarChartWidget
  record: EntityRecord | undefined
}) {
  const rows = readRows(record, widget.seriesField)
  const categoryKey = widget.categoryKey ?? 'label'
  const valueKey = widget.valueKey ?? 'value'
  const label =
    widget.seriesLabel ?? widget.yAxisTitle ?? (typeof widget.title === 'string' ? widget.title : 'Value')

  return (
    <ChartCard
      key="bar"
      title={widget.title}
      icon={resolveOptionalIcon(widget.icon)}
      data-slot="overview-bar-chart"
    >
      <BarChart
        categories={rows.map((row) => String(row[categoryKey] ?? ''))}
        series={[
          {
            id: 'series',
            label,
            data: rows.map((row) => Number(row[valueKey] ?? 0)),
            color: widget.color ?? 'var(--color-primary)',
          },
        ]}
        legend={false}
        valueAxisMin={0}
        xAxisTitle={widget.xAxisTitle}
        yAxisTitle={widget.yAxisTitle}
        height={widget.height ?? 280}
        aria-label={typeof widget.title === 'string' ? widget.title : 'Bar chart'}
      />
    </ChartCard>
  )
}

/* ── eventList ──────────────────────────────────────────────────────────────
 * Frame anatomy: a titled card whose body is a stack of individually BORDERED
 * rows — leading tinted type glyph + event label on the start side, a
 * time-over-address meta pair on the end side. Not `CriticalEventsList`: that
 * composite states severity in a WORD chip on every row and uses one flat
 * bordered container, both of which the frame does not have. */
export function EventListWidget({
  widget,
  record,
  onSelect,
}: {
  widget: OverviewEventListWidget
  record: EntityRecord | undefined
  onSelect?: (eventId: string) => void
}) {
  const rows = readRows(record, widget.itemsField)
  const idKey = widget.idKey ?? 'id'
  const typeKey = widget.typeKey ?? 'type'
  const labelKey = widget.labelKey ?? 'label'
  const timeKey = widget.timeKey ?? 'time'
  const addressKey = widget.addressKey ?? 'address'
  const columnsLayout = widget.layout === 'columns'
  const iconsLayout = widget.layout === 'icons'

  if (iconsLayout) {
    return (
      <div data-slot="overview-event-list" className="flex flex-col divide-y divide-border">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-muted-foreground">
            {widget.emptyText ?? 'No events recorded.'}
          </p>
        ) : (
          rows.map((row, index) => {
            const kind = row[typeKey] == null ? undefined : String(row[typeKey])
            const id = row[idKey] == null ? String(index) : String(row[idKey])
            const tone: OverviewTone = (kind ? widget.toneMap?.[kind] : undefined) ?? 'neutral'
            const Glyph = resolveOptionalIcon((kind ? widget.iconMap?.[kind] : undefined) ?? widget.itemIcon)
            const label = row[labelKey] == null ? kind : String(row[labelKey])
            const time = row[timeKey] == null ? undefined : String(row[timeKey])
            const address = row[addressKey] == null ? undefined : String(row[addressKey])
            const interactive = Boolean(onSelect)
            const Row = interactive ? 'button' : 'div'
            return (
              <Row
                key={id}
                {...(interactive ? { type: 'button' as const, onClick: () => onSelect?.(id) } : {})}
                data-slot="overview-event-row"
                data-tone={tone}
                className={cn(
                  'flex w-full items-center justify-between gap-inline py-3 text-start first:pt-0 last:pb-0',
                  interactive && 'outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {/* `flex-1`: the event TYPE is the row's identity and must
                    not clip (finding: "Harsh Cornering" rendered as "Harsh
                    Corner…" while the trailing time/address block kept its
                    full width). The trailing block already truncates its own
                    address at `max-w-[16rem]`, so it yields the slack. */}
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  {Glyph ? <IconBadge icon={Glyph} tone={tone} shape="circle" size="md" /> : null}
                  {/* WRAPS, never truncates: the event TYPE is the row's
                      identity, and in a narrow split pane (list beside a map)
                      a two-word type like "Harsh Cornering" was clipping to
                      "Harsh Corner…". The trailing time/address block below
                      yields its slack first (`shrink`, not `shrink-0`). */}
                  <span className="text-body-md font-semibold text-balance text-foreground">{label ?? '—'}</span>
                </span>
                <span className="flex shrink flex-col items-end gap-1 text-caption text-muted-foreground">
                  {time ? (
                    <span className="flex items-center gap-1.5">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {time}
                    </span>
                  ) : null}
                  {address ? (
                    <span className="flex max-w-[16rem] items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{address}</span>
                    </span>
                  ) : null}
                </span>
              </Row>
            )
          })
        )}
      </div>
    )
  }

  if (columnsLayout) {
    return (
      <ChartCard title={widget.title} icon={resolveOptionalIcon(widget.icon)} data-slot="overview-event-list">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-muted-foreground">
            {widget.emptyText ?? 'No events recorded.'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => {
              const kind = row[typeKey] == null ? undefined : String(row[typeKey])
              const id = row[idKey] == null ? String(index) : String(row[idKey])
              const tone: OverviewTone = (kind ? widget.toneMap?.[kind] : undefined) ?? 'neutral'
              const Glyph = resolveOptionalIcon((kind ? widget.iconMap?.[kind] : undefined) ?? widget.itemIcon)
              const label = row[labelKey] == null ? kind : String(row[labelKey])
              const severityRaw = widget.severityKey ? row[widget.severityKey] : undefined
              const severityTone: OverviewTone =
                (typeof severityRaw === 'string' ? widget.severityToneMap?.[severityRaw] : undefined) ?? 'danger'
              const severityText =
                widget.severityLabel ?? (severityRaw == null ? undefined : String(severityRaw).toUpperCase())
              return (
                <div
                  key={id}
                  data-slot="overview-event-row"
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <span className="flex min-w-0 shrink-0 items-center gap-2 sm:basis-48">
                    {Glyph ? (
                      <Glyph aria-hidden="true" className={cn('size-4 shrink-0', TONE_INK[tone])} />
                    ) : null}
                    <span className="truncate text-body-sm font-semibold text-foreground">{label ?? '—'}</span>
                    {severityText != null ? (
                      <Badge variant={TONE_BADGE[severityTone]}>{severityText}</Badge>
                    ) : null}
                  </span>
                  <div
                    className={cn(
                      'grid gap-x-4 gap-y-2',
                      (widget.columns?.length ?? 0) >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2',
                    )}
                  >
                    {(widget.columns ?? []).map((column) => (
                      <div key={column.key} className="min-w-0">
                        <p className="truncate text-caption text-muted-foreground">{column.label}</p>
                        <p className="truncate text-body-sm font-medium text-foreground">
                          {row[column.key] == null ? '—' : String(row[column.key])}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={widget.title}
      icon={resolveOptionalIcon(widget.icon)}
      data-slot="overview-event-list"
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-muted-foreground">
          {widget.emptyText ?? 'No events recorded.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const kind = row[typeKey] == null ? undefined : String(row[typeKey])
            const id = row[idKey] == null ? String(index) : String(row[idKey])
            const tone: OverviewTone = (kind ? widget.toneMap?.[kind] : undefined) ?? 'neutral'
            const Glyph = resolveOptionalIcon((kind ? widget.iconMap?.[kind] : undefined) ?? widget.itemIcon)
            const label = row[labelKey] == null ? kind : String(row[labelKey])
            const time = row[timeKey] == null ? undefined : String(row[timeKey])
            const address = row[addressKey] == null ? undefined : String(row[addressKey])
            const interactive = Boolean(onSelect)
            const Row = interactive ? 'button' : 'div'
            return (
              <Row
                key={id}
                {...(interactive ? { type: 'button' as const, onClick: () => onSelect?.(id) } : {})}
                data-slot="overview-event-row"
                data-tone={tone}
                className={cn(
                  'flex w-full items-center justify-between gap-inline rounded-sm border border-border px-3 py-2.5 text-start',
                  interactive &&
                    'outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {Glyph ? (
                    <Glyph aria-hidden="true" className={cn('size-4 shrink-0', TONE_INK[tone])} />
                  ) : null}
                  <span className="truncate text-body-sm font-semibold text-foreground">{label ?? '—'}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 text-caption text-muted-foreground">
                  {time ? <span>{time}</span> : null}
                  {address ? <span className="max-w-[16rem] truncate">{address}</span> : null}
                </span>
              </Row>
            )
          })}
        </div>
      )}
    </ChartCard>
  )
}

/**
 * The map widget's OVERLAY furniture — the frame's status pill (top-start), the
 * "Current Location" card with an open-in-new action (bottom-start), and the
 * zoom ±/fullscreen control stack (bottom-end). Rendered by `OverviewWidgets`
 * over the lazily-loaded `LocationMap`, so this file stays free of the
 * `maplibre-gl`/`deck.gl` import chain.
 */
export function LocationMapStatusPill({ label, tone }: { label: string; tone: OverviewTone }) {
  return <StatusPill color={TONE_FILL_VAR[tone]}>{label}</StatusPill>
}

export function LocationMapAddressCard({
  address,
  strings,
  onOpen,
}: {
  address: string
  strings: OverviewLocationCardStrings
  onOpen?: () => void
}) {
  return (
    <div
      data-slot="overview-location-card"
      className="flex max-w-[20rem] items-start gap-2 rounded-sm border border-border bg-card px-3 py-2 shadow-md"
    >
      <div className="min-w-0">
        <p className="truncate text-caption text-muted-foreground">{strings.title}</p>
        <p className="truncate text-body-sm font-semibold text-foreground">{address}</p>
      </div>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={strings.openLabel}
          title={strings.openLabel}
          className="grid size-6 shrink-0 place-items-center rounded-xs text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Zoom ±/fullscreen stack. `LocationMap` forwards `controls` straight to
 * `MapPanel`, whose own cluster is fixed at `bottom-end` with a compass this
 * frame does not show — so the map is rendered with `controls={false}` and these
 * three buttons take its place, each delegating to a caller-supplied handler
 * (state-agnostic, Rule 8: this component never holds a camera).
 */
export function LocationMapControls({
  strings,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: {
  strings: OverviewLocationCardStrings
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFullscreen?: () => void
}) {
  const buttons: [string, LucideIcon, (() => void) | undefined][] = [
    [strings.zoomInLabel, Plus, onZoomIn],
    [strings.zoomOutLabel, Minus, onZoomOut],
    [strings.fullscreenLabel, Maximize2, onFullscreen],
  ]
  return (
    <div data-slot="overview-location-controls" className="flex flex-col gap-2">
      {buttons.map(([label, Glyph, handler]) =>
        handler ? (
          <button
            key={label}
            type="button"
            onClick={handler}
            aria-label={label}
            title={label}
            className="grid size-8 place-items-center rounded-sm border border-border bg-card text-foreground shadow-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Glyph aria-hidden="true" className="size-4" />
          </button>
        ) : null,
      )}
    </div>
  )
}
