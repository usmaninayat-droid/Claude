import { Wrench, Pencil, Link2 } from '@fams/ui-kit/icons'
import { Badge, Button, IconBadge, RecordLayout, DetailSection, FieldGrid } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * RecordLayoutDemo — standalone showcase for the RecordLayout family
 * (RecordLayout + DetailSection + FieldGrid). Belongs under the "Shells"
 * showcase page (`showcase/Shells.tsx`), next to ProfileLayout — this is the
 * flat/non-tabbed sibling for records that don't need a tab strip.
 */
export default function RecordLayoutDemo() {
  return (
    <DocPage
      title="RecordLayout"
      badge="stable"
      summary="A flat (non-tabbed) detail page: header slots (icon/category/title/subtitle/status/meta/actions) over a main column of DetailSection blocks, with an optional sticky aside. Companion to ProfileLayout for records that don't need a tab strip. DetailSection is a titled block wrapper; FieldGrid is a labeled key/value grid built on FormGrid."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full record — header, two DetailSections, sticky aside"
          hint="the FieldGrid inside 'Asset details' is the labeled key/value grid"
          code={`<RecordLayout
  icon={<IconBadge icon={Wrench} tone="primary" />}
  category="Work order"
  title="WO-4821 — Compactor service"
  subtitle="Lot 1 · Municipal collection"
  status={<Badge variant="warning">In progress</Badge>}
  meta={<Badge variant="outline">Priority: High</Badge>}
  actions={<Button size="sm" variant="secondary"><Pencil /> Edit</Button>}
  aside={<DetailSection title="Key facts"><FieldGrid columns={1} fields={[...]} /></DetailSection>}
>
  <DetailSection title="Summary">...</DetailSection>
  <DetailSection title="Asset details">
    <FieldGrid fields={[{ label: 'Plate number', value: 'DXB-12345' }, ...]} />
  </DetailSection>
</RecordLayout>`}
        >
          <div className="w-full">
            <RecordLayout
              icon={<IconBadge icon={Wrench} tone="primary" />}
              category="Work order"
              title="WO-4821 — Compactor service"
              subtitle="Lot 1 · Municipal collection"
              status={<Badge variant="warning">In progress</Badge>}
              meta={<Badge variant="outline">Priority: High</Badge>}
              actions={
                <>
                  <Button size="sm" variant="secondary">
                    <Pencil /> Edit
                  </Button>
                  <Button size="sm" variant="tertiary">
                    <Link2 /> Link asset
                  </Button>
                </>
              }
              aside={
                <DetailSection title="Key facts">
                  <FieldGrid
                    columns={1}
                    fields={[
                      { label: 'Assigned ESP', value: 'Lavajet' },
                      { label: 'Due', value: '2026-07-05' },
                      { label: 'Created by', value: 'Kashish Bindrani' },
                    ]}
                  />
                </DetailSection>
              }
            >
              <DetailSection title="Summary">
                <p className="text-body-sm text-foreground">
                  Scheduled hydraulic compactor service after a fault code was raised during the
                  morning pre-trip inspection. Parts on order; ETA tomorrow.
                </p>
              </DetailSection>
              <DetailSection title="Asset details">
                <FieldGrid
                  fields={[
                    { label: 'Plate number', value: 'DXB-12345' },
                    { label: 'Model', value: 'Compactor 4200' },
                    { label: 'Odometer', value: '128,340 km' },
                    { label: 'Fuel type', value: 'Diesel' },
                    { label: 'Last service', value: '2026-05-11' },
                    { label: 'Next inspection', value: undefined },
                  ]}
                />
              </DetailSection>
            </RecordLayout>
          </div>
        </Demo>
      </DocSection>

      <DocSection id="detail-section" title="DetailSection variants">
        <Prose>
          <Code>title</Code> drives the header row — pass <Code>actions</Code> alongside it for
          right-aligned controls, or omit <Code>title</Code> entirely for a plain, borderless block.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Titled',
              node: (
                <DetailSection title="Summary" className="w-64">
                  <p className="text-body-sm text-foreground">Header row + padded body.</p>
                </DetailSection>
              ),
            },
            {
              label: 'With header actions',
              node: (
                <DetailSection
                  title="Asset details"
                  actions={
                    <Button size="sm" variant="ghost">
                      <Pencil /> Edit
                    </Button>
                  }
                  className="w-64"
                >
                  <p className="text-body-sm text-foreground">Actions sit end-aligned with the title.</p>
                </DetailSection>
              ),
            },
            {
              label: 'Untitled',
              caption: 'no header row',
              node: (
                <DetailSection className="w-64">
                  <p className="text-body-sm text-foreground">No header row here — a plain content block.</p>
                </DetailSection>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="field-grid" title="FieldGrid columns">
        <Prose>
          <Code>columns</Code> sets the widest-breakpoint column count (collapses to 1 below{' '}
          <Code>sm</Code>); a missing <Code>value</Code> renders an em dash instead of a blank cell.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'columns={1}',
              node: (
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: 'Assigned ESP', value: 'Lavajet' },
                    { label: 'Due', value: '2026-07-05' },
                  ]}
                />
              ),
            },
            {
              label: 'columns={2}',
              caption: 'default',
              node: (
                <FieldGrid
                  fields={[
                    { label: 'Plate number', value: 'DXB-12345' },
                    { label: 'Model', value: 'Compactor 4200' },
                    { label: 'Next inspection', value: undefined },
                  ]}
                />
              ),
            },
            {
              label: 'columns={3}',
              node: (
                <FieldGrid
                  columns={3}
                  fields={[
                    { label: 'Fuel type', value: 'Diesel' },
                    { label: 'Odometer', value: '128,340 km' },
                    { label: 'Last service', value: '2026-05-11' },
                  ]}
                />
              ),
            },
            {
              label: 'layout="inline"',
              caption: 'fixed-width label beside the value, e.g. Task/Lease Detail key-value grid',
              node: (
                <FieldGrid
                  layout="inline"
                  columns={1}
                  fields={[
                    { label: 'Applied On', value: '01 Dec, 2024' },
                    { label: 'Due Date', value: '08 Dec, 2024' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>RecordLayout</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Small leading identity element in the header (e.g. an IconBadge).',
            },
            {
              prop: 'category',
              type: 'ReactNode',
              description: 'Small caption above the title (record type/category).',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Record title, rendered as an h2 next to status.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Secondary line under the title.',
            },
            {
              prop: 'status',
              type: 'ReactNode',
              description: 'Status indicator rendered inline next to the title (e.g. a Badge).',
            },
            {
              prop: 'meta',
              type: 'ReactNode',
              description: 'Secondary badges/metadata row under the subtitle.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Header action buttons (edit, link, unlink, …).',
            },
            {
              prop: 'aside',
              type: 'ReactNode',
              description: 'Sticky secondary column (profile card, key facts, activity feed, …); stacks below the main column under lg.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Main column content — typically a stack of DetailSection.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through (title is reserved by the component).',
            },
          ]}
        />
        <Prose>
          <Code>DetailSection</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'title',
              type: 'ReactNode',
              description: 'Section title — omit for an untitled/borderless content block.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Right-aligned header actions (edit, expand, …). Only shown alongside title.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Section body content.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLElement>, 'title'>",
              description: 'className and any section attribute pass through.',
            },
          ]}
        />
        <Prose>
          <Code>FieldGrid</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'fields',
              type: '{ id?: string; label: ReactNode; value: ReactNode }[]',
              required: true,
              description: 'Label/value pairs to render; a missing value renders an em dash.',
            },
            {
              prop: 'columns',
              type: '1 | 2 | 3 | 4',
              default: '2',
              description: 'Column count at the widest breakpoint; collapses to 1 below sm. Inherited from FormGrid.',
            },
            {
              prop: 'layout',
              type: "'stacked' | 'rows' | 'inline'",
              default: "'stacked'",
              description:
                "'stacked': label above value (form-style). 'rows': one full-width bordered row per field. 'inline': label and value share a row with a fixed label column — the Task/Lease Detail key-value grid pattern (figma-spec-detail.md §3.3/§4).",
            },
            {
              prop: 'gap',
              type: "'inline' | 'field' | 'section'",
              default: "'field'",
              description: 'Semantic row/column gap preset, inherited from FormGrid.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use RecordLayout for a single-record detail page with no tab strip — reach for ProfileLayout when tabs are needed.',
            'Group related fields into a DetailSection with a clear title.',
            'Use FieldGrid for structured key/value data; keep free-form text in a plain DetailSection body.',
            'Put the sticky context card (assignee, dates, ESP) in aside so it stays visible while the main column scrolls.',
          ]}
          donts={[
            'Don’t nest a RecordLayout inside another RecordLayout — compose DetailSection blocks instead.',
            'Don’t place primary page actions anywhere but actions — it is the only header actions slot.',
            'Don’t use FieldGrid for long free text; the em-dash placeholder implies short scalar values.',
            'Don’t omit a DetailSection’s title just to save space — only drop it for a genuine plain sub-panel.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'title renders as an <h2> and each DetailSection title as an <h3> — a correct heading hierarchy for screen-reader page navigation.',
            'aside renders as a semantic <aside> landmark when present.',
            'The main/aside split uses flex-row, which follows inline direction and mirrors correctly under RTL with no direction-specific classes.',
            'FieldGrid renders a missing value as an em dash ("—") rather than a blank cell, so every row still announces consistently for assistive tech.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          No flat full-page equivalent existed in v5 — every "detail" view was either a tab panel
          inside <Code>ProfileLayout</Code>/<Code>ProfileTabs</Code>, or a card:{' '}
          <Code>AssetGroupCard.vue</Code> (+ FAMS/EAD forks, 16 tab-panel call sites across
          asset/bin/contract/company/contact/vehicle/device/sim/workforce),{' '}
          <Code>EntityProfileCard.vue</Code>, and the orphaned <Code>LabelValueView.vue</Code>.
          RecordLayout + DetailSection + FieldGrid consolidate that pattern into slots. Related:{' '}
          <Code>ProfileLayout</Code>, for records that need a tab strip.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
