import { DispatcherCockpitView, TriageConsoleView, FleetConsoleView } from '@fams/v5-templates'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code, Gallery } from '../docs'

/**
 * OperationsConsolesDemo — the three operations-console view kinds
 * (`dispatcher-cockpit` / `triage-console` / `fleet-console`, target-7 wave 3,
 * DRAFT). One family, one page: all three derive their whole surface from a
 * module's existing pipeline metadata (`uiConfig.statusList`, `systemcolumns`,
 * `listcolumns`) — a VIEW option on an existing module type, never a new one
 * (PLATFORM-MODEL doctrine). None of the golden CRM/fleet blueprint fixtures
 * carry a DateTime column, so this page builds one minimal pipeline fixture
 * to spec instead — a bare pipeline with no `uiConfig.cockpit`/`map` block,
 * which is exactly the module every derived console lens exists for.
 */

const triageConfig: EntityConfig = {
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

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

const triageRecords: EntityRecord[] = [
  { id: 'rec-1', uniqueidentifier: 'TRQ-1001', title: 'Leaking valve', status: 'new', systemcol1: 'Critical', systemcol2: minutesAgo(5), systemcol3: 'Zone A' },
  { id: 'rec-2', uniqueidentifier: 'TRQ-1002', title: 'Broken pump', status: 'new', systemcol1: 'High', systemcol2: minutesAgo(180), systemcol3: 'Zone B' },
  { id: 'rec-3', uniqueidentifier: 'TRQ-1003', title: 'Valve inspection', status: 'in_progress', systemcol1: 'Medium', systemcol2: minutesAgo(1440), systemcol3: 'Zone C' },
  { id: 'rec-4', uniqueidentifier: 'TRQ-1004', title: 'Filter replaced', status: 'resolved', systemcol1: 'Low', systemcol2: minutesAgo(2880), systemcol3: 'Zone A' },
  { id: 'rec-5', uniqueidentifier: 'TRQ-1005', title: 'Generator check', status: 'in_progress', systemcol1: 'High', systemcol2: minutesAgo(30), systemcol3: 'Zone D' },
]

export default function OperationsConsolesDemo() {
  return (
    <DocPage
      title="Operations Consoles"
      badge="wip"
      summary="Three operations-console lenses (DRAFT) — DispatcherCockpitView, TriageConsoleView and FleetConsoleView. Each derives its whole surface (stage KPI tiles, dense queue/roster rows, a record's side-sheet or work panel) from a module's own uiConfig.statusList + systemcolumns + listcolumns, so a bare pipeline blueprint gets a working console with zero new metadata. DispatcherCockpitView additionally delegates wholesale to CockpitView for a module that authors the full uiConfig.cockpit + map contract — see that page for the authored surface."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          <Code>DispatcherCockpitView</Code> on the fixture pipeline below (no <Code>uiConfig.cockpit</Code>{' '}
          block, so this is the DERIVED cockpit). Click a stage KPI tile to scope the queue to that
          stage — the tile reads <Code>aria-pressed</Code> and clicking it again clears the scope;
          click a queue row to open its record in the side sheet.
        </Prose>
        <div className="h-[36rem] overflow-hidden rounded-md border border-border">
          <DispatcherCockpitView config={triageConfig} records={triageRecords} />
        </div>
      </DocSection>

      <DocSection id="gallery" title="Gallery">
        <Prose>All three lenses over the same pipeline fixture.</Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'TriageConsoleView',
              caption: 'Dense backlog queue + selected-item work panel, under a compact KPI strip.',
              node: (
                <div className="h-[28rem] w-full overflow-hidden rounded-md border border-border">
                  <TriageConsoleView config={triageConfig} records={triageRecords} />
                </div>
              ),
            },
            {
              label: 'FleetConsoleView',
              caption: 'KPI row + a Fleet/Jobs-by-stage tab switch (roster table, or the kanban board).',
              node: (
                <div className="h-[28rem] w-full overflow-hidden rounded-md border border-border">
                  <FleetConsoleView config={triageConfig} records={triageRecords} />
                </div>
              ),
            },
            {
              label: 'TriageConsoleView (empty backlog)',
              caption: 'The three-cause empty state a lens with zero records renders.',
              node: (
                <div className="h-[28rem] w-full overflow-hidden rounded-md border border-border">
                  <TriageConsoleView config={triageConfig} records={[]} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props-dispatcher" title="Props — DispatcherCockpitView">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint — uiConfig.statusList drives the KPI tiles; hasCockpit(config) switches to CockpitView wholesale.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records — KPI counts, queue rows, and the map (when bound) all derive from them.' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: "Opens the record's own detail surface (the module's Detail flavor)." },
            { prop: 'onMove', type: '(recordId, fromStage, toStage) => void', description: 'Guarded stage move — the same contract the kanban lens uses.' },
            { prop: 'renderAssignment', type: '(record: EntityRecord) => ReactNode', description: 'Assignment panel body for the selected record; omit for the derived field summary.' },
            { prop: 'renderRowActions', type: '(row, index) => ReactNode', description: 'Row-level action menu, as every other lens receives it.' },
            { prop: 'recordNoun', type: '{ one: string; many: string }', description: "Noun for the count row (e.g. { one: 'job', many: 'jobs' })." },
            { prop: 'isFiltered', type: 'boolean', description: 'True when a filter is narrowing records (drives the count row).' },
            { prop: 'totalCount', type: 'number', description: "How many records exist unfiltered; defaults to records.length." },
            { prop: 'onClearFilters', type: '() => void', description: 'Clears an outer filter session (in addition to the tile scope this view owns).' },
            { prop: 'loading', type: 'boolean', description: 'KPI + queue skeleton state.' },
            { prop: 'className', type: 'string', description: 'Root class override.' },
          ]}
        />
      </DocSection>

      <DocSection id="props-triage" title="Props — TriageConsoleView">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint — the backlog, identity/priority/age columns all derive from it.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records; an empty backlog renders the three-cause empty state.' },
            { prop: 'triageStages', type: 'readonly string[]', description: "Stage keys forming the triage backlog. Omit → the blueprint's FIRST statusList stage." },
            { prop: 'transitionsFor', type: '(record: EntityRecord) => readonly string[]', description: "Allowed next stages for a record — the host's guarded transitions." },
            { prop: 'onMove', type: '(recordId, fromStage, toStage) => void', description: 'Advance a record to a stage (the kanban lens contract).' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: "Opens the record's own detail surface." },
            { prop: 'renderPanel', type: '(record: EntityRecord) => ReactNode', description: "Replaces the derived work-panel body (a host's real triage controls)." },
            { prop: 'onCreateRecord', type: '() => void', description: 'The empty state’s "Create New" action.' },
            { prop: 'className', type: 'string', description: 'Root class override.' },
          ]}
        />
      </DocSection>

      <DocSection id="props-fleet" title="Props — FleetConsoleView">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint — uiConfig.map.statusCol drives the unit-state KPI split when bound, else the shared stage-count tiles.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records behind the KPI row, the roster table, and the stage board.' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: "Opens the record's own detail surface." },
            { prop: 'onMove', type: '(recordId, fromStage, toStage) => void', description: 'Guarded stage move for the board (the kanban onMove contract).' },
            { prop: 'canMove', type: "KanbanView['canMove']", description: 'Per-record move guard, passed straight to the board.' },
            { prop: 'renderRowActions', type: '(row, index) => ReactNode', description: 'Row-level action menu for the roster table.' },
            { prop: 'renderDetail', type: '(record: EntityRecord) => ReactNode', description: 'Replaces the derived side-sheet body.' },
            { prop: 'unitIcon', type: 'string', default: "'truck'", description: "Glyph name for the roster's identity cell." },
            { prop: 'loading', type: 'boolean', description: 'KPI + roster skeleton state.' },
            { prop: 'className', type: 'string', description: 'Root class override.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Declare only uiConfig.statusList (+ systemcolumns/listcolumns) to get a working console — no new metadata block required.',
            'Bind uiConfig.cockpit + map coordinates when a module needs the authored operations-cockpit surface — DispatcherCockpitView delegates to CockpitView wholesale rather than re-deriving it.',
            'Bind uiConfig.map.statusCol on a fleet module so the console’s KPI split and the live map’s marker colours read the SAME unit-state axis.',
          ]}
          donts={[
            'Don’t invent a new module/engine type for a console — it is a view option on the 9 fixed types (PLATFORM-MODEL doctrine).',
            'Don’t hand-roll KPI tiles or dense rows per product — ConsoleKpiRow / console-queue-columns are the ONE shared implementation every console reads.',
            'Don’t bypass renderAssignment/renderPanel/renderDetail to fork a bespoke side-sheet body — replace the slot instead of the component.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'Each stage KPI tile is a real button with aria-pressed reflecting the active scope, operable by mouse and keyboard alike.',
            'The record side sheet (DispatcherCockpitView / FleetConsoleView) is a focus-trapped, Esc-to-close dialog with a labelled close control.',
            'TriageConsoleView’s queue items expose aria-current on the selected record instead of a second, redundant selected-state affordance.',
            'The count row (RecordCountRow) announces politely (aria-live) and only while a scope is actually narrowing the set.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
