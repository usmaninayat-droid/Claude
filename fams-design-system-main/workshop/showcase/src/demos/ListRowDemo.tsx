import { AlertTriangle, Info, MapPin } from '@fams/ui-kit/icons'
import { Avatar, Badge, IconBadge, ListRow } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * ListRowDemo — reference-template conversion of the ListRow composite
 * showcase. RTL is proven by the global header switcher, not a per-page
 * block.
 */

type ListRowControls = {
  leading: 'avatar' | 'icon' | 'none'
  title: string
  subtitle: string
  trailing: string
  isSelected: boolean
  isUnread: boolean
}

function leadingFor(kind: ListRowControls['leading']) {
  if (kind === 'avatar') return <Avatar size="sm" name="Karim Nasser" />
  if (kind === 'icon') return <IconBadge icon={AlertTriangle} tone="warning" shape="circle" size="sm" />
  return undefined
}

export default function ListRowDemo() {
  return (
    <DocPage
      title="ListRow"
      badge="stable"
      summary="Compact horizontal row for list views — inbox lists, search results, the list rail of a hybrid map+list view. Slot-based (leading/title/subtitle/trailing); the non-tabular sibling of DataTable."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ListRowControls>
          controls={[
            { name: 'leading', type: 'select', default: 'avatar', options: ['avatar', 'icon', 'none'] },
            { name: 'title', type: 'text', default: 'Karim Nasser checked in' },
            { name: 'subtitle', type: 'text', default: 'Vehicle AUH-4471 — Lot 1' },
            { name: 'trailing', type: 'text', default: '08:02' },
            { name: 'isSelected', type: 'boolean', default: false },
            { name: 'isUnread', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-card">
              <ListRow
                leading={leadingFor(v.leading)}
                title={v.title}
                subtitle={v.subtitle}
                isSelected={v.isSelected}
                isUnread={v.isUnread}
                trailing={<span className="text-body-xs text-muted-foreground">{v.trailing}</span>}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="leading" title="Leading slot">
        <Prose>
          <Code>leading</Code> accepts any node — an <Code>Avatar</Code>, an <Code>IconBadge</Code>,
          or nothing at all.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Avatar',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<Avatar size="sm" name="Karim Nasser" />}
                    title="Karim Nasser checked in"
                    subtitle="Vehicle AUH-4471 — Lot 1"
                    trailing={<span className="text-body-xs text-muted-foreground">08:02</span>}
                  />
                </div>
              ),
            },
            {
              label: 'Icon',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<IconBadge icon={Info} tone="info" shape="circle" size="sm" />}
                    title="Sync completed"
                    subtitle="Oracle GRN — 214 records"
                    trailing={<span className="text-body-xs text-muted-foreground">10:41</span>}
                  />
                </div>
              ),
            },
            {
              label: 'None',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow title="Contract CNT-1038" subtitle="No open items" trailing={<Badge variant="success" dot>OK</Badge>} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="state" title="State">
        <Prose>
          <Code>isSelected</Code> tints the row; <Code>isUnread</Code> bolds the title;{' '}
          <Code>trailing</Code> accepts any node, not just text.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Default',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<Avatar size="sm" name="Sara Ahmed" />}
                    title="Default row"
                    subtitle="Not selected, read"
                    trailing={<span className="text-body-xs text-muted-foreground">2h ago</span>}
                  />
                </div>
              ),
            },
            {
              label: 'Unread',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<Avatar size="sm" name="Layla Haddad" />}
                    title="Unread message"
                    subtitle="Bolded title"
                    isUnread
                    trailing={<span className="text-body-xs text-muted-foreground">5m ago</span>}
                  />
                </div>
              ),
            },
            {
              label: 'Selected',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<Avatar size="sm" name="Zain Uddin" />}
                    title="Selected row"
                    subtitle="Secondary tint background"
                    isSelected
                    trailing={<span className="text-body-xs text-muted-foreground">1h ago</span>}
                  />
                </div>
              ),
            },
            {
              label: 'Badge trailing',
              node: (
                <div className="w-full overflow-hidden rounded-md border border-border bg-card">
                  <ListRow
                    leading={<IconBadge icon={MapPin} tone="danger" shape="circle" size="sm" />}
                    title="Contract CNT-1042"
                    subtitle="Flagged for review by Saed Salah"
                    trailing={<Badge variant="destructive">3</Badge>}
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="meta" title="Metadata columns">
        <Prose>
          <Code>meta</Code> renders label-over-value columns between the title block and the
          trailing slot — the "Event Log" row layout. Generic by design: the caller names the
          columns, the row just lays them out (with a logical separator, so it mirrors under RTL).
        </Prose>
        <Prose>
          The template is chosen by the <strong>row's own width</strong>, not by content length, so
          every row of one list resolves to the same one. At 42rem or wider the columns sit on the
          row behind a vertical rule and the title block gets a 12rem floor; narrower than that the
          row stacks — title, chip, subtitle, then one <Code>LABEL value</Code> line per column, each
          with the full row width. The stacked form is what a ~400px map rail gets, where the
          columnar one crushed the title to "Fuel Re…" and the labels to "VE…" (verdict V6 — never
          crush a column, never clip one). Because the line count is always{' '}
          <Code>meta.length</Code>, every row of a list is the same height.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'meta',
              caption: 'title block · N label/value columns · trailing',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <ListRow
                    title="Harsh braking"
                    subtitle="Al Quoz industrial area"
                    meta={[
                      { id: 'asset', label: 'Asset', value: 'TME-298' },
                      { id: 'speed', label: 'Speed', value: '82 km/h' },
                      { id: 'driver', label: 'Driver', value: 'A. Kapoor' },
                    ]}
                    trailing={<span className="text-caption text-muted-foreground">09:41</span>}
                  />
                </div>
              ),
            },
            {
              label: 'meta — narrow card (stacked template)',
              caption: 'one line per column, full width, nothing truncated',
              node: (
                <div className="w-80 rounded-md border border-border bg-card">
                  <ListRow
                    title="Zone Out Violation"
                    subtitle="Khalifa Port"
                    meta={[
                      { id: 'vehicle', label: 'Vehicle', value: 'DXB-B-1007' },
                      { id: 'driver', label: 'Driver', value: 'Bilal Aziz' },
                      { id: 'location', label: 'Location', value: 'Khalifa Port' },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'leading', type: 'ReactNode', description: 'Leading slot — avatar, icon, status dot.' },
            { prop: 'title', type: 'ReactNode', description: 'Primary line.' },
            { prop: 'subtitle', type: 'ReactNode', description: 'Secondary line.' },
            {
              prop: 'titleBadge',
              type: 'ReactNode',
              description:
                'Chip rendered inside the title block on its own line under title (above subtitle) — e.g. a severity Badge. Kept out of title so the title stays truncatable while the chip never is.',
            },
            {
              prop: 'meta',
              type: 'ListRowMetaItem[]',
              description:
                '{ id?, label, value }[] — label-over-value columns. The row becomes a query container: >=42rem wide it lays them out as columns between the title block and trailing, narrower it stacks one LABEL value line per column. Omit for the original two-slot row.',
            },
            { prop: 'trailing', type: 'ReactNode', description: 'Trailing slot — timestamp, badge, chevron.' },
            { prop: 'isSelected', type: 'boolean', default: 'false', description: 'Tints the row with a secondary background.' },
            { prop: 'isUnread', type: 'boolean', default: 'false', description: 'Bolds the title.' },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'onClick makes the row keyboard-operable (role="button", Enter/Space); any other div attribute passes through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Stack rows inside a bordered card to reproduce an inbox/critical-events list look.',
            'Use isUnread + isSelected together when a row can be both — they compose independently.',
            'Keep title and subtitle to one line each; both truncate rather than wrap.',
            'Reach for ListRow over DataTable when there is no tabular/column structure to the data.',
          ]}
          donts={[
            'Don’t put more than one primary action in trailing — a chevron or a single badge, not a button group.',
            'Don’t use ListRow for dense tabular data with many columns — that’s DataTable’s job.',
            'Don’t rely on isUnread alone to convey status — pair it with a real subtitle or badge.',
            'Don’t nest another interactive control inside a clickable row without stopping click propagation.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Passing onClick makes the row role="button" with a tabIndex, plus Enter/Space keyboard activation.',
            'Rows without onClick render as plain, non-interactive containers — no implicit button semantics.',
            'Visible focus ring (focus-visible:ring) appears only on interactive rows.',
            'isUnread is conveyed by font weight, not colour alone; pair with a real status cue if colour-coding further.',
            'Leading/trailing slots swap sides automatically under RTL via plain flex — no ms-/me- overrides needed (switch the header language to verify).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Stack rows inside a bordered card (<Code>border-b</Code>, <Code>last:border-b-0</Code> is
          built in) to reproduce the CriticalEventsList / inbox-list look without a new composite.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
