import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { generateDataset } from '../data/generate'
import type { AuditEntry, RosterCell, RosterDataset, RosterGrid, RosterWeek, WeekStatus } from '../data/types'

/**
 * Roster store — the single mutable surface behind the board, kept in a
 * reducer so every change is one auditable transition (BR-10: "audit trail
 * on every cell change — who, when, from, to").
 *
 * OPTIMISTIC by design: a mutation applies to the grid immediately, the cell
 * is marked `saving`, and a simulated round-trip clears the flag. The UI never
 * blocks on the write; a failure would revert through `revert()` with the
 * audit entry's `from`. There is no real API in this demo — `simulateSave` is
 * the seam where one goes.
 *
 * Undo is a bounded stack of audit entries applied in reverse.
 */

export interface StoreState {
  data: RosterDataset
  /** `empId|day` → in-flight save. */
  saving: Record<string, true>
  audit: AuditEntry[]
  /** Undo stack: audit entries in commit order. */
  undo: AuditEntry[]
  /** Monotonic revision — lets memos re-derive only on commits. */
  rev: number
}

type Action =
  | { type: 'setCell'; employeeId: string; day: string; to: RosterCell | null; by: string }
  | { type: 'setCells'; changes: { employeeId: string; day: string; to: RosterCell | null }[]; by: string }
  | { type: 'saved'; keys: string[] }
  | { type: 'undo' }
  | { type: 'setWeekStatus'; week: number; status: WeekStatus; bumpVersion?: boolean }

const key = (e: string, d: string) => `${e}|${d}`

/* The host reloads this embed on navigation; edits survive in sessionStorage so a
   tab switch never silently discards a planner's work. The seeded dataset is
   regenerated and the persisted roster/weeks/audit layered over it. */
const PERSIST_KEY = 'iwmp-roster:state'
interface Persisted {
  roster: RosterGrid
  weeks: RosterWeek[]
  audit: AuditEntry[]
}

function hydrate(initial: StoreState): StoreState {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY)
    if (!raw) return initial
    const p = JSON.parse(raw) as Partial<Persisted>
    if (!p.roster || !p.weeks) return initial
    return { ...initial, data: { ...initial.data, roster: p.roster, weeks: p.weeks }, audit: p.audit ?? [] }
  } catch {
    return initial
  }
}

function persist(state: StoreState): void {
  if (state.rev === 0) return
  try {
    const p: Persisted = { roster: state.data.roster, weeks: state.data.weeks, audit: state.audit.slice(0, 200) }
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(p))
  } catch {
    /* quota / private mode — the in-memory store is still authoritative */
  }
}

export function clearPersistedRoster(): void {
  try {
    sessionStorage.removeItem(PERSIST_KEY)
  } catch {
    /* ignore */
  }
}

function applyCell(data: RosterDataset, employeeId: string, day: string, to: RosterCell | null): RosterDataset {
  const row = { ...(data.roster[employeeId] ?? {}), [day]: to }
  return { ...data, roster: { ...data.roster, [employeeId]: row } }
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'setCell': {
      const from = state.data.roster[action.employeeId]?.[action.day] ?? null
      const entry: AuditEntry = { at: new Date().toISOString(), employeeId: action.employeeId, day: action.day, from, to: action.to, by: action.by }
      return {
        ...state,
        data: applyCell(state.data, action.employeeId, action.day, action.to),
        saving: { ...state.saving, [key(action.employeeId, action.day)]: true },
        audit: [entry, ...state.audit].slice(0, 500),
        undo: [...state.undo, entry].slice(-50),
        rev: state.rev + 1,
      }
    }
    case 'setCells': {
      let data = state.data
      const saving = { ...state.saving }
      const entries: AuditEntry[] = []
      const at = new Date().toISOString()
      const batch = `${at}#${state.rev}`
      for (const c of action.changes) {
        const from = data.roster[c.employeeId]?.[c.day] ?? null
        entries.push({ at, employeeId: c.employeeId, day: c.day, from, to: c.to, by: action.by, batch })
        data = applyCell(data, c.employeeId, c.day, c.to)
        saving[key(c.employeeId, c.day)] = true
      }
      return {
        ...state,
        data,
        saving,
        audit: [...entries, ...state.audit].slice(0, 500),
        undo: [...state.undo, ...entries].slice(-50),
        rev: state.rev + 1,
      }
    }
    case 'saved': {
      const saving = { ...state.saving }
      for (const k of action.keys) delete saving[k]
      return { ...state, saving }
    }
    case 'undo': {
      const last = state.undo[state.undo.length - 1]
      if (!last) return state
      // A batch's entries sit together at the top of the stack — revert them all, latest first.
      const group = last.batch ? state.undo.filter((e) => e.batch === last.batch) : [last]
      let data = state.data
      for (const e of [...group].reverse()) data = applyCell(data, e.employeeId, e.day, e.from)
      const at = new Date().toISOString()
      return {
        ...state,
        data,
        undo: state.undo.slice(0, state.undo.length - group.length),
        audit: [...group.map((e) => ({ ...e, at, from: e.to, to: e.from, by: `${e.by} (undo)` })), ...state.audit].slice(0, 500),
        rev: state.rev + 1,
      }
    }
    case 'setWeekStatus': {
      const weeks: RosterWeek[] = state.data.weeks.map((w) => {
        if (w.w !== action.week) return w
        const version = action.bumpVersion ? `v${Number(w.version.slice(1)) + 1}` : w.version
        return { ...w, status: action.status, version }
      })
      return { ...state, data: { ...state.data, weeks }, rev: state.rev + 1 }
    }
  }
}

export interface RosterStore extends StoreState {
  setCell: (employeeId: string, day: string, to: RosterCell | null) => void
  setCells: (changes: { employeeId: string; day: string; to: RosterCell | null }[]) => void
  undoLast: () => void
  setWeekStatus: (week: number, status: WeekStatus, bumpVersion?: boolean) => void
  isSaving: (employeeId: string, day: string) => boolean
  canUndo: boolean
  /** Drop persisted edits and reload the seeded dataset. */
  reset: () => void
}

const Ctx = createContext<RosterStore | null>(null)

/** Simulated persistence latency. The seam where a real write goes. */
const SAVE_MS = 350

export function RosterStoreProvider({ children, actor = 'Roster planner' }: { children: ReactNode; actor?: string }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    hydrate({
      data: generateDataset(),
      saving: {},
      audit: [],
      undo: [],
      rev: 0,
    }),
  )
  useEffect(() => persist(state), [state])

  // Clear `saving` flags after the simulated round-trip, batched per tick.
  const pending = useRef<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSaved = useCallback((keys: string[]) => {
    for (const k of keys) pending.current.add(k)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      dispatch({ type: 'saved', keys: [...pending.current] })
      pending.current.clear()
      timer.current = null
    }, SAVE_MS)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const setCell = useCallback((employeeId: string, day: string, to: RosterCell | null) => {
    dispatch({ type: 'setCell', employeeId, day, to, by: actor })
    scheduleSaved([key(employeeId, day)])
  }, [actor, scheduleSaved])

  const setCells = useCallback((changes: { employeeId: string; day: string; to: RosterCell | null }[]) => {
    if (!changes.length) return
    dispatch({ type: 'setCells', changes, by: actor })
    scheduleSaved(changes.map((c) => key(c.employeeId, c.day)))
  }, [actor, scheduleSaved])

  const undoLast = useCallback(() => dispatch({ type: 'undo' }), [])
  const setWeekStatus = useCallback((week: number, status: WeekStatus, bumpVersion?: boolean) => {
    dispatch({ type: 'setWeekStatus', week, status, ...(bumpVersion !== undefined ? { bumpVersion } : {}) })
  }, [])

  const value = useMemo<RosterStore>(() => ({
    ...state,
    setCell,
    setCells,
    undoLast,
    setWeekStatus,
    isSaving: (e, d) => Boolean(state.saving[key(e, d)]),
    canUndo: state.undo.length > 0,
    reset: () => {
      clearPersistedRoster()
      window.location.reload()
    },
  }), [state, setCell, setCells, undoLast, setWeekStatus])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRosterStore(): RosterStore {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRosterStore must be used inside <RosterStoreProvider>')
  return v
}
