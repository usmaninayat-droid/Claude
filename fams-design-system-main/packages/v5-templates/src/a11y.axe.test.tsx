/**
 * Package-local axe sweep for the task 2.3 templates, mirroring
 * v5-composer's `fields/a11y.axe.test.tsx` (see its header for why
 * `color-contrast`/`region` are disabled in jsdom and why the matcher is wired
 * from `vitest-axe/dist/matchers.js`). Every overlay is rendered OPEN and axed
 * against `document.body` so portaled content is covered.
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { EntityProfile } from './entity-profile/EntityProfile'
import { InteractiveReplay } from './entity-profile/InteractiveReplay'
import { OverviewWidgets } from './entity-profile/OverviewWidgets'
import { ProfileStack } from './entity-profile/ProfileStack'
import { RecordSectionsGrid } from './entity-profile/RecordSectionsGrid'
import { RecordTable } from './entity-profile/RecordTable'
import { ScopedLinkedRecords } from './entity-profile/ScopedLinkedRecords'
import { LinkedRecordDetailSection } from './entity-profile/LinkedRecordDetailSection'
import { ModuleRecordsProvider } from './entity-profile/module-records'
import { CreationSheet } from './creation-sheet/CreationSheet'
import { dealsConfig, dealRecord, companiesConfig, companyRecord } from './entity-profile/fixtures'
import { ListView } from './views/ListView'
import { KanbanView } from './views/KanbanView'
import { CalendarView } from './views/calendar/CalendarView'
import { MapHybridView } from './views/hybrid/MapHybridView'
import { recordMapConfigFixture, recordMapRecords } from './views/hybrid/fixtures'
import { calendarConfig, calendarRecords, CALENDAR_TODAY } from './views/calendar/fixtures'
import { HybridView } from './views/HybridView'
import { TaskDetail } from './views/TaskDetail'
import { ModuleView } from './views/ModuleView'
import { ViewTypePicker, viewTypeOptionsFromKinds } from './views/ViewTypePicker'
import { MapView } from './views/MapView'
import { LiveHybridView } from './views/LiveHybridView'
import { CockpitView } from './views/cockpit/CockpitView'
import { DispatcherCockpitView } from './views/consoles/DispatcherCockpitView'
import { TriageConsoleView } from './views/consoles/TriageConsoleView'
import { FleetConsoleView } from './views/consoles/FleetConsoleView'
import { WorkforcePulseView } from './views/consoles/WorkforcePulseView'
import { AppBootSkeleton } from './views/AppBootSkeleton'
import { StagedSaveBar } from './settings/StagedSaveBar'
import { StepUpVerifyDialog } from './settings/StepUpVerifyDialog'
import { cockpitConfig, cockpitRecords } from './views/cockpit/cockpit-fixtures'
import { liveMonitoringConfig, liveVehicleRecords } from './views/live-fixtures'
import { deriveFilters, LinkedRecordProvider } from '@fams/v5-composer'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { deriveLivePois, deriveLiveZones } from './views/live-data'
import { buildLiveFilterGroups, deriveTagGroups } from './views/live/live-filter-model'
import { defaultLiveListColumns, liveListColumnCatalog } from './views/live/live-list-model'
import { LiveFiltersPopover } from './views/live/LiveFiltersPopover'
import { LiveFilterChips } from './views/live/LiveFilterChips'
import { LiveListPanel } from './views/live/LiveListPanel'
import { LiveListOnlyView } from './views/live/LiveListOnlyView'
import { LivePanelDivider, LivePanelReopenButton } from './views/live/LivePanelDivider'
import { LiveListSkeleton, LiveListNoResults } from './views/live/live-list-states'
import { PoiDrawer, ZonesDrawer } from './views/live/ZonesDrawer'
import { CustomizeViewDrawer, defaultCustomizeViewState } from './views/live/CustomizeViewDrawer'
import { UnsavedChangesToast } from './views/live/UnsavedChangesToast'
import { LoginPage } from './login/LoginPage'
import { InboxNotificationCard } from './inbox/InboxNotificationCard'
import { HomeLaunchPad } from './home/HomeLaunchPad'
import { InboxView } from './inbox/InboxView'
import { INBOX_FIXTURE_NOW, inboxNotificationFixtures } from './inbox/fixtures'
import { DashboardView } from './views/DashboardView'
import { dashboardConfigFixture, dashboardWidgetFixtures } from './views/dashboard-fixtures'
import {
  companiesConfig as companiesViewConfig,
  companyRecords,
  dealsConfig as dealsViewConfig,
  dealRecords,
} from './views/fixtures'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
}

expect.extend({ toHaveNoViolations })

// The dashboard's map widget lazily imports the heavy `./map` entry (real
// WebGL). Stubbed so the sweep still covers the widget's own chrome.
vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
  LiveMapView: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
}))

const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

/**
 * A bare pipeline blueprint for the three operations-console lenses
 * (`DispatcherCockpitView`/`TriageConsoleView`/`FleetConsoleView`/
 * `WorkforcePulseView`) — none of
 * the golden CRM/fleet blueprint fixtures above carry a DateTime column, so
 * this is a minimal one built to spec (statusList with 3 stages, a SmallText
 * identity, a non-status SingleSelect classification, a DateTime age column).
 */
const operationsConsoleConfig: EntityConfig = {
  code: 'ops/triage',
  name: 'Triage Queue',
  uidPrefix: 'TRQ',
  systemcolumns: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['New', 'In Progress', 'Resolved'] },
    { col: 'systemcol1', name: 'Priority', type: 'SingleSelect', listValues: ['Critical', 'High', 'Medium', 'Low'] },
    { col: 'systemcol2', name: 'Reported', type: 'DateTime' },
    { col: 'systemcol3', name: 'Location', type: 'SmallText' },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'systemcol1' },
    { col: 'systemcol2' },
    { col: 'systemcol3' },
  ],
  uiConfig: {
    statusList: [
      { key: 'new', label: 'New', color: 'var(--color-info)' },
      { key: 'in_progress', label: 'In Progress', color: 'var(--color-warning)' },
      { key: 'resolved', label: 'Resolved', color: 'var(--color-success)' },
    ],
  },
}

const operationsConsoleRecords: EntityRecord[] = [
  { id: 'rec-1', uniqueidentifier: 'TRQ-1001', title: 'Leaking valve', status: 'new', systemcol1: 'Critical', systemcol2: new Date(Date.now() - 5 * 60_000).toISOString(), systemcol3: 'Zone A' },
  { id: 'rec-2', uniqueidentifier: 'TRQ-1002', title: 'Broken pump', status: 'new', systemcol1: 'High', systemcol2: new Date(Date.now() - 180 * 60_000).toISOString(), systemcol3: 'Zone B' },
  { id: 'rec-3', uniqueidentifier: 'TRQ-1003', title: 'Valve inspection', status: 'in_progress', systemcol1: 'Medium', systemcol2: new Date(Date.now() - 1440 * 60_000).toISOString(), systemcol3: 'Zone C' },
  { id: 'rec-4', uniqueidentifier: 'TRQ-1004', title: 'Filter replaced', status: 'resolved', systemcol1: 'Low', systemcol2: new Date(Date.now() - 2880 * 60_000).toISOString(), systemcol3: 'Zone A' },
]

describe('v5-templates — axe', () => {
  it('EntityProfile (blueprint-driven) has no violations', async () => {
    const { container } = render(
      <EntityProfile
        config={dealsConfig}
        record={dealRecord}
        userContext={{ id: 'u1', roles: ['admin'], privileges: [] }}
        tabRenderers={{
          PipelineTimeline: () => <p>timeline</p>,
          ActivityFeed: () => <p>activity</p>,
          LinkedItems: () => <p>linked</p>,
          Attachments: () => <p>files</p>,
        }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ProfileStack (open) has no violations', async () => {
    const { baseElement } = render(
      <ProfileStack
        open
        onOpenChange={() => {}}
        items={[
          { id: 'a', title: 'Truck AUH-4021' },
          { id: 'b', title: 'Sara Ahmed' },
        ]}
        activeId="a"
        onActivate={() => {}}
        onClose={() => {}}
        onCloseAll={() => {}}
        onMinimize={() => {}}
        renderProfile={(item) => <p>body {item.id}</p>}
      />,
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('CreationSheet single-step (open) has no violations', async () => {
    const { baseElement } = render(
      <CreationSheet open onOpenChange={() => {}} config={companiesConfig} onSubmit={() => {}} />,
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('CreationSheet stepped (open) has no violations', async () => {
    const { baseElement } = render(
      <CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />,
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('CreationSheet with showSummaryStep, ON the summary panel itself, has no violations', async () => {
    const { baseElement, getByRole, findByText } = render(
      <CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} showSummaryStep />,
    )
    // Walk to the appended recap step (Basic Info -> Details -> Summary) so the
    // fixture actually scans the Edit-affordance/read-renderer markup, not just
    // step 0's plain form. The required "Deal" title must be filled first or
    // step-1 validation blocks the first "Next".
    fireEvent.change(document.getElementById('sf-title') as HTMLInputElement, { target: { value: 'Axe Deal' } })
    fireEvent.click(getByRole('button', { name: 'Next' }))
    await findByText('Owner') // step 2 ("Details") landed
    fireEvent.click(getByRole('button', { name: 'Next' }))
    await findByText('Axe Deal') // recap landed, showing the entered value
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('ListView (blueprint-driven) has no violations', async () => {
    const { container } = render(
      <ListView config={companiesViewConfig} records={companyRecords} editableCols={['systemcol1']} onRecordChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('KanbanView (blueprint-driven) has no violations', async () => {
    const { container } = render(
      <KanbanView config={dealsViewConfig} records={dealRecords} onMove={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('KanbanView with pinning + data-only cards has no violations', async () => {
    // The wave-A4 states: a pinned lane (so the pin toggle and its
    // `aria-pressed` are rendered, plus one refused by the pin cap) and the
    // data-only card mode.
    const { container } = render(
      <KanbanView
        config={dealsViewConfig}
        records={dealRecords}
        onMove={() => {}}
        displayMode="data"
        pinnedStages={['won', 'lost']}
        onPinnedStagesChange={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CalendarView monthly (blueprint-driven) has no violations', async () => {
    const { container } = render(
      <CalendarView
        config={calendarConfig}
        records={calendarRecords}
        today={CALENDAR_TODAY}
        onOpenRecord={() => {}}
        onCreateAtDate={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CalendarView weekly (blueprint-driven) has no violations', async () => {
    const { container } = render(
      <CalendarView
        config={calendarConfig}
        records={calendarRecords}
        today={CALENDAR_TODAY}
        mode="weekly"
        onOpenRecord={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('HybridView (list + detail) has no violations', async () => {
    const { container } = render(
      <HybridView config={companiesViewConfig} records={companyRecords} selectedId="C-01" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('TaskDetail (pipeline) has no violations', async () => {
    const hooli = dealRecords.find((r) => r.id === 'D-104')!
    const { container } = render(
      <TaskDetail
        config={dealsViewConfig}
        record={hooli}
        allowedTransitions={['won', 'lost']}
        onTransition={() => {}}
        tabRenderers={{ PipelineTimeline: () => <p>timeline</p> }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('OverviewWidgets (planBanner + locationMap) has no violations', async () => {
    // `trendChart` (an ECharts canvas render) is exercised by
    // `OverviewWidgets.test.tsx` instead — `AreaChart`'s own accessibility is
    // already covered by `@fams/ui-kit`'s dedicated axe sweep, so it's not
    // re-verified here; this fixture focuses on THIS template's composition.
    const { container } = render(
      <OverviewWidgets
        widgets={[
          { type: 'planBanner', title: 'Upcoming Plan', metaFields: ['systemcol7'] },
          { type: 'locationMap', title: 'Collection Point Location', polygonsField: 'bounds' },
        ]}
        record={{
          ...dealRecord,
          bounds: [{ id: 'z1', points: [[55.27, 25.2], [55.28, 25.21]], color: '#f79009' }],
        }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('OverviewWidgets (statusCard + kpiTiles + eventList, two-column) has no violations', async () => {
    // The additive widget variants, in the two-column arrangement the Overview
    // frame uses. `barChart` is left out for the same reason `trendChart` is
    // above (an ECharts canvas, covered by `@fams/ui-kit`'s own axe sweep);
    // what matters here is that the interactive event rows and the map overlay
    // controls carry real accessible names.
    const { container } = render(
      <OverviewWidgets
        widgets={[
          { type: 'alertBanner', title: 'There is an upcoming trip.', metaFields: ['systemcol7'] },
          {
            type: 'statusCard',
            column: 'start',
            icon: 'telematics',
            label: 'Telematics',
            valueField: 'telematics',
            toneField: 'telematicsState',
            toneMap: { reporting: 'success' },
            metaField: 'telematicsSeen',
            metaLabel: 'Last Received',
          },
          {
            type: 'kpiTiles',
            column: 'start',
            columns: 2,
            tiles: [{ label: 'Odometer', valueField: 'odometer', unit: 'km' }],
          },
          {
            type: 'eventList',
            column: 'end',
            title: 'Critical Events',
            itemsField: 'events',
            iconMap: { overspeeding: 'gauge' },
            toneMap: { overspeeding: 'danger' },
          },
        ]}
        record={{
          ...dealRecord,
          telematics: 'Reporting',
          telematicsState: 'reporting',
          telematicsSeen: '5 min ago',
          odometer: '1,245',
          events: [
            {
              id: 'e1',
              type: 'overspeeding',
              label: 'Overspeeding',
              time: '09:00 AM',
              address: '1 Al Corniche, Doha',
            },
          ],
        }}
        onEventSelect={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('OverviewWidgets (dailyTimeline, active/inactive/off rows) has no violations', async () => {
    // The timeline is a real `<table>`: a header row, a rowheader per day, and
    // a text alternative for each track — the bars themselves are `aria-hidden`
    // decoration, so what this asserts is that the day's facts survive without
    // them.
    const { container } = render(
      <OverviewWidgets
        widgets={[
          {
            type: 'dailyTimeline',
            title: 'Daily Activity Timeline',
            subtitle: 'Tablet usage against the planned shift window',
            rowsField: 'days',
            windowStart: '05:00',
            windowEnd: '19:00',
          },
        ]}
        record={{
          id: 'wf-01',
          days: [
            {
              date: '2026-09-03',
              weekday: 'Thursday',
              isOff: false,
              plannedMinutes: 840,
              activeMinutes: 456,
              inactiveMinutes: 24,
              usagePct: 95,
            },
            { date: '2026-09-04', weekday: 'Friday', isOff: true },
          ],
        }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('RecordSectionsGrid (read grid + edit form) has no violations', async () => {
    const groups = [
      {
        title: 'Tanker Details',
        column: 'start' as const,
        fields: [
          { field: 'title', label: 'Title' },
          {
            field: 'status',
            label: 'Tanker Status',
            render: 'statusChip' as const,
            toneMap: { open: 'success' as const },
          },
          {
            field: 'colour',
            label: 'Tanker Color',
            render: 'colorSwatch' as const,
            colorMap: { Blue: '#2e90fa' },
          },
        ],
      },
      {
        title: 'Dimension',
        column: 'end' as const,
        fields: [{ field: 'length', label: 'Length' }],
      },
    ]
    const record = { ...dealRecord, colour: 'Blue', length: '321 cm' }

    const read = render(<RecordSectionsGrid groups={groups} record={record} />)
    expect(await axe(read.container)).toHaveNoViolations()
    read.unmount()

    // Edit mode is a different tree (labelled edit widgets), so it gets its own
    // pass — overlays/alternate states rendered OPEN, per the DoD.
    const edit = render(<RecordSectionsGrid groups={groups} record={record} editable onSave={() => {}} />)
    fireEvent.click(edit.getByRole('button', { name: /Edit/ }))
    expect(await axe(edit.container)).toHaveNoViolations()
  })

  it('InteractiveReplay (stats + map + chart + legend) has no violations', async () => {
    const { container } = render(
      <InteractiveReplay
        record={{
          id: 'r1',
          title: 'x',
          stats: [{ icon: 'route', label: 'Number of Events', value: 4 }],
          timeline: [
            { time: '08:00', temperature: 20, speed: 40, lat: 25.1, lng: 51.1, address: 'Doha' },
            { time: '08:05', temperature: 22, speed: 60, lat: 25.2, lng: 51.2, address: 'Al Wakrah' },
          ],
          bands: [{ type: 'overspeeding', label: 'Overspeeding', startIndex: 0, endIndex: 1, tone: 'danger' }],
          route: [[51.1, 25.1], [51.2, 25.2]],
          pins: [{ id: 'e1', position: [51.15, 25.15] }],
        }}
        statsField="stats"
        timelineField="timeline"
        series={[
          { key: 'temperature', label: 'Temperature', colorIndex: 1 },
          { key: 'speed', label: 'Speed', colorIndex: 2 },
        ]}
        bandsField="bands"
        routeField="route"
        pinsField="pins"
        chartRenderer="svg"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('InteractiveReplay empty state has no violations', async () => {
    const { container } = render(
      <InteractiveReplay
        record={{ id: 'r1', title: 'x', timeline: [] }}
        timelineField="timeline"
        series={[{ key: 'temperature', label: 'Temperature' }]}
        chartRenderer="svg"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('RecordTable (avatar + statusPill + search) has no violations', async () => {
    const { container } = render(
      <RecordTable
        field="attendanceLog"
        record={{
          id: 'r1',
          title: 'x',
          attendanceLog: [{ id: 'a1', guard: 'Ali Sheikh', status: 'SCHEDULED' }],
        }}
        columns={[
          { key: 'guard', label: 'Guard Name', type: 'avatar' },
          { key: 'status', label: 'Status', type: 'statusPill' },
        ]}
        search
        statusColors={{ SCHEDULED: '#F17B2B' }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ScopedLinkedRecords (scoped rows + activation) has no violations', async () => {
    const { container } = render(
      <ModuleRecordsProvider
        resolveModuleRecords={(code) => (code === 'crm/deal' ? { config: dealsConfig, records: [dealRecord] } : undefined)}
      >
        <LinkedRecordProvider onOpenLinkedRecord={() => {}}>
          <ScopedLinkedRecords
            record={companyRecord}
            entityType="crm/deal"
            matchField="systemcol3"
            columns={[
              { key: 'uniqueidentifier', label: 'Deal', type: 'idChip' },
              { key: 'title', label: 'Title', type: 'text' },
              { key: 'status', label: 'Status', type: 'statusPill' },
            ]}
            search
          />
        </LinkedRecordProvider>
      </ModuleRecordsProvider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ScopedLinkedRecords empty state has no violations', async () => {
    const { container } = render(
      <ModuleRecordsProvider resolveModuleRecords={() => undefined}>
        <ScopedLinkedRecords
          record={companyRecord}
          entityType="crm/deal"
          matchField="systemcol3"
          columns={[{ key: 'title', label: 'Title', type: 'text' }]}
        />
      </ModuleRecordsProvider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LinkedRecordDetailSection (populated) has no violations', async () => {
    const vehicleConfig = {
      ...dealsConfig,
      code: 'asset/vehicle',
      uiConfig: {
        ...dealsConfig.uiConfig,
        profile: dealsConfig.uiConfig.profile
          ? {
              ...dealsConfig.uiConfig.profile,
              sections: [
                { id: 'sec_vehicle_details', name: 'Vehicle Details', order: 1, fields: [{ col: 'systemcol1', order: 1, name: 'Brand' }] },
              ],
            }
          : undefined,
      },
    }
    const { container } = render(
      <ModuleRecordsProvider
        resolveModuleRecords={(code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [{ ...dealRecord, id: 'v1' }] } : undefined
        }
      >
        <LinkedRecordProvider onOpenLinkedRecord={() => {}}>
          <LinkedRecordDetailSection
            config={dealsConfig}
            record={{ ...dealRecord, systemcol4: 'v1' }}
            props={{ refCol: 'systemcol4', entityType: 'asset/vehicle' }}
          />
        </LinkedRecordProvider>
      </ModuleRecordsProvider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LinkedRecordDetailSection empty state has no violations', async () => {
    const { container } = render(
      <ModuleRecordsProvider resolveModuleRecords={() => undefined}>
        <LinkedRecordDetailSection
          config={dealsConfig}
          record={dealRecord}
          props={{ refCol: 'systemcol4', entityType: 'asset/vehicle' }}
        />
      </ModuleRecordsProvider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ModuleView (tabs + toolbar) has no violations', async () => {
    const { container } = render(
      <ModuleView
        config={dealsViewConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={{ userId: 'u1', moduleId: 'deals' }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ModuleView with the shared row/bulk chrome, selection active, has no violations', async () => {
    // Wave A5: the row `…` menu, the selection column and the sticky bulk bar
    // are shared module-view chrome, so they are swept on the SHARED
    // composition — with a live selection, since the bar (a `role="status"`
    // live region) and its actions only exist once something is selected.
    const config = {
      ...dealsViewConfig,
      uiConfig: {
        ...dealsViewConfig.uiConfig,
        listSelectable: true,
        rowActions: { delete: true, archive: true },
      },
    }
    const { container, getAllByRole } = render(
      <ModuleView
        config={config}
        records={dealRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'deals' }}
        onDeleteRecords={() => {}}
      />,
    )
    getAllByRole('checkbox', { name: 'Select row' })[0].click()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('DashboardView (toolbar + KPI region + widget grid) has no violations', async () => {
    const { container } = render(
      <DashboardView
        renderer="svg"
        config={{
          ...dashboardConfigFixture,
          widgetGrid: Object.values(dashboardWidgetFixtures),
        }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LoginPage (default state) has no violations', async () => {
    const { container } = render(
      <LoginPage
        logo={<span>FAMS</span>}
        supportingText="Log in to FAMS for real-time visibility and operational control."
        brand={{ quote: 'Your Fleet, Our Technology, Total Control', subtext: 'Seamless fleet management.' }}
        forgotPasswordHref="/forgot"
        onSubmit={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LoginPage (mobile composition: brand header + sheet) has no violations', async () => {
    const { container } = render(
      <LoginPage
        logo={<span>FAMS</span>}
        heading="Welcome"
        mobileHeading="Login via Credentials"
        supportingText="Log in to FAMS for real-time visibility and operational control."
        brand={{
          background: 'linear-gradient(to bottom, #6E112D, #4B091D)',
          mobileLogo: <img src="/branding/white.svg" alt="Ministry of Municipality logo" />,
        }}
        footer={{ kind: 'powered-by', logoSrc: '/branding/fams.svg' }}
        forgotPasswordHref="/forgot"
        onSubmit={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LoginPage (server-error state) has no violations', async () => {
    const { container } = render(
      <LoginPage
        logo={<span>FAMS</span>}
        forgotPasswordHref="/forgot"
        onSubmit={() => {}}
        error="Invalid Email or Password!"
        errorNonce={1}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('InboxNotificationCard (unread, chips, clear) has no violations', async () => {
    const { container } = render(
      <ul>
        <li>
          <InboxNotificationCard
            notification={inboxNotificationFixtures[0]}
            onOpen={() => {}}
            onClear={() => {}}
          />
        </li>
        <li>
          <InboxNotificationCard notification={inboxNotificationFixtures[3]} onOpen={() => {}} />
        </li>
      </ul>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('InboxView (tabs + toolbar + grouped feed) has no violations', async () => {
    const { container } = render(
      <InboxView
        notifications={inboxNotificationFixtures}
        now={INBOX_FIXTURE_NOW}
        onOpen={() => {}}
        onClear={() => {}}
        onClearAll={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('MapView (lazy live-map slot) has no violations', async () => {
    const { container, findByRole } = render(
      <MapView config={liveMonitoringConfig} records={liveVehicleRecords} />,
    )
    await findByRole('region', { name: 'Live Monitoring live map' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveHybridView (compact list + lazy map) has no violations', async () => {
    const { container, findByRole } = render(
      <LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />,
    )
    await findByRole('region', { name: 'Live Monitoring live map' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('MapHybridView (record cards + lazy record map + legend filter) has no violations', async () => {
    const { container, findByRole } = render(
      <MapHybridView config={recordMapConfigFixture()} records={recordMapRecords()} />,
    )
    await findByRole('region', { name: 'Deals map' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CockpitView (alert + KPI strip + split queue/map + panels) has no violations', async () => {
    const { container, findByRole } = render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await findByRole('region', { name: 'Dispatch Queue live map' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('DispatcherCockpitView (derived cockpit: KPI tiles + queue + open DetailSheet) has no violations', async () => {
    render(<DispatcherCockpitView config={operationsConsoleConfig} records={operationsConsoleRecords} />)
    fireEvent.click(screen.getByText('Leaking valve'))
    await screen.findByRole('dialog')
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('TriageConsoleView (queue + selected-item panel) has no violations', async () => {
    const { container } = render(
      <TriageConsoleView config={operationsConsoleConfig} records={operationsConsoleRecords} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('FleetConsoleView (roster + open DetailSheet) has no violations', async () => {
    render(<FleetConsoleView config={operationsConsoleConfig} records={operationsConsoleRecords} />)
    fireEvent.click(screen.getByText('Leaking valve'))
    await screen.findByRole('dialog')
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('WorkforcePulseView (KPI band + panels + roster + open drill sheet) has no violations', async () => {
    // The pulse's KPI tiles are clickable `KpiMetricCard`s and its roster
    // presence cells are buttons inside table cells — both are the parts
    // most likely to break a name/role rule, so the sweep runs with the
    // drill sheet OPEN over the whole surface.
    render(
      <WorkforcePulseView
        config={operationsConsoleConfig}
        records={operationsConsoleRecords}
        attentionStates={['Critical']}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Needs attention/ }))
    await screen.findByRole('dialog')
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('StagedSaveBar has no violations', async () => {
    const { container } = render(
      <StagedSaveBar pendingCount={2} onDiscard={() => {}} onSave={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('StepUpVerifyDialog (open) has no violations', async () => {
    const { findByRole } = render(
      <StepUpVerifyDialog
        open
        onClose={() => {}}
        onVerified={() => {}}
        onResend={() => {}}
        email="ops@tadweer.ae"
      />,
    )
    await findByRole('dialog')
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('AppBootSkeleton (generic frame) has no violations', async () => {
    const { container } = render(<AppBootSkeleton />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('AppBootSkeleton (cockpit-aware frame) has no violations', async () => {
    const { container, findByRole } = render(<AppBootSkeleton config={cockpitConfig} />)
    await findByRole('status', { name: 'Loading' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('AppBootSkeleton (branded loader frame) has no violations', async () => {
    // `iframes: false` — jsdom's iframe has no real contentWindow to
    // recurse into (no server serves `src` in this environment), and
    // axe-core throws trying to postMessage into it. This is a test-runner
    // limitation, not an a11y check on the iframe's OWN document, which is
    // a separate self-contained page outside this package's scope.
    const { container, findByRole } = render(
      <AppBootSkeleton brandLoaderSrc="/branding/qatar-mme-logo-animation.html" />,
    )
    await findByRole('status', { name: 'Loading' })
    expect(await axe(container, { iframes: false })).toHaveNoViolations()
  })

  it('LiveFiltersPopover (open, tags + groups + saved filters) has no violations', async () => {
    const facets = deriveFilters(liveMonitoringConfig)
    const { baseElement, getByRole } = render(
      <LiveFiltersPopover
        open
        groups={buildLiveFilterGroups(facets, liveVehicleRecords)}
        value={{ filters: { status: ['Moving'] }, tags: ['Street'] }}
        onChange={() => {}}
        tagGroups={deriveTagGroups(liveMonitoringConfig, liveVehicleRecords)}
        saved={[{ id: 'sf-1', name: 'Priority Vehicles', value: { filters: { status: ['Moving'] }, tags: [] } }]}
        onSaveFilter={() => {}}
        onRenameFilter={() => {}}
        onDeleteFilter={() => {}}
      />,
    )
    getByRole('heading', { name: 'All Filters' })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('LiveFilterChips (chips + value editor + collapse) has no violations', async () => {
    const facets = deriveFilters(liveMonitoringConfig)
    const { container } = render(
      <LiveFilterChips
        groups={buildLiveFilterGroups(facets, liveVehicleRecords)}
        value={{ filters: { systemcol11: ['Petrol', 'Hybrid'] }, tags: ['Street'] }}
        onChange={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ZonesDrawer + PoiDrawer (open) have no violations', async () => {
    const { container } = render(
      <div className="relative">
        <ZonesDrawer
          open
          onClose={() => {}}
          zones={deriveLiveZones(liveMonitoringConfig)}
          checkedIds={['Z-1234']}
          onCheckedIdsChange={() => {}}
        />
        <PoiDrawer
          open
          onClose={() => {}}
          pois={deriveLivePois(liveMonitoringConfig)}
          checkedIds={[]}
          onCheckedIdsChange={() => {}}
        />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CustomizeViewDrawer (hybrid variant, open) has no violations', async () => {
    const { container } = render(
      <CustomizeViewDrawer
        open
        onClose={() => {}}
        variant="hybrid"
        state={defaultCustomizeViewState('Hybrid View')}
        onStateChange={() => {}}
        columns={defaultLiveListColumns(liveMonitoringConfig, 'collapsed')}
        onColumnsChange={() => {}}
        catalog={liveListColumnCatalog(liveMonitoringConfig)}
        filterCount={2}
        onEditFilters={() => {}}
        onCopyLink={() => {}}
        onShare={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveListPanel (search + columns + table) has no violations', async () => {
    const { container } = render(
      <LiveListPanel
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        totalCount={liveVehicleRecords.length}
        search=""
        onSearchChange={() => {}}
        columns={defaultLiveListColumns(liveMonitoringConfig, 'collapsed')}
        onColumnsChange={() => {}}
        catalog={liveListColumnCatalog(liveMonitoringConfig)}
        widthState="collapsed"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveListOnlyView (list-only table + open Columns popover) has no violations', async () => {
    const { container, getByRole } = render(
      <LiveListOnlyView config={liveMonitoringConfig} records={liveVehicleRecords} />,
    )
    getByRole('button', { name: 'Customize columns' }).click()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveListOnlyView with the SORT BY menu open has no violations', async () => {
    const { baseElement, getByRole } = render(
      <LiveListOnlyView config={liveMonitoringConfig} records={liveVehicleRecords} />,
    )
    fireEvent.click(getByRole('button', { name: 'Sort' }))
    getByRole('listbox', { name: 'Sort by' })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('LiveListOnlyView loading skeleton has no violations', async () => {
    const { container } = render(
      <LiveListOnlyView config={liveMonitoringConfig} records={liveVehicleRecords} loading />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveListPanel with the Columns popover open (pencil in the header row) has no violations', async () => {
    const { container, getByRole } = render(
      <LiveListPanel
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        totalCount={liveVehicleRecords.length}
        search=""
        onSearchChange={() => {}}
        columns={defaultLiveListColumns(liveMonitoringConfig, 'collapsed')}
        onColumnsChange={() => {}}
        catalog={liveListColumnCatalog(liveMonitoringConfig)}
        widthState="collapsed"
      />,
    )
    fireEvent.click(getByRole('button', { name: 'Customize columns' }))
    getByRole('dialog', { name: 'Columns' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LivePanelDivider grabber pill + the reopen affordance have no violations', async () => {
    const { container } = render(
      <>
        <LivePanelDivider state="collapsed" onStateChange={() => {}} onHide={() => {}} />
        <div className="relative">
          <LivePanelReopenButton onShow={() => {}} onShowFullyExpanded={() => {}} />
        </div>
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('live list skeleton + no-results states have no violations', async () => {
    const { container } = render(
      <>
        <LiveListSkeleton rows={3} columns={3} />
        <LiveListNoResults />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('UnsavedChangesToast has no violations', async () => {
    const { container } = render(
      <UnsavedChangesToast onRevert={() => {}} onSave={() => {}} onEnableAutosave={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ViewTypePicker (radiogroup cards + actions + hint) has no violations', async () => {
    const { container } = render(
      <ViewTypePicker
        options={viewTypeOptionsFromKinds(['hybrid', 'map', 'list'])}
        hint="Instances help while comparing data — apply different filters per tab."
        onCreate={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('HomeLaunchPad axe', () => {
  it('HomeLaunchPad (favorites + groups + search header) has no violations', async () => {
    const { container } = render(
      <HomeLaunchPad
        groups={[
          { id: 'ccms', label: 'CCMS', modules: [{ id: 'dash', label: 'Dashboard' }, { id: 'tickets', label: 'Ticketing' }] },
        ]}
        pinnedIds={['dash']}
        onTogglePin={() => {}}
        onOpen={() => {}}
        title="FAMS"
        onInbox={() => {}}
        inboxDot
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
