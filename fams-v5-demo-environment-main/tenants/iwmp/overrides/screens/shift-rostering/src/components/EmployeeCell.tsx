import { Avatar, Badge, Progress } from '@fams/ui-kit'
import { titleCase } from '../lib/format'
import type { Employee } from '../data/types'

export interface RowStats {
  /** Working duties (route / reliever / on-call / standby / extra) this week. */
  planned: number
  /** Days in the visible window. */
  days: number
  /** Off + leave days (WO / AV / EL). */
  off: number
}

export interface EmployeeCellProps {
  employee: Employee
  onOpen: (employee: Employee) => void
  /** Count of findings against this employee in the visible week. */
  findingCount?: number
  /** This worker has a hard eligibility conflict this week (e.g. untrained for a rostered vehicle). */
  conflict?: boolean
  stats?: RowStats
}

const STATUS_TONE: Record<Employee['status'], 'success' | 'muted' | 'warning'> = {
  Active: 'success',
  Inactive: 'muted',
  'On Leave': 'warning',
  Training: 'warning',
}

/**
 * The frozen first column — who this row is. Avatar, name, designation and
 * status, then the week's own read-out: utilization (working days ÷ days in
 * view) and a schedules bar. Clicking opens the competency card (TRN-06).
 */
export function EmployeeCell({ employee: e, onOpen, findingCount = 0, conflict = false, stats }: EmployeeCellProps) {
  const utilization = stats && stats.days > 0 ? Math.round((stats.planned / stats.days) * 100) : null
  const utilTone = utilization === null ? 'text-muted-foreground' : utilization >= 80 ? 'text-success-scale-700' : utilization >= 40 ? 'text-warning-scale-700' : 'text-error-700'

  return (
    <button
      type="button"
      role="rowheader"
      onClick={() => onOpen(e)}
      className={`flex h-full w-full flex-col justify-center gap-1.5 border-e border-b border-border bg-card px-3 py-2 text-start transition-colors duration-fast hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${conflict ? 'border-s-[3px] border-s-error-500' : ''}`}
      aria-label={`${e.name}, ${e.desig.toLowerCase()}${utilization === null ? '' : `, ${utilization}% utilization`}${conflict ? ', has an eligibility conflict' : ''}, open competency card`}
    >
      <span className="flex w-full items-center gap-2">
        <Avatar name={e.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">{e.name}</span>
            {conflict ? (
              <Badge variant="destructive" size="xs" aria-label="eligibility conflict">
                Conflict
              </Badge>
            ) : (
              findingCount > 0 && (
                <Badge variant="warning" size="xs" aria-label={`${findingCount} findings`}>
                  {findingCount}
                </Badge>
              )
            )}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {titleCase(e.desig)} · {e.sap}
          </span>
        </span>
        <Badge variant={STATUS_TONE[e.status]} size="xs" className="shrink-0">
          {e.status}
        </Badge>
      </span>

      {stats && (
        <span className="flex w-full items-center gap-2 ps-10">
          <span className={`text-caption font-semibold tabular-nums ${utilTone}`}>{utilization}%</span>
          <Progress value={utilization ?? 0} size="sm" className="min-w-0 flex-1" aria-hidden />
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
            {stats.planned}/{stats.days}
          </span>
        </span>
      )}
    </button>
  )
}
