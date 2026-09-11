import { Badge, DockedPanel, DockedPanelHeader } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { countBySeverity } from '../data/validate'
import type { Employee, Finding, Severity } from '../data/types'
import { fmtDay } from '../lib/format'

export interface FindingsPanelProps {
  open: boolean
  onClose: () => void
  weekNo: number
  findings: Finding[]
  employeeById: Map<string, Employee>
  /** Scroll the board to the finding's employee (and day, when cell-specific). */
  onJump: (finding: Finding) => void
}

const SEVERITIES: readonly Severity[] = ['High', 'Medium', 'Low']
const TONE: Record<Severity, 'destructive' | 'warning' | 'muted'> = { High: 'destructive', Medium: 'warning', Low: 'muted' }
const MEANING: Record<Severity, string> = {
  High: 'blocks approval',
  Medium: 'supervisor acknowledgement required',
  Low: 'advisory',
}

/**
 * BLD-08 — the week's validation findings by severity, docked beside the
 * board (not over it) so a planner can fix a finding and watch it disappear.
 */
export function FindingsPanel({ open, onClose, weekNo, findings, employeeById, onJump }: FindingsPanelProps) {
  const counts = countBySeverity(findings)
  return (
    <DockedPanel open={open} onClose={onClose} width="26rem" className="shrink-0 border-s border-border bg-card" aria-label="Validation findings">
      <DockedPanelHeader onClose={onClose}>
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon name="shield-tick" size={16} /> Validation — week {weekNo}
        </span>
      </DockedPanelHeader>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2 text-xs">
        {SEVERITIES.map((s) => (
          <Badge key={s} variant={TONE[s]} size="sm" title={MEANING[s]}>
            {counts[s]} {s}
          </Badge>
        ))}
        <span className="ms-auto text-muted-foreground">{findings.length} findings</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {findings.length === 0 ? (
          <p className="flex items-center gap-2 p-4 text-xs text-success-scale-700">
            <Icon name="check-circle" size={16} /> No findings — the week is ready for approval.
          </p>
        ) : (
          SEVERITIES.filter((s) => counts[s] > 0).map((s) => (
            <section key={s} aria-labelledby={`findings-${s}`}>
              <h3 id={`findings-${s}`} className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-muted px-4 py-1.5 text-caption font-bold uppercase tracking-wide text-muted-foreground">
                <Badge variant={TONE[s]} size="xs">
                  {s}
                </Badge>
                {MEANING[s]}
              </h3>
              <ul>
                {findings
                  .filter((f) => f.severity === s)
                  .map((f, i) => {
                    const e = employeeById.get(f.employeeId)
                    return (
                      <li key={`${f.employeeId}-${f.day ?? ''}-${i}`}>
                        <button
                          type="button"
                          onClick={() => onJump(f)}
                          className="flex w-full flex-col gap-0.5 border-b border-border px-4 py-2 text-start text-xs transition-colors duration-fast hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        >
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-foreground">{e?.name ?? f.employeeId}</span>
                            {f.day && <span className="ms-auto shrink-0 font-mono text-caption text-muted-foreground">{fmtDay(f.day)}</span>}
                          </span>
                          <span className="text-muted-foreground">{f.text}</span>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))
        )}
      </div>
    </DockedPanel>
  )
}
