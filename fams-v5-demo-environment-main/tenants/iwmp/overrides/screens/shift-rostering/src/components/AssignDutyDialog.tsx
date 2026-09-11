import { useMemo, useState } from 'react'
import {
  Avatar, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Input, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger,
} from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { DUTIES, EXTRA_TYPES, categoryOf } from '../data/masters'
import { dutyPresentation } from '../lib/duty-presentation'
import { WORK_CODES, type DutyCode, type Eligibility, type Employee, type Route, type RosterCell } from '../data/types'
import { fmtDayLong } from '../lib/format'
import { DutyChip } from './DutyChip'

export interface AssignDutyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
  day: string
  current: RosterCell | null
  routes: Route[]
  eligibility: (employee: Employee, routeId: string, day: string) => Eligibility
  /** Which other driver already holds a route that day, if any (BR-06). */
  routeTaken: (routeId: string) => Employee | undefined
  onAssign: (cell: RosterCell | null) => void
}

/**
 * Assign duty — the blueprint's Fig. 4 surface, as a design-system Dialog.
 *
 * Tab 1 "Route (Smart Plan)": ELIGIBLE routes first (shift-matched sorted to
 * the top), then every ineligible route GREYED with its blocking reason
 * (ELG-05: "planners see the constraint instead of hitting an error
 * afterwards"). Only routes on the approved plan are listed (BR-09).
 *
 * Tab 2 "Other duty": the seven non-route codes as cards; work codes are
 * disabled for a non-Active employee (BR-01) and only WO / AV / EL remain.
 * EX asks for its type (BLD-06).
 */
export function AssignDutyDialog({ open, onOpenChange, employee: e, day, current, routes, eligibility, routeTaken, onAssign }: AssignDutyDialogProps) {
  const [q, setQ] = useState('')
  const [extraFor, setExtraFor] = useState(false)

  const ranked = useMemo(() => {
    const scored = routes
      .filter((r) => r.status === 'Approved')
      .map((r) => {
        const el = eligibility(e, r.id, day)
        const taken = el.ok ? routeTaken(r.id) : undefined
        const verdict: Eligibility = taken
          ? { ok: false, reasons: [`Route already has a driver on this day (${taken.name})`], warns: el.warns }
          : el
        return { r, el: verdict }
      })
    const eligible = scored.filter((x) => x.el.ok).sort((a, b) => Number(a.r.shift !== e.shift) - Number(b.r.shift !== e.shift))
    const blocked = scored.filter((x) => !x.el.ok)
    return { eligible, blocked, all: [...eligible, ...blocked] }
  }, [routes, e, day, eligibility, routeTaken])

  const needle = q.trim().toLowerCase()
  const visible = needle
    ? ranked.all.filter((x) => `${x.r.id} ${x.r.district} ${categoryOf(x.r.cat)?.name ?? ''}`.toLowerCase().includes(needle))
    : ranked.all

  const inactive = e.status !== 'Active'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setQ(''); setExtraFor(false) } onOpenChange(o) }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-3">
            <Avatar name={e.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate">Assign duty — {e.name}</span>
              <DialogDescription asChild>
                <span className="block text-xs font-normal text-muted-foreground">
                  {fmtDayLong(day)} · {e.desig}{e.licence ? ` · ${e.licence}` : ''} · {e.shift} · {e.serviceLine}
                </span>
              </DialogDescription>
            </span>
            <span className="ms-auto flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <Badge variant={e.status === 'Active' ? 'success' : e.status === 'Inactive' ? 'muted' : 'warning'} size="sm">{e.status}</Badge>
              Current <DutyChip cell={current} />
            </span>
          </DialogTitle>
        </DialogHeader>

        {inactive && (
          <p className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-error-50 p-2 text-xs text-error-700">
            <Icon name="alert-circle" size={14} /> Employee status is <b>{e.status}</b> — routes and reliever duties cannot be assigned. Only leave / off codes are allowed.
          </p>
        )}

        <Tabs defaultValue={inactive ? 'other' : 'route'} className="p-4">
          <TabsList>
            <TabsTrigger value="route" disabled={inactive}>Route (Smart Plan)</TabsTrigger>
            <TabsTrigger value="other">Other duty</TabsTrigger>
          </TabsList>

          <TabsContent value="route" className="mt-3 space-y-2">
            <Input
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder="Search route ID / district / vehicle…"
              aria-label="Search routes"
              autoFocus
            />
            <ScrollArea className="h-[46vh] rounded-md border border-border">
              <ul role="listbox" aria-label="Routes, eligible first">
                {visible.slice(0, 160).map(({ r, el }) => {
                  const cat = categoryOf(r.cat)
                  return (
                    <li key={r.id} role="option" aria-selected={false} aria-disabled={!el.ok || undefined}>
                      <button
                        type="button"
                        disabled={!el.ok}
                        onClick={() => onAssign({ code: 'RT', ref: r.id })}
                        className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-start text-xs transition-colors duration-fast enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className="min-w-36 font-mono font-semibold text-foreground">{r.id}</span>
                        <span className="min-w-40 text-foreground">{cat?.name}</span>
                        <Badge variant="muted" size="xs">{r.shift}</Badge>
                        <span className="truncate text-muted-foreground">{r.freq} · {r.district}</span>
                        <span className="ms-auto shrink-0">
                          {el.ok
                            ? el.warns.length
                              ? <Badge variant="warning" size="sm" title={el.warns.join(' | ')}><Icon name="alert-triangle" size={12} /> Warning</Badge>
                              : <Badge variant="success" size="sm"><Icon name="check" size={12} /> Eligible</Badge>
                            : <Badge variant="destructive" size="sm" title={el.reasons.join(' | ')} className="max-w-64 truncate">{el.reasons[0]}</Badge>}
                        </span>
                      </button>
                    </li>
                  )
                })}
                {visible.length === 0 && <li className="p-6 text-center text-xs text-muted-foreground">No routes match</li>}
              </ul>
            </ScrollArea>
            <p className="text-caption text-muted-foreground">
              {ranked.eligible.length} eligible routes · {ranked.blocked.length} blocked for this employee (shown greyed with the reason).
              Eligibility = Active status + licence class + valid training for the vehicle category + not on leave + route not already crewed.
            </p>
          </TabsContent>

          <TabsContent value="other" className="mt-3">
            {extraFor ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Extra assignment type</p>
                <ul className="grid grid-cols-2 gap-1.5">
                  {EXTRA_TYPES.map((t) => (
                    <li key={t}>
                      <button type="button" onClick={() => onAssign({ code: 'EX', ref: t })} className="w-full rounded-md border border-border px-3 py-2 text-start text-xs hover:bg-muted">{t}</button>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" onClick={() => setExtraFor(false)}><Icon name="arrow-left" size={14} /> Back</Button>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DUTIES.filter((d) => d.code !== 'RT').map((d) => {
                  const blocked = inactive && WORK_CODES.includes(d.code as DutyCode)
                  return (
                    <li key={d.code}>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => (d.code === 'EX' ? setExtraFor(true) : onAssign({ code: d.code }))}
                        className="flex h-full w-full flex-col gap-1.5 rounded-md border border-border p-3 text-start transition-colors duration-fast enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className={`tone-${dutyPresentation({ code: d.code }).tone} inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption font-semibold`} style={{ color: 'var(--tone-fg)', background: 'var(--tone-bg)', borderColor: 'var(--tone-bd)' }}>
                          <span className="size-1.5 rounded-full" style={{ background: 'var(--tone-fg)' }} aria-hidden />
                          {d.name}
                        </span>
                        <span className="text-caption text-muted-foreground">{d.desc}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-border p-3">
          {current && current.code !== 'AV' && current.code !== 'EL' && (
            <Button variant="destructive" size="sm" onClick={() => onAssign(null)}><Icon name="trash-01" size={14} /> Clear cell</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
