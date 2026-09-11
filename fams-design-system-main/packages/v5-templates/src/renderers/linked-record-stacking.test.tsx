import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  ComposedModule,
  InMemoryDataStore,
  createAppRuntime,
  toEntityConfig,
  type Blueprint,
  type EntityConfig,
  type ModuleBlueprint,
  type ModuleConfigJson,
} from '@fams/v5-composer'
import { createV5TemplateRenderers, type LinkedRecordResolution } from './v5-module-renderers'
import {
  companiesConfig,
  dealsModuleJson,
  dealRecords,
  companyRecords,
  dealsPipelineRules,
  managerUser,
} from '../views/fixtures'

/**
 * Linked-record navigation — PLATFORM-MODEL's side-sheet contract: "opening a
 * linked record from inside a sheet STACKS a new sheet on top", across modules
 * and across detail flavors.
 *
 * Every assertion here is on STACK DEPTH (`[data-slot="profile-stack-tab"]`),
 * never on "a sheet is open" — a sheet that silently REPLACED its parent would
 * pass an existence check and is exactly the failure this seam exists to
 * prevent.
 */

/** The golden deals blueprint with `LinkView` authored on its Company reference. */
function dealsJsonWithLinkedCompany(): ModuleConfigJson {
  const json = structuredClone(dealsModuleJson) as unknown as ModuleConfigJson & {
    uiConfig: { profile: { details: { col: string; component?: unknown }[] } }
  }
  const company = json.uiConfig.profile.details.find((d) => d.col === 'systemcol3')!
  company.component = { name: 'LinkView' }
  return json as ModuleConfigJson
}

function makeApp(opts: { linked?: boolean } = {}) {
  const dealsLinked: EntityConfig = toEntityConfig(dealsJsonWithLinkedCompany())
  const store = new InMemoryDataStore()
  store.registerConfig(dealsLinked)
  store.registerConfig(companiesConfig)
  // The golden deals seed stores the company's NAME in its reference column;
  // a real reference stores the target's id, so point it at one (the graph is
  // what is under test, not the golden's placeholder text).
  store.seed(
    'crm/deals',
    structuredClone(dealRecords).map((r) => ({ ...r, systemcol3: companyRecords[0].id })),
  )
  store.seed('crm/companies', structuredClone(companyRecords))

  const modules: ModuleBlueprint[] = [
    {
      id: 'deals',
      type: 'pipeline',
      label: 'Deals',
      views: ['kanban', 'list'],
      dataSource: { code: 'crm/deals', rulesRef: 'deals' },
      config: dealsLinked as unknown as ModuleBlueprint['config'],
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

  // The HOST's directory — the only side that knows an entity code's module,
  // its kind (→ detail flavor) and how to read a row. Deliberately built from
  // the blueprint's own module list, never a module-name branch.
  const resolveLinkedRecord = vi.fn(({ entityType, recordId }): LinkedRecordResolution | undefined => {
    const mod = modules.find((m) => m.dataSource?.code === entityType)
    if (!mod) return undefined
    const record = store.read(entityType, recordId)
    if (!record) return undefined
    return {
      config: mod.config as unknown as EntityConfig,
      record: record as never,
      moduleType: mod.type,
      moduleLabel: mod.label,
    }
  })

  const renderers = createV5TemplateRenderers(opts.linked === false ? {} : { resolveLinkedRecord })
  const view = (id: string) => {
    const module = modules.find((m) => m.id === id)!
    return <ComposedModule blueprint={module} data={runtime.module(id)} renderers={renderers} />
  }
  return { view, resolveLinkedRecord, companyId: String(companyRecords[0].id) }
}

const tabs = () => document.querySelectorAll('[data-slot="profile-stack-tab"]')

async function openFirstDeal() {
  const card = document.querySelector('[data-slot="kanban-card"]') as HTMLElement | null
  fireEvent.click(card ?? screen.getAllByText(/Deal/)[0])
  await waitFor(() => expect(document.querySelector('[data-slot="task-detail"]')).toBeTruthy())
}

describe('linked-record navigation — cross-module stacking', () => {
  it('opening a linked record from INSIDE a sheet stacks a second sheet (depth 1 → 2)', async () => {
    const app = makeApp()
    render(app.view('deals'))
    await openFirstDeal()
    expect(tabs()).toHaveLength(1)

    const link = document.querySelector('[data-slot="link-view"]') as HTMLElement
    expect(link).toBeTruthy()
    fireEvent.click(link)

    await waitFor(() => expect(tabs()).toHaveLength(2))
    // The pipeline record it was opened FROM is still in the stack — the new
    // sheet came over the top, it did not replace the parent.
    expect(app.resolveLinkedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'crm/companies' }),
    )
  })

  it('the TARGET module’s flavor opens — an entity record is Entity Detail even when reached from a pipeline', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(document.querySelector('[data-slot="entity-profile"]')).toBeTruthy())
    expect(document.querySelector('[data-slot="task-detail"]')).toBeNull()
  })

  it('closing the top sheet returns to the one beneath, not the bare page', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(tabs()).toHaveLength(2))

    const closeTop = tabs()[1].querySelector('button[aria-label^="Close "]') as HTMLElement
    fireEvent.click(closeTop)

    await waitFor(() => expect(tabs()).toHaveLength(1))
    expect(document.querySelector('[data-slot="task-detail"]')).toBeTruthy()
  })

  it('close-all and minimize behave identically for a stack opened across modules', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(tabs()).toHaveLength(2))

    // Minimize KEEPS the stack (the surface hides, nothing is dropped).
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    await waitFor(() => expect(document.querySelector('[data-slot="profile-stack"]')).toBeNull())

    // Reopen and close-all clears both records at once.
    fireEvent.click(document.querySelector('[data-slot="kanban-card"]') as HTMLElement)
    await waitFor(() => expect(tabs().length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Close all records' }))
    await waitFor(() => expect(document.querySelector('[data-slot="profile-stack"]')).toBeNull())
  })
})

describe('linked-record navigation — Escape pops one sheet and clears it', () => {
  const esc = () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

  it('Escape at depth 2 leaves depth 1 with the parent open — it does not collapse the stack', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(tabs()).toHaveLength(2))

    esc()

    await waitFor(() => expect(tabs()).toHaveLength(1))
    // The parent pipeline record is still the open surface, exactly as if the
    // top tab's × had been clicked.
    expect(document.querySelector('[data-slot="task-detail"]')).toBeTruthy()
  })

  it('Escape CLEARS the popped record — a stack escaped to empty never resurrects', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(tabs()).toHaveLength(2))

    esc()
    await waitFor(() => expect(tabs()).toHaveLength(1))
    esc()
    await waitFor(() => expect(document.querySelector('[data-slot="profile-stack"]')).toBeNull())

    // Opening ONE unrelated record must give depth 1, not depth 3 with the two
    // "closed" records still tabbed (the minimize-leak this replaced).
    fireEvent.click(document.querySelectorAll('[data-slot="kanban-card"]')[1] as HTMLElement)
    await waitFor(() => expect(tabs().length).toBeGreaterThan(0))
    expect(tabs()).toHaveLength(1)
  })

  it('focus after Escape is never <body>', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    fireEvent.click(document.querySelector('[data-slot="link-view"]') as HTMLElement)
    await waitFor(() => expect(tabs()).toHaveLength(2))

    esc()
    await waitFor(() => expect(tabs()).toHaveLength(1))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('linked-record navigation — hosts that wire nothing are unchanged', () => {
  it('a LinkView reference stays inert text when the app injects no resolver', async () => {
    render(makeApp({ linked: false }).view('deals'))
    await openFirstDeal()
    expect(tabs()).toHaveLength(1)
    expect(document.querySelector('[data-slot="link-view"]')).toBeNull()
  })

  it('a LinkView placement on a NON-reference field (the Deal ID row) never becomes a link', async () => {
    render(makeApp().view('deals'))
    await openFirstDeal()
    const links = [...document.querySelectorAll('[data-slot="link-view"]')]
    // Only the Company reference is activatable; `fld_uniqueidentifier` also
    // authors `LinkView` but is not an Entity reference, so it stays text.
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('data-entity-type')).toBe('crm/companies')
  })
})
