import { Badge, Button } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { dutyOf } from '../data/masters'
import { dutyPresentation } from '../lib/duty-presentation'
import type { DutyCode, RosterCell } from '../data/types'

export interface BulkBarProps {
  count: number
  canPaste: boolean
  onSet: (cell: RosterCell) => void
  onPaste: () => void
  onClear: () => void
  onDeselect: () => void
}

const QUICK_CODES: readonly DutyCode[] = ['WO', 'RL', 'OC', 'SB']

/** Batch actions over a multi-selection (Shift+click / Shift+arrows / ⌘-click). */
export function BulkBar({ count, canPaste, onSet, onPaste, onClear, onDeselect }: BulkBarProps) {
  return (
    <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-3 py-2 text-xs">
      <Badge variant="info" size="sm">
        {count} cells selected
      </Badge>
      <span className="text-muted-foreground">Set all to</span>
      {QUICK_CODES.map((code) => (
        <Button key={code} size="sm" variant="secondary" onClick={() => onSet({ code })} title={dutyOf(code)?.desc}>
          <span className={`tone-${dutyPresentation({ code }).tone} size-2.5 rounded-full`} style={{ background: 'var(--tone-fg)' }} aria-hidden />
          {dutyPresentation({ code }).label}
        </Button>
      ))}
      <Button size="sm" variant="secondary" disabled={!canPaste} onClick={onPaste} title="Paste the copied duty onto every selected cell (⌘/Ctrl+V)">
        <Icon name="copy-01" size={14} /> Paste
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} title="Clear every selected cell (Delete)">
        <Icon name="trash-01" size={14} /> Clear
      </Button>
      <Button size="sm" variant="ghost" className="ms-auto" onClick={onDeselect}>
        <Icon name="x-close" size={14} /> Deselect
        <kbd className="ms-1 rounded border border-border px-1 font-mono text-caption text-muted-foreground">Esc</kbd>
      </Button>
    </div>
  )
}
