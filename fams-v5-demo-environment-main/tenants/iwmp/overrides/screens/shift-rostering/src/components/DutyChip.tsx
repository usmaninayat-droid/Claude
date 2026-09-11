import { Icon } from '@fams/ui-kit/icons'
import { cellLabel, dutyPresentation } from '../lib/duty-presentation'
import type { Eligibility, RosterCell } from '../data/types'

export interface DutyChipProps {
  cell: RosterCell | null
  /** Eligibility verdict for an RT cell — drives the amber/red ring + icon. */
  eligibility?: Eligibility
  saving?: boolean
  className?: string
}

/**
 * A small, SPELLED-OUT duty pill — the compact stand-in used where the full
 * `DutyCard` doesn't fit (popover header, the assign dialog's current-duty
 * slot, the drag ghost). Colour comes only from the `.tone-*` classes, which
 * resolve to `@fams/tokens` variables; text is the full duty name, never a
 * cryptic code.
 */
export function DutyChip({ cell, eligibility, saving, className = '' }: DutyChipProps) {
  if (!cell) {
    return (
      <span className={`inline-flex h-7 items-center rounded-md border border-dashed border-border px-2 text-caption text-muted-foreground ${className}`}>
        Unassigned
      </span>
    )
  }
  const { label, tone } = dutyPresentation(cell)
  const verdict = cell.code === 'RT' && eligibility ? (!eligibility.ok ? 'block' : eligibility.warns.length ? 'warn' : '') : ''
  const icon = verdict === 'block' ? 'alert-circle' : verdict === 'warn' ? 'alert-triangle' : null

  return (
    <span
      className={`tone-${tone} relative inline-flex h-7 max-w-full items-center gap-1 rounded-md border px-2 text-xs font-semibold ${verdict === 'block' ? 'ring-2 ring-error-500' : verdict === 'warn' ? 'ring-2 ring-warning' : ''} ${className}`}
      style={{ color: 'var(--tone-fg)', background: 'var(--tone-bg)', borderColor: 'var(--tone-bd)' }}
      title={cellLabel(cell)}
    >
      {icon && <Icon name={icon} size={12} aria-hidden />}
      <span className="truncate">{label}</span>
      {saving && <span className="ms-0.5 size-1.5 shrink-0 animate-pulse rounded-full bg-current opacity-70" aria-hidden />}
    </span>
  )
}
