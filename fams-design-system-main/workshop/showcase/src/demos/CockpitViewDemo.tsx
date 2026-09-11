import { useState } from 'react'
import { CockpitView, cockpitConfig, cockpitRecords } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * CockpitViewDemo — the operations-cockpit hybrid lens (target-7 wave 2).
 * Everything renders from the fixture blueprint's `uiConfig.cockpit` block +
 * records: alert strip, derived KPI strip, the resizable queue|map split,
 * and the status-panel band. Light-barrel import only — the map bytes load
 * lazily on route entry through `MapView`'s slot.
 */
export default function CockpitViewDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <DocPage
      title="CockpitView"
      badge="wip"
      summary="Operations-cockpit HYBRID LENS (DRAFT) — alert strip, filters slots, a records-derived KPI strip, a resizable card-queue|live-map split (pixel floors, keyboard separator), and a status-panel band, all read from the module's own uiConfig.cockpit block. ModuleView renders this body for the 'hybrid' view kind when the blueprint carries BOTH uiConfig.cockpit and map coordinate bindings — a view option on existing module types, never a new engine type."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Select a queue card (or a map pin) — the map pans to it and draws the record’s planned
          (dashed) + actual (solid) route pair from <Code>uiConfig.cockpit.routes</Code>; search
          filters the queue live with a running count; KPI cards with <Code>detailColumns</Code>{' '}
          open a raw-data table sheet; the splitter drags (26–70% with 320/360px pixel floors),
          double-clicks back to 40%, and steps by keyboard (arrows, Home/End). Selected:{' '}
          <Code>{selectedId ?? 'none'}</Code>.
        </Prose>
        <div className="h-[44rem]">
          <CockpitView
            config={cockpitConfig}
            records={cockpitRecords}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-full"
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint — uiConfig.cockpit drives every region; uiConfig.map binds the pins.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records — queue cards, KPI counts, panel distributions, and pins all derive from them.' },
            { prop: 'selectedId / onSelect', type: 'string | null / (id) => void', description: 'Controlled queue⇄map selection; omit for uncontrolled.' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: 'Opens a record’s own detail surface (the module’s Detail flavor — TaskDetail for pipelines).' },
            { prop: 'filtersSlot / actionsSlot', type: 'ReactNode', description: 'Filters-row pills (start) and icon actions (end).' },
            { prop: 'queueToolbarSlot', type: 'ReactNode', description: 'Icon buttons after the queue search box (filter, export, …).' },
            { prop: 'onKpiOpen', type: '(kpi: { id, label }) => void', description: 'KPI activation seam — e.g. route one KPI to a bespoke issues sheet.' },
            { prop: 'children', type: 'ReactNode', description: 'Extra surface slot (app-side sheets, overlays, toasts).' },
            { prop: 'loading', type: 'boolean', description: 'Queue skeleton state.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Declare the lens in metadata: add uiConfig.cockpit (plus map coordinate bindings) to an existing entity/pipeline blueprint.',
            'Give the view a bounded height — the split panel is the only region with its own vertical scroll (the queue list).',
            'Keep planned vs actual routes distinguishable by SHAPE (dashed vs solid), never color alone.',
          ]}
          donts={[
            'Don’t invent a new module/engine type for a cockpit — it is a view option on the 9 fixed types.',
            'Don’t let KPI values truncate — badges truncate first; the strip reflows 3-per-row at narrow container widths.',
            'Don’t hardcode geometry or business copy in components — routes, KPIs, and panels are blueprint data.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'The splitter is a focusable role="separator" with aria-valuenow/min/max; arrows resize in 5% steps, Home/End jump to the clamp ends.',
            'Clickable KPI cards are keyboard buttons (Enter/Space); the whole card is the target.',
            'Queue count row and empty states are announced politely (aria-live); progress bars always pair with a text percentage.',
            'Close-map / expand-map states both keep a visible, labelled reopen affordance.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
