import { Badge, Button, Popover, PopoverAnchor, PopoverContent, Separator } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { categoryOf, dutyOf } from '../data/masters'
import type { Eligibility, Employee, Route, RosterCell } from '../data/types'
import { fmtDayLong } from '../lib/format'
import { DutyChip } from './DutyChip'

export interface CellPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The gridcell element to anchor to. */
  anchor: HTMLElement
  employee: Employee
  day: string
  cell: RosterCell | null
  route?: Route
  eligibility?: Eligibility
  isLocked: boolean
  isPast: boolean
  onChange: () => void
  onClear: () => void
  onCopy: () => void
  onChangeRequest: () => void
}

/**
 * Quick-edit popover on cell click — the brief's "contextual popover without
 * breaking calendar focus". It READS the cell (duty, reference, the exact
 * eligibility reasons ELG-04 says must be shown at the cell) and offers the
 * three cheap actions; the full assignment surface is a Dialog (ELG-05).
 *
 * On a published week it becomes the change-request affordance (BR-10) rather
 * than disappearing — a locked cell must still explain itself.
 */
export function CellPopover({
  open, onOpenChange, anchor, employee: e, day, cell, route, eligibility, isLocked, isPast,
  onChange, onClear, onCopy, onChangeRequest,
}: CellPopoverProps) {
  const duty = cell ? dutyOf(cell.code) : undefined
  const cat = route ? categoryOf(route.cat) : undefined
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent align="start" sideOffset={6} className="w-80 p-0" onOpenAutoFocus={(ev) => ev.preventDefault()}>
        <div className="flex items-start gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{e.name}</p>
            <p className="text-caption text-muted-foreground">{fmtDayLong(day)} · {e.desig} · {e.shift}</p>
          </div>
          <div className="w-24 shrink-0">
            <DutyChip cell={cell} {...(eligibility ? { eligibility } : {})} />
          </div>
        </div>

        <Separator />

        <div className="space-y-2 p-3 text-xs">
          {cell ? (
            <>
              <p className="font-medium text-foreground">{duty?.name}{cell.ref && cell.code !== 'RT' ? ` · ${cell.ref}` : ''}</p>
              {route && (
                <p className="text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">{route.id}</span> · {cat?.name} · {route.shift} · {route.freq} · {route.district}
                </p>
              )}
              {eligibility && !eligibility.ok && (
                <ul className="space-y-1 rounded-md bg-error-50 p-2 text-error-700">
                  {eligibility.reasons.map((r) => <li key={r} className="flex gap-1.5"><Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />{r}</li>)}
                </ul>
              )}
              {eligibility && eligibility.ok && eligibility.warns.length > 0 && (
                <ul className="space-y-1 rounded-md bg-warning-scale-50 p-2 text-warning-scale-700">
                  {eligibility.warns.map((w) => <li key={w} className="flex gap-1.5"><Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />{w}</li>)}
                </ul>
              )}
              {eligibility && eligibility.ok && eligibility.warns.length === 0 && cell.code === 'RT' && (
                <Badge variant="success" size="sm"><Icon name="check" size={12} /> Eligible</Badge>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No duty on this day — pending rostering.</p>
          )}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-1.5 p-2">
          {isLocked ? (
            <>
              <p className="flex w-full items-center gap-1.5 px-1 pb-1 text-caption text-muted-foreground"><Icon name="lock-01" size={12} /> Week is published and locked.</p>
              <Button size="sm" variant="secondary" onClick={onChangeRequest}><Icon name="send-01" size={14} /> Raise change request</Button>
            </>
          ) : isPast ? (
            <p className="flex items-center gap-1.5 px-1 text-caption text-muted-foreground"><Icon name="clock" size={12} /> This day has passed — read only.</p>
          ) : (
            <>
              <Button size="sm" variant="primary" onClick={onChange}><Icon name="edit-04" size={14} /> {cell ? 'Change duty' : 'Assign duty'}</Button>
              {cell && <Button size="sm" variant="secondary" onClick={onCopy}><Icon name="copy-01" size={14} /> Copy</Button>}
              {cell && cell.code !== 'AV' && cell.code !== 'EL' && (
                <Button size="sm" variant="ghost" onClick={onClear}><Icon name="trash-01" size={14} /> Clear</Button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
