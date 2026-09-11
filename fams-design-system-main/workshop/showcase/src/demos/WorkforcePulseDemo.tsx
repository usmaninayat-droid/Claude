import { WorkforcePulseView } from '@fams/v5-templates'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code, Gallery } from '../docs'

/**
 * WorkforcePulseDemo — the `workforce-pulse` view kind (target-7 wave 3,
 * DRAFT). The fourth operations console and the only PEOPLE one: where the
 * other three answer "what is the work and where is it", this answers "who is
 * on, where are they, and what just happened".
 *
 * Ported by intent from the IFM workforce app's own Workforce Pulse surface.
 * Fixture below is a people-bearing pipeline — a `workforce/*` linked column,
 * a presence axis on `uiConfig.map.statusCol`, two more classification axes
 * for the breakdown band, and a repeating site column for the coverage chart
 * — because those four bindings are exactly what the lens derives from.
 */

const shiftConfig: EntityConfig = {
  code: 'ops/shifts',
  name: 'Shift Assignments',
  uidPrefix: 'SHF',
  systemcolumns: [
    { col: 'title', name: 'Assignment', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['Open', 'Done'] },
    { col: 'worker', name: 'Worker', type: 'SmallText', entityType: 'workforce/staff' },
    { col: 'site', name: 'Site', type: 'SmallText' },
    { col: 'presence', name: 'Presence', type: 'SingleSelect', listValues: ['In zone', 'Late', 'Off shift'] },
    { col: 'shift', name: 'Shift', type: 'SingleSelect', listValues: ['Morning', 'Night'] },
    { col: 'reported', name: 'Reported', type: 'DateTime' },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'worker' },
    { col: 'site' },
    { col: 'presence' },
    { col: 'shift' },
    { col: 'reported' },
  ],
  uiConfig: {
    statusList: [
      { key: 'open', label: 'Open', color: 'var(--color-info)' },
      { key: 'done', label: 'Done', color: 'var(--color-success)' },
    ],
    map: { statusCol: 'presence' },
  },
}

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

const shiftRecords: EntityRecord[] = [
  { id: 'r1', uniqueidentifier: 'SHF-1001', title: 'Tower A morning sweep', status: 'open', worker: 'Amina Yusuf', site: 'Tower A', presence: 'In zone', shift: 'Morning', reported: minutesAgo(8) },
  { id: 'r2', uniqueidentifier: 'SHF-1002', title: 'Tower A night cover', status: 'open', worker: 'Amina Yusuf', site: 'Tower A', presence: 'In zone', shift: 'Night', reported: minutesAgo(45) },
  { id: 'r3', uniqueidentifier: 'SHF-1003', title: 'Depot opening check', status: 'open', worker: 'Karim Nasr', site: 'Depot', presence: 'Late', shift: 'Morning', reported: minutesAgo(95) },
  { id: 'r4', uniqueidentifier: 'SHF-1004', title: 'Depot close down', status: 'done', worker: 'Lina Haddad', site: 'Depot', presence: 'Off shift', shift: 'Night', reported: minutesAgo(320) },
  { id: 'r5', uniqueidentifier: 'SHF-1005', title: 'Marina patrol', status: 'open', worker: 'Yousef Amir', site: 'Marina', presence: 'In zone', shift: 'Morning', reported: minutesAgo(22) },
  { id: 'r6', uniqueidentifier: 'SHF-1006', title: 'Marina handover', status: 'open', worker: 'Karim Nasr', site: 'Marina', presence: 'Late', shift: 'Night', reported: minutesAgo(140) },
]

export default function WorkforcePulseDemo() {
  return (
    <DocPage
      title="WorkforcePulseView"
      badge="wip"
      summary="The people console (DRAFT) — the fourth operations-console lens. A KPI metric band whose tiles open the shared raw-data drill sheet, a breakdown band with one panel per classification axis the blueprint exposes, a coverage bar chart paired with a read-only activity feed, and a roster table whose presence cell scopes the whole surface. Everything derives from declared metadata: a workforce-typed linked column, a Person-typed column, or the blueprint's existing uiConfig.map.driverCol."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The lens over a people-bearing pipeline. The roster is derived by deduplicating the
          module&apos;s records by their person column, so Amina and Karim each appear once with
          two assignments. Click any <Code>KpiMetricCard</Code> tile to open the shared drill
          sheet over that tile&apos;s own population; click a presence cell in the roster to scope
          the KPIs, panels, chart and feed together.
        </Prose>
        <div className="h-[44rem] overflow-hidden rounded-md border border-border">
          <WorkforcePulseView config={shiftConfig} records={shiftRecords} attentionStates={['Late']} />
        </div>
      </DocSection>

      <DocSection id="gallery" title="Gallery">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'No attention states declared',
              caption:
                'Without attentionStates the lens flags nothing rather than guessing which presence value is bad — the "Needs attention" tile is simply absent.',
              node: (
                <div className="h-[32rem] w-full overflow-hidden rounded-md border border-border">
                  <WorkforcePulseView config={shiftConfig} records={shiftRecords} />
                </div>
              ),
            },
            {
              label: 'Loading',
              caption: 'KPI band and roster skeletons, pinned to the loaded heights for zero layout shift.',
              node: (
                <div className="h-[32rem] w-full overflow-hidden rounded-md border border-border">
                  <WorkforcePulseView config={shiftConfig} records={shiftRecords} loading />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint. personCol / presenceCol / breakdownCols / coverageCol all resolve from its systemcolumns + uiConfig.map bindings.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records behind every band — KPI counts, breakdown panels, the coverage chart, the feed and the derived roster.' },
            { prop: 'peopleConfig', type: 'EntityConfig', description: "The linked workforce module's config, when the host wires the real roster." },
            { prop: 'peopleRecords', type: 'EntityRecord[]', description: 'The linked workforce records. Present → every count is a true headcount instead of a per-assignment dedupe.' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: "Opens a record's own detail surface (roster row click, and the drill sheet's rows)." },
            { prop: 'attentionStates', type: 'readonly string[]', description: 'Presence values that read as "needs attention" — drives one KPI tile and the feed entry tone. Omit and nothing is flagged.' },
            { prop: 'loading', type: 'boolean', description: 'KPI + roster skeleton state.' },
            { prop: 'className', type: 'string', description: 'Root class override.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Declare the person relationship — a workforce/* entityType on the linking column is the strongest binding and the one the lens prefers.',
            'Wire peopleConfig + peopleRecords when the tenant licenses the workforce module, so headcounts are real headcounts rather than deduplicated assignments.',
            'Pass attentionStates from the blueprint’s own vocabulary so the flagged tile and the feed tone agree with what the rest of the product calls a problem.',
            'Bind uiConfig.map.statusCol as the presence axis — the same column the live map colours its markers by, so the console and the map cannot disagree.',
          ]}
          donts={[
            'Don’t add a uiConfig.workforcePulse block — every binding this lens needs already exists in systemcolumns / uiConfig.map, and a second declaration surface would be the one to drift.',
            'Don’t reproduce a source dashboard’s fixed analytics charts here — per-tenant chart content belongs in a dashboard blueprint’s widget grid (DashboardView), not in a view template.',
            'Don’t match on a column’s NAME to find the person, the site or the presence axis — the derivations read declared types and bindings only.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'Each KPI tile is a real keyboard-operable button (role="button", Enter/Space) whose accessible name is its value plus its label, so the control announces the number it drills into.',
            'The drill sheet is a focus-trapped, Esc-to-close dialog whose title names the metric and whose subtitle states the row count.',
            'Roster presence cells are real buttons with aria-pressed, and their click does not also trigger the row’s own open-record action.',
            'The coverage chart carries a required aria-label naming the axis it grouped by; the activity feed renders read-only, with no composer to trap focus.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
