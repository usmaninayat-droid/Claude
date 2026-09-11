import {
  KpiMetricCard,
  RouteJobCard,
  StatusBreakdownCard,
  type KpiMetricCardBadge,
  type KpiMetricCardTone,
  type RouteJobCardBannerTone,
  type StatusBreakdownRow,
  type StatusBreakdownStat,
} from '@fams/ui-kit'
import { registerComponent, type ReadRendererProps } from '@fams/v5-composer'

/**
 * register-cockpit — blueprint-name registration for the cockpit-wave
 * ui-kit composites, into `@fams/v5-composer`'s named-component READ
 * registry (`registerComponent`, `fields/registry.tsx`). That registry
 * starts empty of concrete names BY DESIGN (no product vocabulary in the
 * composer core) — the tier-2 patterns package is where names get bound,
 * exactly like `creation-sheet/register-widgets.ts` does for edit widgets.
 *
 * A blueprint field placement opts in with
 * `component: { name: 'KpiMetricCard', props: {...} }` etc.; `props` is
 * plain JSON (blueprint-authorable), never a React node.
 *
 * Exposed as a CALLABLE function and invoked at the top level of
 * `CockpitView.tsx` — never a bare side-effect import, which this
 * `"sideEffects": false` package's bundler is licensed to drop (the
 * tree-shaking trap `register-widgets.ts` documents).
 */

const TONES: ReadonlySet<string> = new Set(['primary', 'success', 'warning', 'danger', 'info', 'neutral'])
const BADGE_TONES: ReadonlySet<string> = new Set(['up', 'down', 'success', 'warning', 'link', 'neutral'])
const BANNER_TONES: ReadonlySet<string> = new Set(['warning', 'danger', 'info'])

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined
}

function toTone(value: unknown): KpiMetricCardTone | undefined {
  return typeof value === 'string' && TONES.has(value) ? (value as KpiMetricCardTone) : undefined
}

function toBadge(value: unknown): KpiMetricCardBadge | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  const label = str(raw.label)
  if (!label) return undefined
  const tone = typeof raw.tone === 'string' && BADGE_TONES.has(raw.tone) ? (raw.tone as KpiMetricCardBadge['tone']) : undefined
  return { label, tone }
}

function recordText(record: Record<string, unknown> | undefined, col: unknown): string | undefined {
  if (!record || typeof col !== 'string') return undefined
  const value = record[col]
  return value == null || value === '' ? undefined : String(value)
}

/** `component: { name: 'KpiMetricCard', props: { accent?, badge? } }` — the
 *  field's own value is the big number; the field label is the card label. */
function ReadKpiMetricCard({ descriptor, value }: ReadRendererProps) {
  const props = descriptor.component?.props ?? {}
  return (
    <KpiMetricCard
      value={value == null || value === '' ? '0' : String(value)}
      label={str(props.label) ?? descriptor.label}
      accent={toTone(props.accent)}
      badge={toBadge(props.badge)}
    />
  )
}

/** `component: { name: 'RouteJobCard', props: { subtitleCol?, progressCol?,
 *  progressLabelCol?, plannedCol?, actualCol?, bannerCol?, bannerToneCol?,
 *  statusLabelCol?, statusColorCol? } }` — the field's value is the card
 *  title; every other facet reads a sibling column off the record. */
function ReadRouteJobCard({ descriptor, value, record }: ReadRendererProps) {
  const props = descriptor.component?.props ?? {}
  const rec = record as Record<string, unknown> | undefined
  const progressRaw = recordText(rec, props.progressCol)
  const progress = progressRaw === undefined ? undefined : Number(progressRaw)
  const bannerText = recordText(rec, props.bannerCol)
  const bannerTone = recordText(rec, props.bannerToneCol)
  const statusLabel = recordText(rec, props.statusLabelCol)
  return (
    <RouteJobCard
      title={value == null || value === '' ? (descriptor.label ?? '') : String(value)}
      subtitle={recordText(rec, props.subtitleCol)}
      status={statusLabel ? { label: statusLabel, color: recordText(rec, props.statusColorCol) } : undefined}
      progressPct={progress !== undefined && Number.isFinite(progress) ? progress : undefined}
      progressLabel={recordText(rec, props.progressLabelCol)}
      plannedLabel={recordText(rec, props.plannedCol)}
      actualLabel={recordText(rec, props.actualCol)}
      banner={
        bannerText
          ? { tone: (BANNER_TONES.has(bannerTone ?? '') ? bannerTone : 'warning') as RouteJobCardBannerTone, text: bannerText }
          : undefined
      }
    />
  )
}

interface BreakdownValue {
  rows?: StatusBreakdownRow[]
  stats?: StatusBreakdownStat[]
  total?: number
}

/** `component: { name: 'StatusBreakdownCard', props: { title?, emptyLabel? } }`
 *  — the field's value is `{ rows, stats?, total? }` (or a bare rows array). */
function ReadStatusBreakdownCard({ descriptor, value }: ReadRendererProps) {
  const props = descriptor.component?.props ?? {}
  const shaped: BreakdownValue = Array.isArray(value) ? { rows: value as StatusBreakdownRow[] } : ((value ?? {}) as BreakdownValue)
  return (
    <StatusBreakdownCard
      title={str(props.title) ?? descriptor.label}
      rows={Array.isArray(shaped.rows) ? shaped.rows : []}
      stats={Array.isArray(shaped.stats) ? shaped.stats : undefined}
      total={typeof shaped.total === 'number' ? shaped.total : undefined}
      emptyLabel={str(props.emptyLabel)}
    />
  )
}

let registered = false

/** Registers the cockpit composites' blueprint names (idempotent). */
export function registerCockpitComponents(): void {
  if (registered) return
  registered = true
  registerComponent('KpiMetricCard', ReadKpiMetricCard)
  registerComponent('RouteJobCard', ReadRouteJobCard)
  registerComponent('StatusBreakdownCard', ReadStatusBreakdownCard)
}
