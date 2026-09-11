import { HybridView } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { dealsConfig, dealRecords } from './v5-views-blueprint'

const tabRenderers = {
  PipelineTimeline: () => <p className="text-body-sm">Stage history appears here (phase 3).</p>,
  ActivityFeed: () => <p className="text-body-sm">Recent activity appears here (phase 3).</p>,
  LinkedItems: () => <p className="text-body-sm">Linked records appear here (phase 3).</p>,
  Attachments: () => <p className="text-body-sm">Files appear here (phase 3).</p>,
}

/**
 * `dealsConfig` with Stage tabs on (SPEC Addendum "Stage tabs" — the SAME
 * lens `MapHybridView`'s record-map hybrid already carries). Reuses the
 * SAME golden blueprint's real `statusList` (Lead/Qualified/Proposal/Won/
 * Lost) and each seed record's own `status` — no invented stage vocabulary
 * for the demo.
 */
const stageTabsConfig = {
  ...dealsConfig,
  uiConfig: { ...dealsConfig.uiConfig, hybrid: { ...dealsConfig.uiConfig.hybrid, stageTabs: true } },
}

/**
 * V5HybridViewDemo — the list + detail split TEMPLATE (tier-2): ui-kit's
 * HybridView shell with our blueprint-driven ListView on the leading edge and
 * the selected record's EntityProfile on the trailing edge.
 */
export default function V5HybridViewDemo() {
  return (
    <DocPage
      title="HybridView (template)"
      badge="wip"
      summary="The list + detail split — ui-kit's HybridView shell with the blueprint-driven ListView on the leading edge and the selected record's EntityProfile (2.3) on the trailing edge. Selection is controlled or uncontrolled; presentational."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click a row — the trailing panel shows that record’s <Code>EntityProfile</Code>. Below <Code>md</Code>{' '}
          the split collapses into List / Details tabs.
        </Prose>
        <div className="h-[520px] overflow-hidden rounded-md border border-border">
          <HybridView config={dealsConfig} records={dealRecords} tabRenderers={tabRenderers} statusTone="secondary" />
        </div>
      </DocSection>

      <DocSection id="stage-tabs" title="Stage tabs">
        <Prose>
          <Code>uiConfig.hybrid.stageTabs</Code> adds a <Code>CountTabs</Code> row above the compact
          left list — "All" plus one tab per <Code>uiConfig.statusList</Code> entry, each with a live
          count (SPEC Addendum "Stage tabs" — the same lens <Code>MapHybridView</Code>'s record-map
          hybrid already carries). Because the active tab already states the stage, picking one
          suppresses the now-redundant per-row STATUS pill — it comes back on "All". Click a stage
          below to see it.
        </Prose>
        <div className="h-[520px] overflow-hidden rounded-md border border-border">
          <HybridView
            config={stageTabsConfig}
            records={dealRecords}
            tabRenderers={tabRenderers}
            statusTone="secondary"
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'Drives both the list and the default detail panel.' },
            { prop: 'selectedId / onSelect', type: 'string / (id) => void', description: 'Controlled selection; omit for uncontrolled.' },
            { prop: 'renderDetail', type: '(record) => ReactNode', description: 'Custom right panel; omit for the EntityProfile default.' },
            { prop: 'tabRenderers', type: 'Record<string, ProfileTabRenderer>', description: 'EntityProfile tab bodies (default detail).' },
            { prop: 'editableCols / onRecordChange', type: 'string[] / fn', description: 'Inline-edit passthrough to the list.' },
            { prop: 'activeStage / onActiveStageChange', type: "string / fn", description: "Controlled active stage tab ('all' or a statusList key); omit for uncontrolled (default 'all'). Requires uiConfig.hybrid.stageTabs." },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Let the default EntityProfile render the detail — pass tabRenderers for the right-panel bodies.',
            'Use renderDetail only when the record needs a bespoke panel.',
          ]}
          donts={['Don’t fetch the selected record inside the split — pass records in (Rule 8).']}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Reuses the core HybridView shell — side-by-side on md+, Radix Tabs single-pane below.',
            'The list is the core DataTable; the detail is EntityProfile (core Tabs).',
            'RTL-safe: the list sits on the leading edge and flips automatically.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
