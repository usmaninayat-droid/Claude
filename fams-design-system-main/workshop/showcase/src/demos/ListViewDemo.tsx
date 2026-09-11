import { ListView, Button, Input, Badge } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Gallery, PropsTable, Guidelines, A11yList } from '../docs'

/**
 * ListViewDemo — standalone showcase for the ListView shell. The standard
 * list-page skeleton: PageHeader + optional filter bar + content region that
 * owns its own scroll.
 */

const ROWS = [
  { plate: 'AUH 45213', driver: 'Rashid Al Mansoori', lot: 'Lot 1', status: 'Moving', tone: 'success' as const },
  { plate: 'AUH 30188', driver: 'Kareem Haddad', lot: 'Lot 2', status: 'Idle', tone: 'warning' as const },
  { plate: 'AUH 77104', driver: 'Omar Farouk', lot: 'Lot 7', status: 'Stopped', tone: 'destructive' as const },
  { plate: 'AUH 61209', driver: 'Yusuf Iqbal', lot: 'Lot 8', status: 'Offline', tone: 'muted' as const },
]

function FleetTable() {
  return (
    <table className="w-full text-body-sm">
      <thead className="sticky top-0 bg-muted/60 text-start text-muted-foreground">
        <tr>
          <th className="px-4 py-2.5 text-start font-semibold">Plate</th>
          <th className="px-4 py-2.5 text-start font-semibold">Driver</th>
          <th className="px-4 py-2.5 text-start font-semibold">Lot</th>
          <th className="px-4 py-2.5 text-start font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.plate} className="border-t border-border">
            <td className="px-4 py-2.5 font-medium text-foreground">{r.plate}</td>
            <td className="px-4 py-2.5 text-foreground">{r.driver}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{r.lot}</td>
            <td className="px-4 py-2.5">
              <Badge variant={r.tone === 'muted' ? 'muted' : r.tone} dot>
                {r.status}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** ListView is h-full — give it a fixed-height column to render into. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-md border border-border shadow-sm bg-background">
      {children}
    </div>
  )
}

export default function ListViewDemo() {
  return (
    <DocPage
      title="ListView"
      badge="stable"
      summary="The standard list-page skeleton — PageHeader (title, subtitle, actions), an optional filter bar, then a bordered content region that owns its own scroll. Pure layout: the caller supplies the table, ListView owns spacing and the filter-bar chrome."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full — header, filter bar, table"
          hint="the filter bar and content region are both fixed chrome — search/facets go in filterBar, the table is the only child"
          code={`<ListView
  title="Fleet"
  subtitle="Northern Emirates — Al Ain · 4 vehicles"
  actions={<Button size="sm">New plan</Button>}
  filterBar={<><Input placeholder="Search by plate…" /><Button size="sm" variant="tertiary">Lot 1</Button><Button size="sm" variant="ghost">All statuses</Button></>}
>
  <FleetTable />
</ListView>`}
          bare
        >
          <Frame>
            <ListView
              title="Fleet"
              subtitle="Northern Emirates — Al Ain · 4 vehicles"
              actions={<Button size="sm">New plan</Button>}
              filterBar={
                <>
                  <div className="w-56">
                    <Input placeholder="Search by plate…" />
                  </div>
                  <Button size="sm" variant="tertiary">
                    Lot 1
                  </Button>
                  <Button size="sm" variant="ghost">
                    All statuses
                  </Button>
                </>
              }
            >
              <FleetTable />
            </ListView>
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="options" title="Options">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'With filter bar',
              caption: 'default composition',
              node: (
                <Frame>
                  <ListView
                    title="Fleet"
                    subtitle="Lot 1 · 4 vehicles"
                    filterBar={
                      <div className="w-40">
                        <Input placeholder="Search…" />
                      </div>
                    }
                  >
                    <FleetTable />
                  </ListView>
                </Frame>
              ),
            },
            {
              label: 'No filter bar',
              caption: 'filterBar omitted',
              node: (
                <Frame>
                  <ListView title="Contracts" subtitle="12 active">
                    <FleetTable />
                  </ListView>
                </Frame>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Page title, forwarded to the embedded PageHeader.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Optional supporting line below the title.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Header actions (e.g. a "New" button), pinned to the end edge.',
            },
            {
              prop: 'filterBar',
              type: 'ReactNode',
              description: 'Filter-bar region — search, facet dropdowns. The chrome (border, padding, wrap) is entirely hidden when omitted.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Main content region — typically a table. The region owns its own scroll (min-h-0 + overflow-auto).',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through (the native title attribute is reserved by the title prop above).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use ListView for any page whose main job is a header + a single table/list.',
            'Put search and facet controls in filterBar — never hand-roll a row above the table.',
            'Let the content region own its own scroll; do not wrap ListView in another scroll container.',
            'Omit filterBar entirely when a page has nothing to filter — the chrome disappears cleanly.',
          ]}
          donts={[
            "Don't nest a second PageHeader inside children — ListView already renders one.",
            "Don't put page-level actions inside filterBar — that slot is for search/facets, not primary actions.",
            "Don't fix the height of children — ListView already manages the flex/scroll layout.",
            "Don't reach for ListView for tabbed or record-detail pages — use ProfileLayout or RecordLayout instead.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Purely structural — the embedded PageHeader renders the page <h1>; ListView adds no extra landmarks.',
            'The content region is a plain scrollable <div>; the table/list inside it owns its own semantics (role, headers).',
            'Filter-bar controls (inputs, buttons) keep their native focus order — no tab-order overrides.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
