import { describe, it, expect } from 'vitest'
import {
  getModuleType,
  registerModuleType,
  listModuleTypes,
  resolveModuleViews,
  resolveModuleViewSpecs,
  viewSpecKind,
  viewLabel,
} from './module-registry'

describe('module-registry — the fixed module-type menu', () => {
  it('maps entity → ListView + EntityProfile + CreationSheet', () => {
    const def = getModuleType('entity')!
    expect(def.defaultViews).toEqual(['list'])
    expect(def.tabKind).toBe('view')
    expect(def.templateRefs.views?.list).toBe('ListView')
    expect(def.templateRefs.detail).toBe('EntityProfile')
    expect(def.templateRefs.create).toBe('CreationSheet')
  })

  it('maps pipeline → Kanban (default) + TaskDetail', () => {
    const def = getModuleType('pipeline')!
    expect(def.defaultViews[0]).toBe('kanban')
    expect(def.templateRefs.views?.kanban).toBe('KanbanView')
    expect(def.templateRefs.detail).toBe('TaskDetail')
  })

  it('maps dashboard → DashboardGrid as an instance module', () => {
    const def = getModuleType('dashboard')!
    expect(def.tabKind).toBe('instance')
    expect(def.templateRefs.grid).toBe('DashboardGrid')
  })

  it('maps inbox → InboxView as a wired (non-placeholder) list-view module', () => {
    const def = getModuleType('inbox')!
    expect(def.placeholder).toBeFalsy()
    expect(def.defaultViews).toEqual(['list'])
    expect(def.templateRefs.views?.list).toBe('InboxView')
  })

  it('maps calendar → CalendarView as a wired (non-placeholder) calendar-view module', () => {
    const def = getModuleType('calendar')!
    expect(def.placeholder).toBeFalsy()
    expect(def.defaultViews).toEqual(['calendar'])
    expect(def.templateRefs.views?.calendar).toBe('CalendarView')
  })

  it('registers the remaining Shaheer types as placeholders', () => {
    for (const t of ['live-monitoring', 'reports', 'settings', 'forms', 'zones', 'pois']) {
      expect(getModuleType(t)?.placeholder).toBe(true)
    }
  })

  it('returns undefined for an unknown type', () => {
    expect(getModuleType('nope')).toBeUndefined()
  })

  it('listModuleTypes covers all eleven registered types', () => {
    expect(listModuleTypes().length).toBe(11)
  })
})

describe('module-registry — extension + resolution', () => {
  it('registerModuleType adds a new type (extension point)', () => {
    registerModuleType('gantt', {
      label: 'Gantt',
      defaultViews: ['calendar'],
      tabKind: 'view',
      templateRefs: { views: { calendar: 'GanttView' } },
    })
    expect(getModuleType('gantt')?.templateRefs.views?.calendar).toBe('GanttView')
  })

  it('resolveModuleViews prefers explicit views, else type defaults', () => {
    expect(resolveModuleViews('entity')).toEqual(['list'])
    expect(resolveModuleViews('entity', ['kanban', 'map'])).toEqual(['kanban', 'map'])
  })

  it('resolveModuleViews reduces the ViewSpec object form to its kind', () => {
    expect(
      resolveModuleViews('pipeline', [
        { kind: 'dispatcher-cockpit', label: 'Dispatcher Cockpit', icon: 'radio' },
        'list',
      ]),
    ).toEqual(['dispatcher-cockpit', 'list'])
    expect(viewSpecKind('kanban')).toBe('kanban')
    expect(viewSpecKind({ kind: 'triage-console' })).toBe('triage-console')
  })

  it('resolveModuleViewSpecs resolves labels — spec label wins, else the kind default', () => {
    expect(
      resolveModuleViewSpecs('pipeline', [
        { kind: 'dispatcher-cockpit', label: 'Dispatcher Cockpit', icon: 'radio' },
        { kind: 'triage-console' },
        'kanban',
      ]),
    ).toEqual([
      { kind: 'dispatcher-cockpit', label: 'Dispatcher Cockpit', icon: 'radio' },
      { kind: 'triage-console', label: 'Triage Console' },
      { kind: 'kanban', label: 'Kanban View' },
    ])
  })

  it('resolveModuleViewSpecs falls back to the module type defaults', () => {
    expect(resolveModuleViewSpecs('entity')).toEqual([{ kind: 'list', label: 'List View' }])
  })

  it('the three console lenses resolve to their v5-templates refs', () => {
    for (const type of ['entity', 'pipeline'] as const) {
      const refs = getModuleType(type)?.templateRefs.views
      expect(refs?.['dispatcher-cockpit']).toBe('DispatcherCockpitView')
      expect(refs?.['triage-console']).toBe('TriageConsoleView')
      expect(refs?.['fleet-console']).toBe('FleetConsoleView')
      expect(refs?.['workforce-pulse']).toBe('WorkforcePulseView')
    }
  })

  it('viewLabel gives a human label per view-kind', () => {
    expect(viewLabel('kanban')).toBe('Kanban View')
    expect(viewLabel('grouped-list')).toBe('Grouped List')
    expect(viewLabel('dispatcher-cockpit')).toBe('Dispatcher Cockpit')
    expect(viewLabel('fleet-console')).toBe('Fleet Console')
    expect(viewLabel('workforce-pulse')).toBe('Workforce Pulse')
  })
})

describe('viewLabelIn — view-kind tab labels (SPEC v2 2026-08-24 §2.1)', () => {
  it('names single-pane kinds with the PLAIN labels even beside a hybrid sibling (Figma 495:2998 tab bar: Hybrid View · List View · Map View)', async () => {
    const { viewLabelIn } = await import('./module-registry')
    expect(viewLabelIn('map', ['hybrid', 'map', 'list'])).toBe('Map View')
    expect(viewLabelIn('list', ['hybrid', 'map', 'list'])).toBe('List View')
    expect(viewLabelIn('hybrid', ['hybrid', 'map', 'list'])).toBe('Hybrid View')
  })
  it('keeps the plain names without a hybrid sibling too (ticketing/kanban Figma)', async () => {
    const { viewLabelIn } = await import('./module-registry')
    expect(viewLabelIn('list', ['list', 'kanban'])).toBe('List View')
    expect(viewLabelIn('map', ['map'])).toBe('Map View')
    expect(viewLabelIn('kanban', ['hybrid', 'kanban'])).toBe('Kanban View')
  })
  // Finding A7b-5: the "Only" qualifier only disambiguates a PAIR of
  // standalone panes against the combined tab. With just one of them
  // standalone there is nothing to disambiguate, so the plain name wins.
  it('keeps the plain names when a hybrid sibling exists but only one pane is standalone', async () => {
    const { viewLabelIn } = await import('./module-registry')
    const pipelineViews = ['list', 'kanban', 'hybrid', 'calendar'] as const
    expect(viewLabelIn('list', pipelineViews)).toBe('List View')
    expect(viewLabelIn('hybrid', pipelineViews)).toBe('Hybrid View')
    expect(viewLabelIn('kanban', pipelineViews)).toBe('Kanban View')
    expect(viewLabelIn('calendar', pipelineViews)).toBe('Calendar View')
    // Mirror case: a map-only pane beside hybrid, no standalone list.
    expect(viewLabelIn('map', ['hybrid', 'map'])).toBe('Map View')
  })
})
