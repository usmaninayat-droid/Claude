import { useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Icon,
  MoreVertical,
  Siren,
} from '@fams/ui-kit/icons'
import {
  ComplianceGauge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { RecordTable, type RecordTableColumn } from './RecordTable'
import { cn } from '../lib/cn'

/**
 * ComplianceTable — a certification/compliance tab body over one of the
 * record's own embedded arrays (Figma "Tadweer — Launch Pad", node
 * 6557:19850, the workforce profile's Training tab). [tier-2 pattern]
 *
 * Layout, top to bottom:
 *  1. Alert band — only while at least one row sits in a `criticalBuckets`
 *     bucket: "{count} … expired or missing … until {codes} renewed" with a
 *     muted "Renew ›" trailing CTA. Same chrome as the shift-rostering
 *     `.alert` / `ModuleAlertBar`.
 *  2. Two cards: a `ComplianceGauge` (score = share of rows in the `valid`
 *     bucket) and a "Compliance Summary" card — four stat columns (one per
 *     bucket, tone-coloured numbers, hairline dividers), a categorical
 *     filter trigger ("All Course") and a stacked bar of the same four
 *     shares.
 *  3. A section label ("Required for Role – {role}").
 *  4. `RecordTable` over the same rows — status pill column, trailing pencil
 *     header, per-row `…` kebab.
 *
 * Everything module-specific is authored on `props` as field-key indirection
 * (rule 10 — the vocabulary is generic: buckets/statuses/categories, not
 * trainings/drivers). `buckets` maps each of the four summary slots to the
 * stored status values that belong in it, so any module with a lifecycle
 * status can render this tab. State-agnostic (Rule 8): derives everything
 * from the `record` it is handed; the category filter and the row/renew
 * actions are local UI state and demo toasts.
 */

export type ComplianceBucketKey = 'valid' | 'expiring' | 'expired' | 'blocked'

export interface ComplianceTableProps {
  /** Record field holding the row array (e.g. `trainings`). */
  field: string
  record?: EntityRecord
  /** Column contract — `RecordTable`'s own. */
  columns: RecordTableColumn[]
  /** Row key holding the lifecycle status. Default `status`. */
  statusKey?: string
  /** Stored status values per summary bucket. */
  buckets: Partial<Record<ComplianceBucketKey, string[]>>
  /** Display labels per bucket (defaults: Valid / Expiring / Expired / Blocked). */
  bucketLabels?: Partial<Record<ComplianceBucketKey, string>>
  /** Buckets whose rows trigger the alert band. Default `['expired', 'blocked']`. */
  criticalBuckets?: ComplianceBucketKey[]
  /** `statusPill` fill lookup by raw value (raw-hex escape hatch, same as `RecordTable`). */
  statusColors?: Record<string, string>
  /** `statusPill` label lookup by raw value (e.g. `Blocked` → "Blocks Dispatch"). */
  statusLabels?: Record<string, string>
  /** Row key printed in the alert's `{codes}` list. Default `id`. */
  codeKey?: string
  /** Record field holding the role/segment named in `sectionLabel`. */
  roleField?: string
  /** Template for the section label; `{role}` interpolates `roleField`. */
  sectionLabel?: string
  /** Alert band copy. `{count}`, `{codes}`, `{role}`, `{s}` (plural s), `{are}` (is/are) interpolate. */
  alert?: { message: string; ctaLabel?: string; ctaToast?: string }
  /** Gauge caption. Default "Compliance Score". */
  scoreLabel?: string
  /** Summary card title. Default "Compliance Summary". */
  summaryTitle?: string
  /** Row key the summary card's category filter partitions on (e.g. `vehicleCategory`). Omit for no filter trigger. */
  categoryKey?: string
  /** Label of the filter's "everything" option. Default "All". */
  categoryAllLabel?: string
  /** Per-row `…` menu entries; each fires a demo toast naming the row. Omit for no kebab. */
  rowActions?: { label: string; toast?: string }[]
  /** Trailing header pencil. Default on. */
  headerEdit?: boolean
  emptyText?: string
  className?: string
}

const BUCKET_ORDER: ComplianceBucketKey[] = ['valid', 'expiring', 'expired', 'blocked']
const DEFAULT_BUCKET_LABELS: Record<ComplianceBucketKey, string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  blocked: 'Blocked',
}
// Tone per bucket — the number in the summary card and the matching
// stacked-bar segment share one colour so the two read as one figure.
// `blocked` is deliberately NEUTRAL (Figma `--default-text/normal`): it is a
// count of things missing, not a third alarm colour next to red.
const BUCKET_TEXT: Record<ComplianceBucketKey, string> = {
  valid: 'text-success',
  expiring: 'text-warning',
  expired: 'text-error-500',
  blocked: 'text-muted-foreground-strong',
}
const BUCKET_BAR: Record<ComplianceBucketKey, string> = {
  valid: 'bg-success',
  expiring: 'bg-warning',
  expired: 'bg-error-500',
  blocked: 'bg-muted-foreground',
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function ComplianceTable({
  field,
  record,
  columns,
  statusKey = 'status',
  buckets,
  bucketLabels,
  criticalBuckets = ['expired', 'blocked'],
  statusColors,
  statusLabels,
  codeKey = 'id',
  roleField,
  sectionLabel,
  alert,
  scoreLabel = 'Compliance Score',
  summaryTitle = 'Compliance Summary',
  categoryKey,
  categoryAllLabel = 'All',
  rowActions,
  headerEdit = true,
  emptyText,
  className,
}: ComplianceTableProps) {
  const [category, setCategory] = useState<string | null>(null)

  const rows = useMemo(() => {
    const raw = record?.[field]
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  }, [record, field])

  const bucketOf = (row: Record<string, unknown>): ComplianceBucketKey | null => {
    const s = String(row[statusKey] ?? '')
    for (const key of BUCKET_ORDER) if (buckets[key]?.includes(s)) return key
    return null
  }

  const counts = useMemo(() => {
    const c: Record<ComplianceBucketKey, number> = { valid: 0, expiring: 0, expired: 0, blocked: 0 }
    for (const r of rows) {
      const b = bucketOf(r)
      if (b) c[b] += 1
    }
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, statusKey, buckets])

  const total = rows.length
  const score = total ? Math.round((counts.valid / total) * 100) : 0
  const critical = rows.filter((r) => {
    const b = bucketOf(r)
    return b ? criticalBuckets.includes(b) : false
  })
  const role = roleField ? String(record?.[roleField] ?? '') : ''
  const labels = { ...DEFAULT_BUCKET_LABELS, ...bucketLabels }

  const categories = useMemo(() => {
    if (!categoryKey) return []
    const seen = new Set<string>()
    for (const r of rows) {
      const v = r[categoryKey]
      if (v != null && v !== '') seen.add(String(v))
    }
    return [...seen]
  }, [rows, categoryKey])
  const visibleRows = category && categoryKey ? rows.filter((r) => String(r[categoryKey]) === category) : rows

  const codes = critical.map((r) => String(r[codeKey] ?? '')).filter(Boolean)
  const alertVars = {
    count: critical.length,
    codes: codes.join(', '),
    role: role.toLowerCase(),
    s: critical.length === 1 ? '' : 's',
    are: critical.length === 1 ? 'is' : 'are',
  }

  const renderRowActions = rowActions?.length
    ? (row: Record<string, unknown>) => (
        <span
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Row actions"
              className="grid size-8 place-items-center rounded-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {rowActions.map((a) => (
                <DropdownMenuItem
                  key={a.label}
                  onSelect={() =>
                    toast(a.label, {
                      description: fill(a.toast ?? '{label} — {code}', {
                        label: a.label,
                        code: String(row[codeKey] ?? ''),
                      }),
                    })
                  }
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      )
    : undefined

  if (total === 0) {
    return (
      <p className="text-body-sm text-muted-foreground">{emptyText ?? 'No records.'}</p>
    )
  }

  return (
    <div data-slot="compliance-table" className={cn('flex flex-col gap-4', className)}>
      {alert && critical.length > 0 ? (
        <button
          type="button"
          onClick={() =>
            toast(alert.ctaLabel ?? 'Renew', {
              description: alert.ctaToast ? fill(alert.ctaToast, alertVars) : `Renewal started for ${codes.join(', ')}.`,
            })
          }
          className="flex w-full items-center justify-between gap-3 rounded-sm border border-error-100 bg-error-50 py-2 ps-3 pe-2 text-start outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex flex-1 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-error-600"
            >
              <Siren className="size-3.5" />
            </span>
            <span className="text-body-sm font-semibold text-foreground">{fill(alert.message, alertVars)}</span>
          </span>
          <span className="flex items-center gap-1 rounded-xs px-2 py-1">
            <span className="text-caption font-semibold text-muted-foreground">{alert.ctaLabel ?? 'Renew'}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[14.5rem_1fr]">
        <div className="flex items-center justify-center rounded-md border border-border bg-card p-4">
          <ComplianceGauge
            value={score}
            unit=""
            size="sm"
            label={scoreLabel}
            aria-label={`${scoreLabel}: ${score} percent`}
          />
        </div>

        <section className="flex flex-col rounded-md border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-success-scale-50 text-success"
              >
                <CheckCircle className="size-4" />
              </span>
              <h3 className="whitespace-nowrap text-body-md font-semibold text-foreground">{summaryTitle}</h3>
            </div>
            {categoryKey && categories.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                  {category ?? categoryAllLabel}
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setCategory(null)}>{categoryAllLabel}</DropdownMenuItem>
                  {categories.map((c) => (
                    <DropdownMenuItem key={c} onSelect={() => setCategory(c)}>
                      {c}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </header>
          <div className="flex flex-col gap-4 p-4">
            <dl className="grid grid-cols-4">
              {BUCKET_ORDER.map((key, i) => (
                <div
                  key={key}
                  className={cn(
                    'flex flex-col items-center gap-1 py-1',
                    i > 0 && 'border-s border-border',
                  )}
                >
                  <dt className="text-body-sm text-muted-foreground">{labels[key]}</dt>
                  <dd className={cn('text-h4 font-semibold', BUCKET_TEXT[key])}>{pad2(counts[key])}</dd>
                </div>
              ))}
            </dl>
            <div
              role="img"
              aria-label={BUCKET_ORDER.map((k) => `${labels[k]} ${counts[k]}`).join(', ')}
              className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
            >
              {BUCKET_ORDER.filter((k) => counts[k] > 0).map((k) => (
                <span
                  key={k}
                  className={cn('h-full rounded-full', BUCKET_BAR[k])}
                  style={{ width: `${(counts[k] / total) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {sectionLabel ? (
        <p className="text-body-sm font-medium text-secondary-foreground-strong">
          {fill(sectionLabel, { role: role || '—' })}
        </p>
      ) : null}

      <RecordTable
        rows={visibleRows}
        columns={columns}
        statusColors={statusColors}
        statusLabels={statusLabels}
        trailingAction={
          headerEdit
            ? {
                icon: <Icon name="pencil-01" className="size-4" aria-hidden="true" />,
                ariaLabel: 'Edit columns',
                onClick: () => toast('Edit columns', { description: 'Column editing is not wired in this demo.' }),
              }
            : undefined
        }
        rowActions={renderRowActions}
      />
    </div>
  )
}

ComplianceTable.displayName = 'ComplianceTable'
