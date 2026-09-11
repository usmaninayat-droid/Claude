import { useMemo, useState } from 'react'
import {
  ActivityFeed,
  BarChart,
  KpiMetricCard,
  Stack,
  StatusBreakdownCard,
  type ActivityFeedEntry,
  type KpiMetricCardProps,
} from '@fams/ui-kit'
import { Activity, MapPin, Users } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { WorkforcePulseRoster } from './WorkforcePulseRoster'
import { ConsoleDrillSheet, type ConsoleDrill } from './ConsoleDrillSheet'
import { ageCol, ageMinutes, cellText, columnLabel, formatAge, identityCol } from './console-model'
import {
  breakdownCols,
  coverageCol,
  personCol,
  presenceCol,
  pulseBreakdowns,
  pulseCoverage,
  pulseRoster,
} from './workforce-model'

/**
 * WorkforcePulseView — the `workforce-pulse` view kind. [tier-2 pattern]
 *
 * The people half of an operations centre: **who is on**, **where they are**,
 * and **what just happened**. Ported by intent from the IFM workforce app's
 * own "Workforce Pulse" surface (Operations Center › Workforce Pulse), which
 * composes the dispatcher-cockpit shell for an HR framing — a KPI metric row
 * over a status-panel band over a coverage chart paired with a live check-in
 * feed. That composition is reproduced here from `@fams/ui-kit` pieces; none
 * of that app's code is imported (it is a separate app on a vendored DS), and
 * none of its vocabulary is either.
 *
 * ## Composition, top to bottom
 *
 * 1. **KPI metric row** (`KpiMetricCard`) — headcount, on-duty count from the
 *    presence axis, the count needing attention, and open assignments.
 * 2. **Breakdown band** (`StatusBreakdownCard`) — one panel per
 *    classification axis the blueprint exposes (`breakdownCols`), each a
 *    counted proportion list. This is the generic form of that app's
 *    Presence / Check-in Channels / Site Coverage trio: which axes exist is
 *    the module's metadata, not this template's opinion.
 * 3. **Coverage chart** (`BarChart`) — headcount per location-ish column
 *    (`coverageCol`), the "on site right now, by site" reading.
 * 4. **Activity feed** (`ActivityFeed`, read-only) — the most recent records
 *    as events, newest first, each carrying its person and its presence
 *    verdict as the entry's tone. The generic form of the check-in feed.
 * 5. **Roster table** — the people set with their assignment counts.
 *
 * Every KPI card is CLICKABLE and opens the drill-in sheet
 * (`ConsoleDrillSheet`) over that card's own population — the target
 * surface's signature interaction, and the same rule `CockpitView`'s
 * `kpiPopulation` already encodes: a tile's number must be verifiable from
 * the rows the tile opens.
 *
 * ## Where the people come from
 *
 * `pulseRoster` prefers a real roster: when the blueprint links a
 * `workforce/*` entity and the HOST hands those records in
 * (`peopleConfig`/`peopleRecords` — the same optional cross-module seam
 * `LiveHybridView` already takes for incidents), every count is a headcount.
 * With no roster wired it derives people from this module's own records via
 * the person-bearing column, deduplicated — the honest reading, and it means
 * the lens works on any module that names a person.
 *
 * State-agnostic (root rule 8) — props in, intent out.
 */
export interface WorkforcePulseViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /** The linked workforce module's config, when the host wires the roster. */
  peopleConfig?: EntityConfig
  /** The linked workforce records — the real roster. */
  peopleRecords?: EntityRecord[]
  /** Opens a record's own detail surface. */
  onOpenRecord?: (record: EntityRecord) => void
  /** Presence values that read as "needs attention" (drives one KPI + the
   *  feed tone). Omit → nothing is flagged rather than guessing a bad state. */
  attentionStates?: readonly string[]
  loading?: boolean
  className?: string
}

/** How many records the activity feed shows. */
const FEED_LIMIT = 12

/** Positional segment tones for the breakdown bars — see their usage note. */
const BREAKDOWN_TONES = ['info', 'success', 'warning', 'danger', 'neutral'] as const

export function WorkforcePulseView({
  config,
  records,
  peopleConfig,
  peopleRecords,
  onOpenRecord,
  attentionStates,
  loading,
  className,
}: WorkforcePulseViewProps) {
  const [scopeCol, setScopeCol] = useState<{ col: string; value: string } | null>(null)
  const [drill, setDrill] = useState<ConsoleDrill | null>(null)

  const presence = presenceCol(config)
  const person = personCol(config)
  const age = ageCol(config)
  const identity = identityCol(config)

  const scoped = useMemo(() => {
    if (!scopeCol) return records
    return records.filter((record) => String(record[scopeCol.col] ?? '') === scopeCol.value)
  }, [records, scopeCol])

  const roster = useMemo(
    () => pulseRoster(config, scoped, peopleRecords, peopleConfig),
    [config, scoped, peopleRecords, peopleConfig],
  )

  const attention = useMemo(() => {
    if (!presence || !attentionStates?.length) return []
    return scoped.filter((record) => attentionStates.includes(String(record[presence] ?? '')))
  }, [scoped, presence, attentionStates])

  /** A KPI card plus the population its drill sheet must show. */
  const kpis = useMemo<(KpiMetricCardProps & { drill: ConsoleDrill })[]>(() => {
    const personLabel = person ? columnLabel(config, person) : 'People'
    const cards: (KpiMetricCardProps & { drill: ConsoleDrill })[] = [
      {
        value: String(roster.length),
        label: personLabel,
        accent: 'primary',
        // The roster tile's population is the ASSIGNMENTS those people are
        // on — the drill sheet renders module records, and one person maps to
        // one-or-more of them.
        drill: { label: personLabel, records: roster.flatMap((entry) => entry.records) },
      },
      {
        value: String(scoped.length),
        // "Open records", not `Open ${config.name}` — a module name is a
        // PLACE ("Operations Center"), so interpolating it reads as
        // "Open Operations Center" rather than naming a count.
        label: 'Open records',
        accent: 'info',
        drill: { label: 'Open records', records: scoped },
      },
    ]
    if (presence) {
      const reported = scoped.filter((record) => String(record[presence] ?? '') !== '')
      const label = `${columnLabel(config, presence)} reported`
      cards.splice(1, 0, {
        value: String(reported.length),
        label,
        accent: 'success',
        drill: { label, records: reported },
      })
    }
    if (attentionStates?.length) {
      cards.push({
        value: String(attention.length),
        label: 'Needs attention',
        accent: attention.length ? 'danger' : 'neutral',
        drill: { label: 'Needs attention', records: attention },
      })
    }
    return cards
  }, [roster, scoped, presence, person, config, attention, attentionStates])

  const breakdowns = useMemo(
    () => pulseBreakdowns(config, scoped, breakdownCols(config)),
    [config, scoped],
  )
  const coverage = useMemo(() => pulseCoverage(scoped, coverageCol(config, records)), [
    scoped,
    config,
    records,
  ])

  const feed = useMemo<ActivityFeedEntry[]>(() => {
    const ordered = age
      ? [...scoped].sort((a, b) => (ageMinutes(a, age) ?? 0) - (ageMinutes(b, age) ?? 0))
      : scoped
    return ordered.slice(0, FEED_LIMIT).map((record) => {
      const mins = age ? ageMinutes(record, age) : undefined
      const state = presence ? cellText(record, presence) : undefined
      const entry: ActivityFeedEntry = {
        id: record.id,
        kind: 'system',
        author: person ? cellText(record, person) : undefined,
        text: cellText(record, identity),
        tone:
          state && attentionStates?.includes(state)
            ? 'warning'
            : state
              ? 'success'
              : 'neutral',
      }
      if (mins !== undefined) entry.timestamp = `${formatAge(mins)} ago`
      if (state && state !== '—') entry.badge = { label: state }
      return entry
    })
  }, [scoped, age, presence, person, identity, attentionStates])

  const panelIcons = [Activity, MapPin, Users]

  return (
    <div
      data-slot="workforce-pulse"
      className={cn('flex h-full min-h-0 flex-col overflow-y-auto @container', className)}
    >
      <Stack gap="section" className="p-section">
        <div data-slot="pulse-kpis" className="grid grid-cols-2 gap-field @3xl:grid-cols-4">
          {kpis.map(({ drill: population, ...kpi }, i) => (
            <KpiMetricCard
              key={`${kpi.label}-${i}`}
              {...kpi}
              clickable
              onClick={() => setDrill(population)}
            />
          ))}
        </div>

        {breakdowns.length > 0 && (
          <div data-slot="pulse-panels" className="grid grid-cols-1 gap-field @3xl:grid-cols-2">
            {breakdowns.map((panel, i) => (
              <StatusBreakdownCard
                key={panel.id}
                title={panel.title}
                icon={panelIcons[i % panelIcons.length]}
                // The SAME rows drive both halves of the card: the stat
                // columns give each category its own readable number, the
                // rows give the one cumulative proportion bar underneath.
                // Passing only `rows` would leave the numbers to be inferred
                // from segment widths, which is what the reference surface
                // pairs its stats with a bar precisely to avoid.
                stats={panel.rows.map((row) => ({ id: row.id, label: row.label, value: row.count }))}
                // Tones cycle through the semantic set so a multi-category
                // bar reads as distinct segments rather than one grey block.
                // Purely a segmentation aid, never the only encoding (V12):
                // every category's own number sits directly above it, and
                // the legend row under the bar repeats label + count. The
                // order is positional, so nothing here claims that a given
                // category IS good or bad — that judgement is the module's
                // `statusList`, which the other three consoles read.
                rows={panel.rows.map((row, r) => ({ ...row, tone: BREAKDOWN_TONES[r % BREAKDOWN_TONES.length] }))}
                emptyLabel="No data"
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-field @4xl:grid-cols-3">
          {coverage.categories.length > 0 && (
            <div className="rounded-md border border-border bg-card p-section @4xl:col-span-2">
              <h3 className="text-body-lg font-semibold text-foreground">Coverage</h3>
              <p className="pb-field text-body-sm text-muted-foreground">
                Headcount per {columnLabel(config, coverageCol(config, records) ?? '').toLowerCase()}.
              </p>
              <BarChart
                categories={coverage.categories}
                series={[{ id: 'coverage', label: 'On duty', data: coverage.counts, color: 'var(--color-primary)' }]}
                showValues
                loading={loading}
                height={320}
                aria-label={`Headcount per ${columnLabel(config, coverageCol(config, records) ?? '')}`}
              />
            </div>
          )}
          <div
            className={cn(
              'flex min-h-0 flex-col rounded-md border border-border bg-card',
              coverage.categories.length === 0 && '@4xl:col-span-3',
            )}
          >
            <div className="border-b border-border p-section">
              <h3 className="text-body-lg font-semibold text-foreground">Recent activity</h3>
              <p className="text-body-sm text-muted-foreground">
                The latest records with their person and reported state.
              </p>
            </div>
            <div className="max-h-[32rem] overflow-y-auto p-section">
              <ActivityFeed entries={feed} emptyLabel="Nothing reported yet." />
            </div>
          </div>
        </div>

        <WorkforcePulseRoster
          config={config}
          roster={roster}
          personLabel={person ? columnLabel(config, person) : 'People'}
          scope={scopeCol}
          onScopeChange={setScopeCol}
          onOpenRecord={onOpenRecord}
          loading={loading}
        />
      </Stack>

      <ConsoleDrillSheet
        config={config}
        drill={drill}
        onClose={() => setDrill(null)}
        onOpenRecord={onOpenRecord}
      />
    </div>
  )
}

WorkforcePulseView.displayName = 'WorkforcePulseView'
