import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { UserContext } from '@fams/v5-composer'
import { EntityProfile } from './EntityProfile'
import type { EntityProfileTab, ProfileTabRenderer } from './EntityProfile.types'
import { profileTabRegistry } from './ProfileTabRegistry'
import { registerTabComponent } from './tab-components'
import { dealsConfig, dealRecord, companiesConfig, companyRecord } from './fixtures'

const tabRenderers: Record<string, ProfileTabRenderer> = {
  PipelineTimeline: () => <p>timeline body</p>,
  ActivityFeed: () => <p>activity body</p>,
  LinkedItems: () => <p>linked body</p>,
  Attachments: () => <p>files body</p>,
}

const admin: UserContext = { id: 'u1', roles: ['admin'], privileges: ['audit.view'] }
const basicUser: UserContext = { id: 'u2', roles: ['user'], privileges: [] }

describe('EntityProfile — blueprint-driven render (crm golden)', () => {
  it('renders identity from deriveDetail: title, uid, status label, key details', () => {
    render(
      <EntityProfile config={dealsConfig} record={dealRecord} tabRenderers={tabRenderers} userContext={admin} />,
    )
    // Derived title + uid (uid appears both as "ID#" and as a detail cell).
    expect(screen.getByRole('heading', { name: 'Globex Expansion' })).toBeInTheDocument()
    expect(screen.getAllByText(/D-5001/).length).toBeGreaterThan(0)
    // Derived key-detail labels (from the blueprint profile.details placements).
    expect(screen.getByText('Deal ID')).toBeInTheDocument()
    // Status label resolved from statusList (key "qualified" → label "Qualified").
    expect(screen.getAllByText('Qualified').length).toBeGreaterThan(0)
  })

  it('renders the right-panel tab set from the blueprint and shows the active tab body', () => {
    const { rerender } = render(
      <EntityProfile config={dealsConfig} record={dealRecord} activeTabId="timeline" tabRenderers={tabRenderers} userContext={admin} />,
    )
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument()
    // Active tab body resolved via the injected renderer map (controlled path,
    // matching ui-kit's own Tabs test — jsdom doesn't fire Radix's focus-based
    // activation on a bare click).
    expect(screen.getByText('timeline body')).toBeInTheDocument()
    rerender(
      <EntityProfile config={dealsConfig} record={dealRecord} activeTabId="activity" tabRenderers={tabRenderers} userContext={admin} />,
    )
    expect(screen.getByText('activity body')).toBeInTheDocument()
  })

  it('fires onTabChange when a tab is chosen', () => {
    const onTabChange = vi.fn()
    render(
      <EntityProfile config={dealsConfig} record={dealRecord} tabRenderers={tabRenderers} userContext={admin} onTabChange={onTabChange} />,
    )
    fireEvent.focus(screen.getByRole('tab', { name: 'Activity' }))
    expect(onTabChange).toHaveBeenCalledWith('activity')
  })

  it('renders companies (no rightPanel tabs) with an empty-sections notice', () => {
    render(<EntityProfile config={companiesConfig} record={companyRecord} />)
    expect(screen.getByRole('heading', { name: 'Globex Corporation' })).toBeInTheDocument()
    expect(screen.getByText('No sections available.')).toBeInTheDocument()
  })
})

describe('EntityProfile — metadata-gated tab visibility', () => {
  const gatedTabs: EntityProfileTab[] = [
    { id: 'audit', label: 'Audit', requiredPrivileges: ['audit.view'], content: <p>audit body</p> },
    {
      id: 'adminOnly',
      label: 'AdminOnly',
      visibleWhen: { '$.user.roles': { $in: ['admin'] } },
      content: <p>admin body</p>,
    },
  ]

  it('hides privilege- and condition-gated tabs from an unentitled user', () => {
    render(<EntityProfile config={dealsConfig} record={dealRecord} tabs={gatedTabs} tabRenderers={tabRenderers} userContext={basicUser} />)
    expect(screen.queryByRole('tab', { name: 'Audit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'AdminOnly' })).not.toBeInTheDocument()
    // Blueprint tabs still present.
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('honours a BLUEPRINT tab\'s own visibleWhen (one module, two record shapes)', () => {
    // Regression guard: `EntityProfile` mapped blueprint tabs to
    // `{id, label, component, componentProps}` and dropped any authored
    // `visibleWhen`/`requiredPrivileges`, so only consumer-supplied (`tabs`)
    // tabs could ever be gated. Without the pass-through, a module carrying
    // one tab set per record shape showed BOTH sets to every record.
    const gatedBlueprint = {
      ...dealsConfig,
      uiConfig: {
        ...dealsConfig.uiConfig,
        profile: {
          ...dealsConfig.uiConfig.profile!,
          rightPanel: {
            type: 'tab' as const,
            tabs: (dealsConfig.uiConfig.profile!.rightPanel?.tabs ?? []).map((t) =>
              t.key === 'timeline'
                ? { ...t, visibleWhen: { '$.task.status': { $eq: '__never__' } } }
                : t,
            ),
          },
        },
      },
    }
    render(
      <EntityProfile config={gatedBlueprint} record={dealRecord} tabRenderers={tabRenderers} userContext={admin} />,
    )
    expect(screen.queryByRole('tab', { name: 'Timeline' })).not.toBeInTheDocument()
    // Its ungated siblings still render.
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
  })

  it('shows gated tabs to an entitled user', () => {
    render(<EntityProfile config={dealsConfig} record={dealRecord} tabs={gatedTabs} tabRenderers={tabRenderers} userContext={admin} />)
    expect(screen.getByRole('tab', { name: 'Audit' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AdminOnly' })).toBeInTheDocument()
  })

  it('falls back to the first visible tab when the active tab loses its privilege mid-session', () => {
    const { rerender } = render(
      <EntityProfile config={dealsConfig} record={dealRecord} tabs={gatedTabs} tabRenderers={tabRenderers} userContext={admin} />,
    )
    // Activate the privilege-gated "Audit" tab (uncontrolled — remembered as `internalTab`).
    fireEvent.focus(screen.getByRole('tab', { name: 'Audit' }))
    expect(screen.getByText('audit body')).toBeInTheDocument()

    // Revoke the privilege backing it (e.g. a role change) by re-rendering with a
    // user who no longer holds `audit.view`. Without a fallback, the remembered
    // `internalTab` ('audit') stays the `Tabs value` even though "Audit" no longer
    // appears in `visibleTabs` — a `Tabs value` matching no rendered `TabsTrigger`/
    // `TabsContent` (blank panel, nothing shown selected).
    rerender(
      <EntityProfile config={dealsConfig} record={dealRecord} tabs={gatedTabs} tabRenderers={tabRenderers} userContext={basicUser} />,
    )
    expect(screen.queryByRole('tab', { name: 'Audit' })).not.toBeInTheDocument()
    expect(screen.queryByText('audit body')).not.toBeInTheDocument()
    // Falls back to the first visible (blueprint) tab instead of a blank panel.
    expect(screen.getByRole('tab', { name: 'Timeline', selected: true })).toBeInTheDocument()
    expect(screen.getByText('timeline body')).toBeInTheDocument()
  })

  it('controlled mode: notifies onTabChange with the fallback id when the controlled tab loses visibility', () => {
    const onTabChange = vi.fn()
    const { rerender } = render(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        tabs={gatedTabs}
        tabRenderers={tabRenderers}
        userContext={admin}
        activeTabId="audit"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Audit', selected: true })).toBeInTheDocument()
    expect(screen.getByText('audit body')).toBeInTheDocument()

    // Revoke the privilege backing the controlled `activeTabId` ("audit") by
    // rerendering with a user who no longer holds it, while the caller keeps
    // passing the now-invisible id (it hasn't heard back yet).
    onTabChange.mockClear()
    rerender(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        tabs={gatedTabs}
        tabRenderers={tabRenderers}
        userContext={basicUser}
        activeTabId="audit"
        onTabChange={onTabChange}
      />,
    )
    // Renders the fallback (first visible) tab instead of a blank panel...
    expect(screen.getByRole('tab', { name: 'Timeline', selected: true })).toBeInTheDocument()
    expect(screen.getByText('timeline body')).toBeInTheDocument()
    // ...and notifies the owner so its `activeTabId` state converges.
    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(onTabChange).toHaveBeenCalledWith('timeline')
  })

  it('controlled mode: does not fire a spurious onTabChange when the controlled tab stays visible', () => {
    const onTabChange = vi.fn()
    const { rerender } = render(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        tabs={gatedTabs}
        tabRenderers={tabRenderers}
        userContext={admin}
        activeTabId="timeline"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Timeline', selected: true })).toBeInTheDocument()

    // Rerender with an unrelated prop change (record identity churn) while the
    // controlled tab remains visible throughout — no divergence, no notification.
    rerender(
      <EntityProfile
        config={dealsConfig}
        record={{ ...dealRecord }}
        tabs={gatedTabs}
        tabRenderers={tabRenderers}
        userContext={admin}
        activeTabId="timeline"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Timeline', selected: true })).toBeInTheDocument()
    expect(onTabChange).not.toHaveBeenCalled()
  })
})

describe('EntityProfile — controlled mode with no visible tabs at all', () => {
  it('renders the empty-sections notice and never calls onTabChange', () => {
    const onTabChange = vi.fn()
    render(
      <EntityProfile
        config={companiesConfig}
        record={companyRecord}
        activeTabId="anything"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.getByText('No sections available.')).toBeInTheDocument()
    expect(onTabChange).not.toHaveBeenCalled()
  })
})

describe('EntityProfile — cross-module tab contributions', () => {
  beforeEach(() => profileTabRegistry.clear())

  it('merges contributed tabs after blueprint tabs, ordered by `order`', () => {
    profileTabRegistry.contributeTab('crm/deals', { id: 'trips', label: 'Trips', order: 20, content: <p>trips body</p> })
    profileTabRegistry.contributeTab('crm/deals', { id: 'service', label: 'Service', order: 10, content: <p>service body</p> })

    render(
      <EntityProfile config={dealsConfig} record={dealRecord} moduleCode="crm/deals" tabRenderers={tabRenderers} userContext={admin} />,
    )
    const tabNames = screen.getAllByRole('tab').map((el) => el.textContent)
    // Blueprint tabs first, then contributions in `order` (Service 10 before Trips 20).
    expect(tabNames).toEqual(['Timeline', 'Activity', 'Linked', 'Files', 'Service', 'Trips'])
  })
})

describe('EntityProfile — tab-component registry resolution', () => {
  it('resolves a tab body via the registry BEFORE `tabRenderers`, passing `componentProps` through', () => {
    registerTabComponent('TestWidget', ({ props }) => <p>registered: {String(props?.greeting)}</p>)
    const tabs: EntityProfileTab[] = [
      { id: 'w', label: 'Widget', component: 'TestWidget', componentProps: { greeting: 'hi' } },
    ]
    const fallbackRenderers: Record<string, ProfileTabRenderer> = { TestWidget: () => <p>fallback body</p> }
    render(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        tabs={tabs}
        tabRenderers={fallbackRenderers}
        activeTabId="w"
      />,
    )
    expect(screen.getByText('registered: hi')).toBeInTheDocument()
    expect(screen.queryByText('fallback body')).not.toBeInTheDocument()
  })

  it('falls back to `tabRenderers` when no component is registered under that name', () => {
    const tabs: EntityProfileTab[] = [{ id: 'w2', label: 'Widget2', component: 'NotRegisteredAnywhere' }]
    const fallbackRenderers: Record<string, ProfileTabRenderer> = {
      NotRegisteredAnywhere: () => <p>fallback body 2</p>,
    }
    render(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        tabs={tabs}
        tabRenderers={fallbackRenderers}
        activeTabId="w2"
      />,
    )
    expect(screen.getByText('fallback body 2')).toBeInTheDocument()
  })
})

describe('EntityProfile — bespoke escape hatch', () => {
  it('renders from explicit title + tabs with no config', () => {
    render(
      <EntityProfile
        title="Custom Vehicle"
        details={[{ id: 'plate', label: 'Plate', value: 'AUH-4021' }]}
        tabs={[{ id: 'o', label: 'Overview', content: <p>bespoke overview</p> }]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Custom Vehicle' })).toBeInTheDocument()
    expect(screen.getByText('Plate')).toBeInTheDocument()
    expect(screen.getByText('bespoke overview')).toBeInTheDocument()
  })
})

/**
 * P1-O (run-2026-09-05-job-orders, fix7): a record with no `art`/`image`
 * (no `icon3dArt` seeded — e.g. a preventive-maintenance rule) fell through
 * to the giant single-letter `avatarFallback` block, which a huge bold
 * glyph clipped by the tile's `overflow-hidden` read as "a half-cut app
 * logo mark." `uiConfig.profile.placeholderIcon: "wrench"` (or `"tool"`)
 * opts a module with genuinely no artwork into the deliberate grey-slot
 * placeholder look instead — pinning the new vocabulary entries.
 */
describe('EntityProfile — placeholderIcon vocabulary (P1-O)', () => {
  const configWithPlaceholder = (name: string) => ({
    ...dealsConfig,
    uiConfig: { ...dealsConfig.uiConfig, profile: dealsConfig.uiConfig.profile ? { ...dealsConfig.uiConfig.profile, placeholderIcon: name } : undefined },
  })

  it('renders the wrench glyph for "wrench"', () => {
    const { container } = render(<EntityProfile config={configWithPlaceholder('wrench')} record={dealRecord} userContext={admin} />)
    expect(container.querySelector('[data-icon="tool-01"]')).toBeInTheDocument()
  })

  it('renders the SAME wrench glyph for the "tool" alias', () => {
    const { container } = render(<EntityProfile config={configWithPlaceholder('tool')} record={dealRecord} userContext={admin} />)
    expect(container.querySelector('[data-icon="tool-01"]')).toBeInTheDocument()
  })
})
