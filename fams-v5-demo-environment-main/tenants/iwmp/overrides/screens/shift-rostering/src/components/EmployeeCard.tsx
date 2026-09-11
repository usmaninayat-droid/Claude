import { Avatar, Badge, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { SMART_PLAN_VERSION, VEHICLE_CATS, categoryOf, trainingById } from '../data/masters'
import { evaluateEligibility, trainingStatus } from '../data/eligibility'
import type { Eligibility, Employee, Route, TrainingStatus } from '../data/types'
import { fmtDay } from '../lib/format'

export interface EmployeeCardProps {
  employee: Employee | null
  onOpenChange: (open: boolean) => void
  today: string
  routeById: Map<string, Route>
  eligibility: (employee: Employee, routeId: string | undefined) => Eligibility
}

/** A stand-in route of one vehicle category, so the matrix can be probed without a real Smart Plan route. */
const probeRoute = (cat: string, shift: Employee['shift']): Route => ({
  id: `${cat}_probe`,
  cat,
  serviceLine: '',
  project: 'MSW',
  shift,
  freq: 'DAILY',
  district: '',
  target: 0,
  status: 'Approved',
  plan: SMART_PLAN_VERSION,
})

const STATUS_TONE: Record<TrainingStatus, 'success' | 'warning' | 'destructive'> = {
  Valid: 'success',
  Expiring: 'warning',
  Expired: 'destructive',
  Blocked: 'destructive',
}

/**
 * TRN-06 — employee competency card: trainings with status, eligible vehicle
 * categories (green / amber / grey with the reason on hover), and the current
 * assignment's eligibility result. A Sheet, so it stacks over the board.
 */
export function EmployeeCard({ employee: e, onOpenChange, today, routeById, eligibility }: EmployeeCardProps) {
  const rt = e?.route ? routeById.get(e.route) : undefined
  const current = e && rt ? eligibility(e, rt.id) : undefined
  return (
    <Sheet open={Boolean(e)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[32rem] max-w-full overflow-y-auto">
        {e && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <Avatar name={e.name} size="md" />
                <span className="min-w-0">
                  <span className="block truncate">{e.name}</span>
                  <SheetDescription asChild>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {e.sap} · {e.desig}{e.licence ? ` · ${e.licence}` : ''} · {e.lot} · {e.shift} · {e.serviceLine} · {e.project} · {e.contractor} · Weekly off {e.weeklyOff}
                    </span>
                  </SheetDescription>
                </span>
                <Badge variant={e.status === 'Active' ? 'success' : e.status === 'Inactive' ? 'muted' : 'warning'} size="sm" className="ms-auto">{e.status}</Badge>
              </SheetTitle>
            </SheetHeader>

            <section className="mt-5">
              <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-muted-foreground">Trainings completed</h3>
              {e.trainings.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No training records</p>
              ) : (
                <ul className="divide-y divide-border">
                  {e.trainings.map((t) => {
                    const m = trainingById(t.id)
                    const s = trainingStatus(t, today)
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span>
                          <span className="block font-medium text-foreground">{m?.name ?? t.id}</span>
                          <span className="text-caption text-muted-foreground">Attended {fmtDay(t.date)} · valid {m?.validity} mo · expires {fmtDay(t.expiry)}</span>
                        </span>
                        <Badge variant={STATUS_TONE[s]} size="sm">{s}</Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <Separator className="my-4" />

            <section>
              <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-muted-foreground">Eligible vehicle categories</h3>
              <TooltipProvider delayDuration={150}>
                <ul className="flex flex-wrap gap-1.5">
                  {VEHICLE_CATS.map((c) => {
                    // Probe the category as if Active and on the employee's own shift, so a paused
                    // employee still sees their competency and the shift warning does not muddy it.
                    const chk = evaluateEligibility({ employee: { ...e, status: 'Active' }, route: probeRoute(c.code, e.shift), today })
                    const tone = chk.ok ? (chk.warns.length ? 'warning' : 'success') : 'muted'
                    const why = [...chk.reasons, ...chk.warns].join(' · ') || `${c.name} — eligible`
                    return (
                      <li key={c.code}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span><Badge variant={tone} size="sm" className="cursor-help">{c.code}</Badge></span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-72 text-xs">{why}</TooltipContent>
                        </Tooltip>
                      </li>
                    )
                  })}
                </ul>
              </TooltipProvider>
              <p className="mt-2 text-caption text-muted-foreground">Green = eligible · amber = eligible with warning (expiring / grace) · grey = not eligible (hover for reason)</p>
            </section>

            <Separator className="my-4" />

            <section>
              <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-muted-foreground">Current assignment</h3>
              {rt ? (
                <>
                  <p className="font-mono text-sm font-bold text-foreground">{rt.id}</p>
                  <p className="text-caption text-muted-foreground">{categoryOf(rt.cat)?.name} · {rt.shift} · {rt.freq} · {rt.district}</p>
                  {current && (current.ok
                    ? current.warns.length
                      ? <ul className="mt-2 space-y-1 rounded-md bg-warning-scale-50 p-2 text-xs text-warning-scale-700">{current.warns.map((w) => <li key={w} className="flex gap-1.5"><Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />{w}</li>)}</ul>
                      : <Badge variant="success" size="sm" className="mt-2"><Icon name="check" size={12} /> Eligibility OK</Badge>
                    : <ul className="mt-2 space-y-1 rounded-md bg-error-50 p-2 text-xs text-error-700">{current.reasons.map((r) => <li key={r} className="flex gap-1.5"><Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />{r}</li>)}</ul>)}
                </>
              ) : (
                <Badge variant={e.family === 'ROSTERED' ? 'destructive' : 'muted'} size="sm">
                  {e.family === 'ROSTERED' ? 'Pending rostering' : `${e.family}${e.extraType ? ` · ${e.extraType}` : ''}`}
                </Badge>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
