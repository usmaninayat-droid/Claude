import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { SMART_PLAN_VERSION } from '../data/masters'
import type { BoardCategory, BoardFilters, Lot, RosterWeek, Shift, WeekStatus } from '../data/types'
import { fmtDay } from '../lib/format'
import { BOARD_CATEGORIES } from '../state/useBoardModel'

export interface BoardToolbarProps {
  filters: BoardFilters
  onFiltersChange: (next: BoardFilters) => void
  weeks: RosterWeek[]
  week: RosterWeek
  serviceLines: string[]
  employeesShown: number
  findingsTotal: number
  highCount: number
  findingsOpen: boolean
  onToggleFindings: () => void
  /** Number of workers with a hard eligibility conflict this week. */
  conflictCount: number
  highlightConflicts: boolean
  onToggleHighlightConflicts: () => void
  canUndo: boolean
  onUndo: () => void
  onExport: () => void
  onApprove: () => void
  onPublish: () => void
  onReset: () => void
}

const LOTS: readonly (Lot | 'All')[] = ['All', 'LOT 3', 'LOT 4', 'LOT 5']
const SHIFTS: readonly (Shift | 'All')[] = ['All', 'DAY', 'NIGHT', 'AFN', 'EVENING', 'MID']
const STATUS_TONE: Record<WeekStatus, 'muted' | 'info' | 'success'> = { Draft: 'muted', Approved: 'info', Published: 'success' }

export function BoardToolbar({
  filters,
  onFiltersChange,
  weeks,
  week,
  serviceLines,
  employeesShown,
  findingsTotal,
  highCount,
  findingsOpen,
  onToggleFindings,
  conflictCount,
  highlightConflicts,
  onToggleHighlightConflicts,
  canUndo,
  onUndo,
  onExport,
  onApprove,
  onPublish,
  onReset,
}: BoardToolbarProps) {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onFiltersChange({ ...filters, [key]: value })
  const stepWeek = (delta: number) => {
    const next = weeks.find((w) => w.w === week.w + delta)
    if (next) set('week', next.w)
  }
  const approveReason = highCount > 0 ? `${highCount} High finding${highCount === 1 ? '' : 's'} must be resolved before approval` : undefined

  return (
    <header className="no-print flex flex-col gap-2 border-b border-border bg-card px-4 pt-3 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold text-foreground">Roster Board</h1>
        <Badge variant={STATUS_TONE[week.status]} size="sm" solid={week.status === 'Published'}>
          {week.status === 'Published' && <Icon name="lock-01" size={12} />} {week.status}
        </Badge>
        <span className="text-caption text-muted-foreground">
          Week {week.w + 1} · {fmtDay(week.from)} – {fmtDay(week.to)} · roster {week.version} · Smart Plan {SMART_PLAN_VERSION}
        </span>

        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo} title="Undo last change (⌘/Ctrl+Z)">
            <Icon name="refresh-ccw-01" size={14} /> Undo
          </Button>
          <Button size="sm" variant={findingsOpen ? 'primary' : 'secondary'} onClick={onToggleFindings} aria-pressed={findingsOpen} title="Run the eligibility engine and rule set across the week (BLD-08)">
            <Icon name="shield-tick" size={14} /> Validate week
            {findingsTotal > 0 && (
              <Badge variant={highCount > 0 ? 'destructive' : 'warning'} size="xs" solid className="ms-1">
                {findingsTotal}
              </Badge>
            )}
          </Button>
          <Button size="sm" variant="secondary" onClick={onExport} title="Export in the current workbook column layout (BLD-12)">
            <Icon name="download-01" size={14} /> Export
          </Button>
          {week.status === 'Draft' && (
            <Button size="sm" variant="primary" onClick={onApprove} title={approveReason ?? 'Submit the week for Operations Manager approval'} aria-disabled={highCount > 0 || undefined}>
              <Icon name="check" size={14} /> Submit for approval
            </Button>
          )}
          {week.status === 'Approved' && (
            <Button size="sm" variant="primary" onClick={onPublish} title="Publish to dispatch, LOT supervisors and driver tablets — locks the week">
              <Icon name="send-01" size={14} /> Publish
            </Button>
          )}
          {week.status === 'Published' && (
            <Button size="sm" variant="primary" disabled>
              <Icon name="lock-01" size={14} /> Published
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <Icon name="dots-vertical" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => window.print()}>
                <Icon name="file-02" size={14} /> Print board
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onReset}>
                <Icon name="refresh-cw-01" size={14} /> Reset demo data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => stepWeek(-1)} disabled={week.w === 0} aria-label="Previous week">
            <Icon name="chevron-left" size={16} />
          </Button>
          <Select value={String(filters.week)} onValueChange={(v) => set('week', Number(v))}>
            <SelectTrigger className="h-8 w-72 text-xs" aria-label="Week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((w) => (
                <SelectItem key={w.w} value={String(w.w)}>
                  Week {w.w + 1} · {fmtDay(w.from)} – {fmtDay(w.to)} · {w.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={() => stepWeek(1)} disabled={week.w === weeks.length - 1} aria-label="Next week">
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>

        <Tabs value={filters.category} onValueChange={(v) => set('category', v as BoardCategory)}>
          <TabsList aria-label="Board category">
            {BOARD_CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="text-xs">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={filters.lot} onValueChange={(v) => set('lot', v as Lot | 'All')}>
          <SelectTrigger className="h-8 w-28 text-xs" aria-label="LOT">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOTS.map((l) => (
              <SelectItem key={l} value={l}>
                {l === 'All' ? 'All LOTs' : l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.shift} onValueChange={(v) => set('shift', v as Shift | 'All')}>
          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Shift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'All' ? 'All shifts' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.serviceLine} onValueChange={(v) => set('serviceLine', v)}>
          <SelectTrigger className="h-8 w-40 text-xs" aria-label="Service line">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All service lines</SelectItem>
            {serviceLines.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          value={filters.search}
          onChange={(ev) => set('search', ev.target.value)}
          placeholder="Search name, SAP ID or route…"
          aria-label="Search employees"
          leadingIcon={<Icon name="search-md" size={16} />}
          className="h-8 w-60 text-xs"
        />
        <label
          className={`ms-auto flex items-center gap-2 text-xs font-medium ${conflictCount === 0 && !highlightConflicts ? 'text-muted-foreground' : 'text-foreground'}`}
          title={
            conflictCount === 0
              ? 'No eligibility conflicts this week — every worker is trained and cleared for their rostered vehicle'
              : `Float the ${conflictCount} worker${conflictCount === 1 ? '' : 's'} with an eligibility conflict (untrained for a rostered vehicle, licence, status, double-booking) to the top and mark them`
          }
        >
          <Switch
            size="md"
            checked={highlightConflicts}
            onCheckedChange={onToggleHighlightConflicts}
            disabled={conflictCount === 0 && !highlightConflicts}
            aria-label="Highlight conflicts"
          />
          Highlight Conflicts
        </label>
        <span className="text-caption tabular-nums text-muted-foreground">{employeesShown} employees</span>
      </div>
    </header>
  )
}
