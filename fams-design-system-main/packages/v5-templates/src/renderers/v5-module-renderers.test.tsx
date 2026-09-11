import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import {
  ComposedModule,
  InMemoryDataStore,
  createAppRuntime,
  getModuleType,
  type Blueprint,
  type EntityConfig,
  type ModuleBlueprint,
  type ModuleRenderContext,
  type UserContext,
} from '@fams/v5-composer'
import { v5TemplateRenderers, V5ModuleSurface, createV5TemplateRenderers } from './v5-module-renderers'
import {
  dealsConfig,
  companiesConfig,
  vehiclesConfig,
  dealRecords,
  companyRecords,
  vehicleRecords,
  dealsPipelineRules,
  managerUser,
  repUser,
} from '../views/fixtures'

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

beforeEach(() => {
  vi.mocked(announce).mockClear()
})

/**
 * Task 2.7 Part A — the composer→templates wiring, exercised end to end against
 * the REAL crm golden (`packages/v5-composer/blueprints/crm`) + the fleet
 * blueprint, seeded into an `InMemoryDataStore` and bound through a real
 * `createAppRuntime` (RBAC + rule-enforced moves). Every render is the IDENTICAL
 * `<ComposedModule blueprint data renderers={v5TemplateRenderers}/>` call — the
 * phase-2 gate is that switching the blueprint switches the whole surface with
 * no component-code difference.
 */

type ConfigVal = ModuleBlueprint['config']

function makeApp(user: UserContext = managerUser) {
  const store = new InMemoryDataStore()
  store.registerConfig(dealsConfig)
  store.registerConfig(companiesConfig)
  store.registerConfig(vehiclesConfig)
  store.seed('crm/deals', structuredClone(dealRecords))
  store.seed('crm/companies', structuredClone(companyRecords))
  store.seed('fleet/vehicles', structuredClone(vehicleRecords))

  const modules: ModuleBlueprint[] = [
    {
      id: 'deals',
      type: 'pipeline',
      label: 'Deals',
      views: ['kanban', 'list'],
      dataSource: { code: 'crm/deals', rulesRef: 'deals' },
      config: dealsConfig as unknown as ConfigVal,
    },
    {
      id: 'companies',
      type: 'entity',
      label: 'Companies',
      views: ['list'],
      dataSource: { code: 'crm/companies' },
      config: companiesConfig as unknown as ConfigVal,
    },
    {
      id: 'vehicles',
      type: 'entity',
      label: 'Vehicles',
      views: ['list'],
      dataSource: { code: 'fleet/vehicles' },
      config: vehiclesConfig as unknown as ConfigVal,
    },
  ]

  const blueprint: Blueprint = { id: 'gate', tenant: 'fams', brand: { name: 'Gate' }, user, modules }
  const runtime = createAppRuntime({
    blueprint,
    store,
    rules: { deals: dealsPipelineRules },
    getUser: () => user,
  })
  return { store, runtime, modules }
}

type App = ReturnType<typeof makeApp>

/** The one call under test — identical for every blueprint. */
function composed(app: App, id: string) {
  const module = app.modules.find((m) => m.id === id)!
  return <ComposedModule blueprint={module} data={app.runtime.module(id)} renderers={v5TemplateRenderers} />
}

describe('v5TemplateRenderers — entity flow (crm companies golden)', () => {
  it('renders the ListView from the blueprint', () => {
    const app = makeApp()
    render(composed(app, 'companies'))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument()
  })

  it('opens the EntityProfile in a stacked sheet on row click (useDetailStack)', async () => {
    const app = makeApp()
    render(composed(app, 'companies'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Globex Corp'))

    const dialog = await screen.findByRole('dialog')
    // The profile surface + the record it profiles are inside the sheet.
    expect(dialog.querySelector('[data-slot="entity-profile"]')).not.toBeNull()
    expect(within(dialog).getAllByText('Globex Corp').length).toBeGreaterThan(0)
  })

  it('creates a record through the CreationSheet and the new row appears (InMemoryDataStore)', async () => {
    const app = makeApp()
    render(composed(app, 'companies'))
    expect(screen.queryByText('Umbrella Corp')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create New' }))
    // Companies has five fields → a single Basic Info group (no stepper).
    // Scoped to the CreationSheet dialog: the companies ListView is still
    // mounted behind it, and its "Company" column header now carries an
    // `aria-label` of its own (DataTableHeaderCell, commit 52ead56) — an
    // unscoped `findByLabelText(/Company/)` would match that `th` too.
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Company/), { target: { value: 'Umbrella Corp' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    // Persisted through the ModuleHandle → store, and re-listed into the table.
    await waitFor(() => expect(app.store.list('crm/companies').records.some((r) => r.title === 'Umbrella Corp')).toBe(true))
    expect(await screen.findByText('Umbrella Corp')).toBeInTheDocument()
  })

  it('uses `uiConfig.creation.label` for the create button when the blueprint sets one', () => {
    const labeledConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, creation: { label: 'New Collection Point' } },
    }
    const store = new InMemoryDataStore()
    store.registerConfig(labeledConfig)
    store.seed('crm/companies', structuredClone(companyRecords))
    const modules: ModuleBlueprint[] = [
      {
        id: 'companies',
        type: 'entity',
        label: 'Companies',
        views: ['list'],
        dataSource: { code: 'crm/companies' },
        config: labeledConfig as unknown as ConfigVal,
      },
    ]
    const blueprint: Blueprint = { id: 'gate', tenant: 'fams', brand: { name: 'Gate' }, user: managerUser, modules }
    const runtime = createAppRuntime({ blueprint, store, rules: {}, getUser: () => managerUser })
    render(
      <ComposedModule
        blueprint={modules[0]}
        data={runtime.module('companies')}
        renderers={v5TemplateRenderers}
      />,
    )
    expect(screen.getByRole('button', { name: 'New Collection Point' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create New' })).not.toBeInTheDocument()
  })
})

describe('v5TemplateRenderers — pipeline flow (crm deals golden)', () => {
  it('renders the KanbanView lanes + cards from the blueprint', () => {
    const app = makeApp()
    render(composed(app, 'deals'))
    for (const stage of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      // Lane HEADING, not bare text — a card's status chip now renders the
      // same label (see KanbanView.test.tsx's note on the fix7 enum-label fix).
      expect(screen.getByRole('heading', { name: stage })).toBeInTheDocument()
    }
    expect(screen.getByText('Hooli — Enterprise rollout')).toBeInTheDocument()
  })

  it('persists a permitted move through the guarded ModuleHandle path (manager: proposal → won)', () => {
    const app = makeApp(managerUser)
    render(composed(app, 'deals'))
    // D-104 "Hooli" is in proposal; a SalesManager may close it to won.
    fireEvent.keyDown(screen.getByRole('button', { name: /Move to stage: Hooli/ }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))
    // The move went through createAppRuntime's rule-enforced move → store.
    expect(app.store.read('crm/deals', 'D-104')?.status).toBe('won')
  })

  it('blocks what RBAC forbids: a SalesRep never even sees the manager-owned proposal card', () => {
    const app = makeApp(repUser)
    render(composed(app, 'deals'))
    // task_rules: a rep only sees rep-owned tasks. D-104 (owner u_mgr) is hidden;
    // D-101 (owner u_rep) is visible — the ModuleHandle list is RBAC-filtered.
    expect(screen.queryByText('Hooli — Enterprise rollout')).not.toBeInTheDocument()
    expect(screen.getByText('Globex — Platform pilot')).toBeInTheDocument()
  })

  it('opens the TaskDetail (with transition control) on card click', async () => {
    const app = makeApp()
    render(composed(app, 'deals'))
    fireEvent.click(screen.getByText('Hooli — Enterprise rollout'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('[data-slot="task-detail"]')).not.toBeNull()
    expect(within(dialog).getByRole('heading', { name: 'Hooli — Enterprise rollout', level: 1 })).toBeInTheDocument()
    // Blueprint right-panel contract slots.
    expect(within(dialog).getByRole('tab', { name: 'Timeline' })).toBeInTheDocument()
    // The stage-transition control is present (gated by the rule check).
    expect(within(dialog).getByRole('button', { name: /Status: Proposal/ })).toBeInTheDocument()
  })
})

describe('v5TemplateRenderers — the zero-code blueprint switch (phase-2 gate)', () => {
  it('renders three blueprints through the IDENTICAL ComposedModule call', () => {
    const app = makeApp()
    // The demo remounts the surface per selection (React `key`) so the module's
    // own view state resets on switch — here we model that with a fresh mount
    // each time. The JSX call is byte-for-byte identical; only the blueprint +
    // data props differ.
    render(composed(app, 'companies'))
    expect(screen.getByRole('table')).toBeInTheDocument() // entity → ListView
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()

    cleanup()
    render(composed(app, 'deals'))
    expect(screen.getByRole('heading', { name: 'Proposal' })).toBeInTheDocument() // pipeline → KanbanView lane
    expect(screen.getByText('Hooli — Enterprise rollout')).toBeInTheDocument()
    // Kanban is the active view — the entity table surface is gone entirely.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    cleanup()
    render(composed(app, 'vehicles'))
    expect(screen.getByRole('table')).toBeInTheDocument() // 2nd entity blueprint → ListView
    expect(screen.getByText('Fleet Truck 201')).toBeInTheDocument()
    expect(screen.getByText('Fleet Van 203')).toBeInTheDocument()
  })
})

describe('v5TemplateRenderers — denied-move feedback (Gap B: wired, not silent)', () => {
  // `KanbanView`'s own client-side `canMove` (here: `data.transitions`) and
  // `TaskDetail`'s `allowedTransitions` both agree the move is fine, but the
  // guarded write (`data.move`) still throws — modeling the rare case a rule
  // the optimistic client-side check couldn't see denies it anyway. Both
  // `onMove`'s and `onTaskTransition`'s catch blocks (previously silent) now
  // wire the same denied-move feedback path `KanbanView` defaults to.
  const dealsModule: ModuleBlueprint = {
    id: 'deals',
    type: 'pipeline',
    label: 'Deals',
    views: ['kanban'],
    dataSource: { code: 'crm/deals' },
    config: dealsConfig as unknown as ConfigVal,
  }

  function makeDenyingCtx(): ModuleRenderContext {
    return {
      module: dealsModule,
      data: {
        list: () => dealRecords,
        get: (id) => dealRecords.find((r) => r.id === id),
        transitions: () => ['won'],
        move: () => {
          throw new Error('denied by a rule the optimistic client-side check could not see')
        },
      },
      typeDef: getModuleType('pipeline')!,
      templateRef: 'KanbanView',
    }
  }

  it('announces when the guarded write denies a kanban move the client-side canMove check approved', () => {
    render(<V5ModuleSurface ctx={makeDenyingCtx()} />)
    fireEvent.keyDown(screen.getByRole('button', { name: /Move to stage: Hooli/ }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))
    // `onMove`'s catch calls the shared `announceDenied` (kanban/announce-
    // denied.ts), not a raw `announce()`. Synchronous — the macrotask defer
    // that used to be needed here is gone now that ui-kit suppresses its own
    // optimistic "Moved…" announce for a move the board didn't commit
    // (`KanbanBoardProps.formatMoveAnnouncement`).
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Move not allowed'))
  })

  it('announces when the guarded write denies a TaskDetail transition the allowedTransitions list approved', async () => {
    // (async only for `findByRole` below — the announce itself is synchronous.)
    render(<V5ModuleSurface ctx={makeDenyingCtx()} />)
    fireEvent.click(screen.getByText('Hooli — Enterprise rollout'))
    const dialog = await screen.findByRole('dialog')
    // `makeDenyingCtx`'s `transitions: () => ['won']` names exactly ONE
    // reachable stage, so the header renders that stage's own named button
    // (P1-I) rather than a "Status: Proposal" dropdown trigger — no menu to
    // open first.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Won' }))
    // Same shared `announceDenied` helper as the kanban-move test above, and
    // likewise synchronous now (no macrotask defer left to wait for).
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Move not allowed'))
  })
})

/**
 * Finding A7b-1 — an `Assignee` field stores a USER ID (`u_rep` in the crm
 * golden). The id reaches THREE surfaces of the same module and used to print
 * verbatim on all of them, because `resolveAssigneeName` was threaded only to
 * `ModuleView`'s toolbar Assignee dropdown. It is now injected once, around
 * the whole surface, so every surface resolves.
 */
describe('V5ModuleSurface — Assignee ids resolve to names on EVERY surface', () => {
  const ASSIGNEE_NAME = 'Rania Al Nuaimi'
  // Single-initial platform fix (2026-08-31) — Avatar's fallback is now the
  // FIRST letter only, never a two-letter "RN" monogram.
  const INITIALS = 'R'

  function makeCtx(views: ('kanban' | 'list')[]): ModuleRenderContext {
    const module: ModuleBlueprint = {
      id: 'deals',
      type: 'pipeline',
      label: 'Deals',
      views,
      dataSource: { code: 'crm/deals' },
      config: dealsConfig as unknown as ConfigVal,
    }
    return {
      module,
      data: {
        list: () => dealRecords,
        get: (id) => dealRecords.find((r) => r.id === id),
        transitions: () => [],
      },
      typeDef: getModuleType('pipeline')!,
      templateRef: views[0] === 'kanban' ? 'KanbanView' : 'ListView',
    }
  }

  const resolveAssigneeName = (id: string) => (id === 'u_rep' ? ASSIGNEE_NAME : undefined)

  it('resolves the id in the KANBAN card footer', () => {
    render(<V5ModuleSurface ctx={makeCtx(['kanban'])} resolveAssigneeName={resolveAssigneeName} />)
    expect(screen.getAllByText(INITIALS).length).toBeGreaterThan(0)
    expect(screen.queryByText('u_rep')).not.toBeInTheDocument()
  })

  it('resolves the id in the LIST column cell', () => {
    render(<V5ModuleSurface ctx={makeCtx(['list'])} resolveAssigneeName={resolveAssigneeName} />)
    expect(screen.getAllByText(INITIALS).length).toBeGreaterThan(0)
    expect(screen.queryByText('u_rep')).not.toBeInTheDocument()
  })

  it('resolves the id in the DETAIL rows', async () => {
    render(<V5ModuleSurface ctx={makeCtx(['list'])} resolveAssigneeName={resolveAssigneeName} />)
    fireEvent.click(screen.getByText('Globex — Platform pilot'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByText(INITIALS).length).toBeGreaterThan(0)
    expect(within(dialog).queryByText('u_rep')).not.toBeInTheDocument()
  })

  it('still renders the raw id when the app injects no resolver (unchanged default)', () => {
    render(<V5ModuleSurface ctx={makeCtx(['list'])} />)
    expect(screen.queryByText(INITIALS)).not.toBeInTheDocument()
  })
})

/**
 * wp3f — the metadata -> component path for the wizard's three authored knobs.
 *
 * `CreationSheet` has accepted `showSummaryStep` / `stepperVariant` /
 * `stepIcons` since wp3a/wp3d/wp3e, but the renderer never passed them, so
 * they were reachable only from a React caller — not from a blueprint, which
 * is the platform's actual consumption model. These lock the WIRING at the
 * seam that was missing; the component behaviour itself is covered by
 * `CreationSheet.test.tsx`.
 */
describe('v5-module-renderers — uiConfig.creation reaches CreationSheet (wp3f)', () => {
  function composedWithCreation(creation: Record<string, unknown>) {
    const app = makeApp()
    const module = app.modules.find((m) => m.id === 'companies')!
    const base = module.config as unknown as { uiConfig: Record<string, unknown> }
    const patched = {
      ...module,
      config: { ...base, uiConfig: { ...base.uiConfig, creation } } as unknown as typeof module.config,
    }
    return (
      <ComposedModule blueprint={patched} data={app.runtime.module('companies')} renderers={v5TemplateRenderers} />
    )
  }

  async function openSheet() {
    fireEvent.click(screen.getByRole('button', { name: 'Create New' }))
    return screen.findByRole('dialog')
  }

  it('renders a stepper rail when the blueprint authors layout: "wizard"', async () => {
    render(composedWithCreation({ layout: 'wizard', basicCount: 2 }))
    await openSheet()
    expect(document.querySelector('[data-slot="stepper"]')).not.toBeNull()
  })

  it('adds the synthesized Summary step ONLY when the blueprint asks for it', async () => {
    render(composedWithCreation({ layout: 'wizard', basicCount: 2 }))
    await openSheet()
    const without = document.querySelectorAll('[data-slot="stepper-marker"]').length
    cleanup()

    render(composedWithCreation({ layout: 'wizard', basicCount: 2, showSummaryStep: true }))
    await openSheet()
    expect(document.querySelectorAll('[data-slot="stepper-marker"]').length).toBe(without + 1)
  })

  it('threads stepperVariant: "tabs" through to the rail', async () => {
    render(composedWithCreation({ layout: 'wizard', basicCount: 2, stepperVariant: 'tabs' }))
    await openSheet()
    expect(document.querySelector('[data-slot="stepper"]')).not.toBeNull()
    // The tabs variant renders no numbered/check markers — that is the
    // observable difference from the default `numbered` rail.
    expect(document.querySelectorAll('[data-slot="stepper-marker"]').length).toBe(0)
  })

  it('resolves stepIcons authored as icon NAMES (JSON cannot carry a ReactNode)', async () => {
    render(composedWithCreation({ layout: 'wizard', basicCount: 2, stepIcons: { basic: 'wrench' } }))
    await openSheet()
    expect(document.querySelector('[data-slot="stepper-marker"] svg')).not.toBeNull()
  })
})

/**
 * fix1 (2026-09-05, run-2026-09-05-preventive-maintenance): the CreationSheet
 * never got a `context` prop at all, so EVERY `SingleReference` field's
 * `Combobox` read `context?.referenceOptions ?? []` — permanently empty,
 * "No results" for every query, regardless of what the referenced module's
 * own list held (found via the PM wizard's Vehicle field; reproduced here
 * generically off the crm golden's pre-existing `Company` reference —
 * `deals.systemcol3`, `entityType: 'crm/companies'` — so the fix is proven
 * for ANY `SingleReference` field, not special-cased to one entity word).
 */
describe('v5-module-renderers — SingleReference creation picker resolves options (fix1)', () => {
  function makeLinkedApp() {
    const store = new InMemoryDataStore()
    store.registerConfig(dealsConfig)
    store.registerConfig(companiesConfig)
    store.seed('crm/deals', structuredClone(dealRecords))
    store.seed('crm/companies', structuredClone(companyRecords))

    const modules: ModuleBlueprint[] = [
      {
        id: 'deals',
        type: 'pipeline',
        label: 'Deals',
        views: ['kanban', 'list'],
        dataSource: { code: 'crm/deals', rulesRef: 'deals' },
        config: dealsConfig as unknown as ModuleBlueprint['config'],
      },
      {
        id: 'companies',
        type: 'entity',
        label: 'Companies',
        views: ['list'],
        dataSource: { code: 'crm/companies' },
        config: companiesConfig as unknown as ModuleBlueprint['config'],
      },
    ]
    const blueprint: Blueprint = { id: 'gate', tenant: 'fams', brand: { name: 'Gate' }, user: managerUser, modules }
    const runtime = createAppRuntime({ blueprint, store, rules: { deals: dealsPipelineRules }, getUser: () => managerUser })

    // The generic app→surface seam under test (`V5ModuleSurfaceProps.resolveModuleRecords`,
    // ALREADY wired in the real demo app's `boot.ts` before this fix — the gap
    // was purely on the templates side never consulting it for the creation
    // sheet). Resolves a referenced module's `code` to its config + records,
    // exactly like the real `makeModuleRecordsResolver`.
    const resolveModuleRecords = (code: string) => {
      const mod = modules.find((m) => m.dataSource?.code === code)
      if (!mod) return undefined
      const { records } = store.list(code)
      return { config: mod.config as unknown as EntityConfig, records }
    }

    const renderers = createV5TemplateRenderers({ resolveModuleRecords })
    return (
      <ComposedModule blueprint={modules[0]} data={runtime.module('deals')} renderers={renderers} />
    )
  }

  it('lists the referenced module\'s own records in the picker, and a typed query finds one by name', async () => {
    render(makeLinkedApp())
    fireEvent.click(screen.getByRole('button', { name: 'Create New' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Company' }))
    // The field's own search input, distinct from the ListView's unrelated
    // "Search Deal" toolbar field (same regex would match both) — its
    // placeholder is the widget's LABEL-derived string (widgets.tsx:
    // `Search ${descriptor.label ?? descriptor.entityType}`). It used to read
    // the raw `entityType` ("Search crm/companies"), which put a machine code
    // in user-facing copy on every reference picker.
    const search = await screen.findByPlaceholderText('Search Company')
    fireEvent.change(search, { target: { value: companyRecords[0].title as string } })

    expect(await screen.findByRole('option', { name: companyRecords[0].title as string })).toBeInTheDocument()
  })

  it('stays empty (not crash) with no `resolveModuleRecords` injected — pre-fix default preserved', async () => {
    render(composed(makeApp(), 'deals'))
    fireEvent.click(screen.getByRole('button', { name: 'Create New' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Company' }))
    expect(await screen.findByText(/No results/i)).toBeInTheDocument()
  })
})

/**
 * fix7 (2026-09-06, run-2026-09-05-job-orders): `resolveDisplayName` only
 * ever consulted the two PEOPLE directories (`resolveAssigneeName`/
 * `resolvePersonName`) — a reference to a NON-person record fed straight
 * through to `useDisplayName()` (`ReadReference`/`LinkView`,
 * `@fams/v5-composer`) with no resolver that ever looked the id up in the
 * referenced module's own records, so it rendered the raw stored id. A
 * SEEDED reference happening to store an id that already reads as a title
 * (or, as here, this golden's `Company` seed literally stores the title
 * string) hid the bug; a record created THIS SESSION gets a machine id with
 * no such coincidence to fall back on — the exact case
 * `qa/gate-flow.mjs`'s `F2.linked-job-order-reference` assertion catches.
 *
 * Reproduced generically off the crm golden's pre-existing `Company`
 * reference (`deals.systemcol3`, `entityType: 'crm/companies'` — the same
 * field fix1 above uses) by pointing a deal at a company created THIS TEST
 * via `store.create` (a machine id, distinct from any human-readable
 * uniqueidentifier) — so the fix is proven for ANY reference target, not
 * special-cased to one entity word.
 */
describe('v5-module-renderers — reference display name resolves across modules, not people only (fix7)', () => {
  it("a reference to a record with a MACHINE id resolves to that record's title", async () => {
    const store = new InMemoryDataStore()
    store.registerConfig(dealsConfig)
    store.registerConfig(companiesConfig)
    store.seed('crm/deals', structuredClone(dealRecords))
    store.seed('crm/companies', structuredClone(companyRecords))

    // A record created THIS SESSION: a machine id (`store.create`'s own
    // `e_<time36>_<counter36>` generator), no coincidental id === title/uid
    // match to hide behind.
    const freshCompany = store.create('crm/companies', { title: 'Freshly Made Co' })
    expect(freshCompany.id).not.toBe(freshCompany.uniqueidentifier)
    expect(freshCompany.id).not.toBe(freshCompany.title)
    // Point a deal's Company reference at it directly by id — the exact
    // write shape a cross-module automation performs (a raw record id, not
    // a title), unlike this golden's seed (which stores the title string).
    store.update('crm/deals', 'D-101', { systemcol3: freshCompany.id })

    const modules: ModuleBlueprint[] = [
      {
        id: 'deals',
        type: 'pipeline',
        label: 'Deals',
        views: ['kanban', 'list'],
        dataSource: { code: 'crm/deals', rulesRef: 'deals' },
        config: dealsConfig as unknown as ConfigVal,
      },
      {
        id: 'companies',
        type: 'entity',
        label: 'Companies',
        views: ['list'],
        dataSource: { code: 'crm/companies' },
        config: companiesConfig as unknown as ConfigVal,
      },
    ]
    const blueprint: Blueprint = { id: 'gate', tenant: 'fams', brand: { name: 'Gate' }, user: managerUser, modules }
    const runtime = createAppRuntime({ blueprint, store, rules: { deals: dealsPipelineRules }, getUser: () => managerUser })
    // The same generic app→surface seam under test as fix1's `makeLinkedApp`.
    const resolveModuleRecords = (code: string) => {
      const mod = modules.find((m) => m.dataSource?.code === code)
      if (!mod) return undefined
      const { records } = store.list(code)
      return { config: mod.config as unknown as EntityConfig, records }
    }
    const renderers = createV5TemplateRenderers({ resolveModuleRecords })

    render(<ComposedModule blueprint={modules[0]} data={runtime.module('deals')} renderers={renderers} />)
    fireEvent.click(screen.getByText('Globex — Platform pilot')) // D-101
    const dialog = await screen.findByRole('dialog')

    expect(await within(dialog).findByText('Freshly Made Co')).toBeInTheDocument()
    expect(within(dialog).queryByText(freshCompany.id)).not.toBeInTheDocument()
  })
})
