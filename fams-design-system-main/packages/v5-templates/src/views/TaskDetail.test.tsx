import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { EntityConfig } from '@fams/v5-composer'
import { TaskDetail, type TaskDetailTabRenderer } from './TaskDetail'
import { dealsConfig, dealRecords } from './fixtures'
import { getSectionComponentRenderer, registerSectionComponent } from '../lib/section-components'

const hooli = dealRecords.find((r) => r.id === 'D-104')! // stage "proposal"

/** dealsConfig with one synthetic profile section, for the Accordion tests —
 * the shipped crm/deals fixture has `sections: []`. */
const dealsConfigWithSection: EntityConfig = {
  ...dealsConfig,
  uiConfig: {
    ...dealsConfig.uiConfig,
    profile: dealsConfig.uiConfig.profile
      ? {
          ...dealsConfig.uiConfig.profile,
          sections: [
            {
              name: 'Company Info',
              order: 1,
              fields: [{ col: 'systemcol3', order: 1, name: 'Segment' }],
            },
          ],
        }
      : undefined,
  },
}

const tabRenderers: Record<string, TaskDetailTabRenderer> = {
  PipelineTimeline: () => <p>timeline body</p>,
}

/**
 * The HEADER status pill, scoped to `[data-slot="task-detail-header"]`.
 *
 * fix8 (2026-09-06): these three assertions were plain `getByText('Proposal')`
 * and passed only because of a defect. Until fix7 taught `ReadEnum` the
 * blueprint's own `uiConfig.statusList` label map, the details grid's own
 * `status` cell printed the raw storage key (`proposal`) while the header pill
 * printed the authored label (`Proposal`) — accidental uniqueness. Both now
 * read "Proposal", so scope by ancestry. Verified in the DOM first (the
 * fix4/wave-7 rule): the second match is the details-grid cell the crm golden
 * fixture places there, not a duplicated header.
 *
 * That fixture duplication is itself the shape wave 7 removed from the real
 * `job-orders` blueprint (status rendered twice on one sheet); it survives
 * here only in a DS test fixture, and is recorded in the run report as a
 * recommended fixture cleanup rather than changed under a closing gate.
 */
function headerStatusPill(label: string): HTMLElement {
  const header = document.querySelector('[data-slot="task-detail-header"]')
  expect(header).not.toBeNull()
  return within(header as HTMLElement).getByText(label, { selector: '[data-slot="badge"]' })
}

describe('TaskDetail — pipeline record surface (crm golden: deals)', () => {
  it('renders the header title, the stage control, and detail fields', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} tabRenderers={tabRenderers} />)
    expect(screen.getByRole('heading', { name: 'Hooli — Enterprise rollout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Status: Proposal/ })).toBeInTheDocument()
    // Detail field labels derived from the blueprint profile.
    expect(screen.getByText('Deal ID')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
  })

  it('renders the right-panel contract-slot tabs and resolves an injected body', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} tabRenderers={tabRenderers} />)
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument()
    expect(screen.getByText('timeline body')).toBeInTheDocument()
  })

  it('shows a placeholder for an unresolved contract slot', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} />)
    expect(screen.getByText(/contract slot/i)).toBeInTheDocument()
  })

  it('gates the stage menu by allowedTransitions and fires onTransition for a permitted target', () => {
    const onTransition = vi.fn()
    render(
      <TaskDetail
        config={dealsConfig}
        record={hooli}
        allowedTransitions={['won', 'lost']}
        onTransition={onTransition}
      />,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: /Status: Proposal/ }), { key: 'Enter' })
    // A disallowed target is disabled with the "Not permitted" reason.
    expect(screen.getAllByText('Not permitted').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('menuitem', { name: /Won/ }))
    expect(onTransition).toHaveBeenCalledWith('won', undefined)
  })

  it('renders a single named transition button (not a dropdown) when exactly one transition is allowed, and fires onTransition on click', () => {
    const onTransition = vi.fn()
    render(
      <TaskDetail
        config={dealsConfig}
        record={hooli}
        allowedTransitions={['won']}
        onTransition={onTransition}
      />,
    )
    // No generic "Change Status" trigger and no menu — a single reachable
    // stage renders that stage's own label as a plain button (P1-I).
    expect(screen.queryByRole('button', { name: /Change Status/ })).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Won' })
    fireEvent.click(button)
    expect(onTransition).toHaveBeenCalledWith('won')
  })

  it('renders no stage control at all when allowedTransitions is an empty list (a terminal stage)', () => {
    const onTransition = vi.fn()
    render(
      <TaskDetail config={dealsConfig} record={hooli} allowedTransitions={[]} onTransition={onTransition} />,
    )
    // The current-stage badge still renders — only the move affordance goes
    // away, same as a Kanban card with zero drop targets stops being
    // draggable rather than disappearing.
    expect(headerStatusPill('Proposal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Won' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Change Status/ })).not.toBeInTheDocument()
  })

  it('renders each blueprint section as a collapsible, open-by-default group', () => {
    render(<TaskDetail config={dealsConfigWithSection} record={hooli} />)
    const trigger = screen.getByRole('button', { name: 'Company Info' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Segment')).toBeInTheDocument()
  })

  it('collapses a section when its trigger is clicked', () => {
    render(<TaskDetail config={dealsConfigWithSection} record={hooli} />)
    const trigger = screen.getByRole('button', { name: 'Company Info' })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the id chip in the header when the record has a uniqueidentifier', () => {
    const { container } = render(<TaskDetail config={dealsConfig} record={hooli} />)
    const chip = container.querySelector('[data-slot="task-detail-id-chip"]')
    expect(chip).not.toBeNull()
    expect(within(chip as HTMLElement).getByText(String(hooli.uniqueidentifier))).toBeInTheDocument()
  })

  it('renders an "Additional Info" section from the additionalInfo prop', () => {
    render(
      <TaskDetail
        config={dealsConfig}
        record={hooli}
        additionalInfo={{ description: 'Some long description text.' }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Additional Info' })).toBeInTheDocument()
    expect(screen.getByText('Some long description text.')).toBeInTheDocument()
  })

  it('omits the "Additional Info" section when the prop is not given', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} />)
    expect(screen.queryByRole('button', { name: 'Additional Info' })).not.toBeInTheDocument()
  })

  it("falls back to the stage's own blueprint color for the status pill when no statusTones entry is given", () => {
    render(<TaskDetail config={dealsConfig} record={hooli} />)
    const stageDef = dealsConfig.uiConfig.statusList.find((s) => s.key === hooli.status)!
    const pill = headerStatusPill(stageDef.label)
    expect(pill).toHaveStyle({ backgroundColor: stageDef.color })
  })

  it('prefers an explicit statusTones entry over the blueprint color fallback', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} statusTones={{ [hooli.status!]: 'warning' }} />)
    const stageDef = dealsConfig.uiConfig.statusList.find((s) => s.key === hooli.status)!
    const pill = headerStatusPill(stageDef.label)
    expect(pill).not.toHaveStyle({ backgroundColor: stageDef.color })
    expect(pill).toHaveClass('bg-warning')
  })

  it('renders the header (id chip, status, collapse control) INSIDE the left pane, not above the two-pane body (figma-spec-detail.md §2)', () => {
    const { container } = render(<TaskDetail config={dealsConfig} record={hooli} />)
    const leftPane = container.querySelector('[data-slot="task-detail-fields"]')!
    expect(leftPane.querySelector('[data-slot="task-detail-header"]')).not.toBeNull()
    expect(leftPane.querySelector('[data-slot="task-detail-id-chip"]')).not.toBeNull()
    // The header is the first child, ahead of the details FieldGrid.
    expect(leftPane.firstElementChild).toHaveAttribute('data-slot', 'task-detail-header')
  })

  it('the collapse control lives in the header row and toggles the right panel', () => {
    render(<TaskDetail config={dealsConfig} record={hooli} />)
    const toggle = screen.getByRole('button', { name: 'Collapse panel' })
    const panel = document.querySelector('[data-slot="task-detail-panel"]')!
    expect(panel).not.toHaveAttribute('hidden')
    fireEvent.click(toggle)
    expect(panel).toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Expand panel' })).toBeInTheDocument()
  })

  it('renders a `sectionActions` element as a sibling of the section trigger, keyed by the section id', () => {
    // The fixture section carries no explicit `id`, so `deriveDetail` falls
    // back to the positional `section-0` key (see `config-render.test.ts`'s
    // matching fallback-id coverage).
    render(
      <TaskDetail
        config={dealsConfigWithSection}
        record={hooli}
        sectionActions={{ 'section-0': <button type="button">More</button> }}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Company Info' })
    const menu = screen.getByRole('button', { name: 'More' })
    expect(trigger).not.toContainElement(menu)
  })

  it('pre-registers the built-in NotesSection/BeforePhotosSection/LocationMapSection names just by loading this module (zero app code)', () => {
    // Importing `TaskDetail` from this test file is what triggers the
    // top-level `registerSectionComponent(...)` calls (see TaskDetail.tsx) —
    // no render needed to prove the registration itself took effect.
    expect(typeof getSectionComponentRenderer('NotesSection')).toBe('function')
    expect(typeof getSectionComponentRenderer('BeforePhotosSection')).toBe('function')
    expect(typeof getSectionComponentRenderer('LocationMapSection')).toBe('function')
  })

  it('renders a section through its registered named component instead of a FieldGrid', () => {
    registerSectionComponent('TestSectionRenderer', ({ record }) => <p>Rendered for {String(record.id)}</p>)
    const configWithComponentSection: EntityConfig = {
      ...dealsConfig,
      uiConfig: {
        ...dealsConfig.uiConfig,
        profile: dealsConfig.uiConfig.profile
          ? {
              ...dealsConfig.uiConfig.profile,
              sections: [
                {
                  id: 'sec_custom',
                  name: 'Custom',
                  order: 1,
                  fields: [],
                  component: { name: 'TestSectionRenderer' },
                },
              ],
            }
          : undefined,
      },
    }
    render(<TaskDetail config={configWithComponentSection} record={hooli} />)
    expect(screen.getByText(`Rendered for ${hooli.id}`)).toBeInTheDocument()
  })

  it('falls back to a placeholder for an unregistered section component name, instead of crashing', () => {
    const configWithBadSection: EntityConfig = {
      ...dealsConfig,
      uiConfig: {
        ...dealsConfig.uiConfig,
        profile: dealsConfig.uiConfig.profile
          ? {
              ...dealsConfig.uiConfig.profile,
              sections: [
                { id: 'sec_bad', name: 'Bad', order: 1, fields: [], component: { name: 'NotRegisteredAnywhere' } },
              ],
            }
          : undefined,
      },
    }
    render(<TaskDetail config={configWithBadSection} record={hooli} />)
    expect(screen.getByText(/No section renderer is registered/)).toBeInTheDocument()
  })
})
