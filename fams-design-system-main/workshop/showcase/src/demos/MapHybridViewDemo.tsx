import { MapHybridView } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import {
  recordMapConfigFixture,
  recordMapRecords,
  stageTabsConfigFixture,
} from '../../../../packages/v5-templates/src/views/hybrid/fixtures'

const config = recordMapConfigFixture()
const records = recordMapRecords()

const stageConfig = stageTabsConfigFixture()

/**
 * MapHybridViewDemo — the generic list + record-map hybrid lens (SPEC §1.3).
 * The fixture deliberately mixes geometry: point-only, polygon-only,
 * both-at-once and no-geometry records, so the "two Figma frames are one lens"
 * doctrine is visible on the page rather than only in the tests.
 */
export default function MapHybridViewDemo() {
  return (
    <DocPage
      title="MapHybridView"
      badge="wip"
      summary="The blueprint-driven list + map hybrid lens — colour-keyed pins AND zone polygons per record, a legend that is both colour key and filter, per-card map-visibility toggles, and two-way map↔list selection sync. Generic and module-agnostic: the colour column, its palette and the geometry bindings all come from uiConfig.map.records."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Geometry is a property of each <em>record</em>, never a view mode: the fixture below has a
          point-only record, a polygon-only record, one carrying <em>both</em>, two co-located pins
          (fanned onto a ring so they stay individually clickable), and records with no location at
          all — which still appear in the list, with a non-blocking chip on the map. Click a card to
          pan the camera; click a pin or polygon to scroll the list to its card.
        </Prose>
        <div className="h-[560px] overflow-hidden rounded-md border border-border p-2">
          <MapHybridView config={config} records={records} />
        </div>
      </DocSection>

      <DocSection id="config" title="Configuration">
        <Prose>
          The whole lens is one blueprint block. <Code>uiConfig.map.records</Code>'s presence is what
          selects this body for the <Code>hybrid</Code> view kind; <Code>colorBy</Code> names the
          column that keys the colour and maps its values to colours in legend order. A colour may be
          a <Code>var(--token)</Code> reference — the legend swatch takes it verbatim, and the GPU map
          layer gets it resolved.
        </Prose>
      </DocSection>

      <DocSection id="stage-tabs" title="Stage tabs">
        <Prose>
          <Code>uiConfig.map.records.toolbar.stageTabs</Code> adds a <Code>CountTabs</Code> row above
          the toolbar — "All" plus one tab per <Code>uiConfig.statusList</Code> entry, each with a
          live count (Requests &amp; Complaints hybrid, SPEC Addendum "Stage tabs"). Because the active
          tab already states the stage, picking one suppresses the now-redundant per-card stage chip
          (<Code>card.stageChip</Code>) and, when the toolbar also groups by <Code>status</Code>, the
          matching section header — both come back on "All". Click a stage below to see it.
        </Prose>
        <div className="h-[560px] overflow-hidden rounded-md border border-border p-2">
          <MapHybridView config={stageConfig} records={records} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'Cards, geometry bindings and the colour key all derive from config.' },
            { prop: 'selectedId / onSelect', type: 'string | null / fn', description: 'Controlled map↔list highlight; omit for uncontrolled.' },
            { prop: 'visibleKeys / onVisibleKeysChange', type: 'string[] / fn', description: 'Controlled legend selection; omit for uncontrolled (all on).' },
            { prop: 'selectedIds / onSelectedIdsChange', type: 'string[] / fn', description: "The shared flat multi-select set — unrelated to the map highlight." },
            { prop: 'renderRowActions', type: '(record) => ReactNode', description: 'The shared hover-revealed row options menu.' },
            { prop: 'onOpenRecord', type: '(record) => void', description: 'Card / popup open — the app owns the detail surface.' },
            { prop: 'basemapStyles', type: 'string[]', description: 'Style URLs the layers control cycles between.' },
            { prop: 'toolbar.stageTabs', type: 'boolean', description: 'Stage-tab row above the toolbar (uiConfig.map.records.toolbar.stageTabs). Requires a non-empty uiConfig.statusList.' },
            { prop: 'activeStage / onActiveStageChange', type: "string / fn", description: "Controlled active stage tab ('all' or a statusList key); omit for uncontrolled (default 'all')." },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Model pins vs polygons as per-record geometry — a records-carry-zones blueprint renders the zone frame for free.',
            'Keep legend counts as totals per value; they move with search and filters, never with a sibling checkbox.',
            'Let the shared row-actions slot supply the card overflow menu instead of adding a second one.',
          ]}
          donts={[
            'Don’t add a pins-vs-polygons mode flag — it would quietly become a second view lens.',
            'Don’t hand a var(--token) string to a map layer without resolving it; WebGL never reads the CSS cascade.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The legend is a labelled fieldset of real checkbox rows; unchecking all is allowed and offers a Show all action.',
            'With filtering config-disabled the legend still renders — as static swatches, not dead checkboxes.',
            'Every icon-only map control has a specific accessible name and a tooltip; the per-card eye toggle names the action and carries aria-pressed.',
            'Pin colour is never the only channel: the popover states the colour-key value in text.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
