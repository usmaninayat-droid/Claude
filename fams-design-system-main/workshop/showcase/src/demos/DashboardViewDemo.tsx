import {
  DashboardView,
  DashboardWidgetView,
  DASHBOARD_WIDGET_RENDERERS,
  dashboardConfigFixture,
  dashboardWidgetFixtures,
} from '@fams/v5-templates'
import type { DashboardWidgetType } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code, Gallery, DevNote } from '../docs'

/**
 * DashboardViewDemo — the `dashboard` module type's blueprint-driven surface
 * (tier-2). Everything on the page comes from `dashboardConfigFixture` /
 * `dashboardWidgetFixtures`, the SAME reference data the package's own tests
 * and axe sweep run against, so this page cannot drift from the schema.
 */

/** Every widget type the blueprint enum carries, in authoring order. */
const WIDGET_TYPES = Object.keys(dashboardWidgetFixtures) as DashboardWidgetType[]

/** One-line note per widget type — what a blueprint author reaches for it for. */
const WIDGET_NOTES: Record<DashboardWidgetType, string> = {
  bar: 'Categorical column chart.',
  'stacked-bar': 'Parts of a whole per category.',
  line: 'Trend over an ordered axis.',
  area: 'Trend with filled magnitude.',
  donut: 'Proportional share of a total.',
  'compliance-gauge': 'A single score against a band.',
  'heatmap-calendar': 'Two categorical axes, binned magnitude.',
  'geospatial-heatmap': 'Point density on a map (heavy map entry).',
  leaderboard: 'Ranked rows, table or podium.',
  list: 'Severity-tagged event rows.',
  'kpi-card': 'One number, framed as a card.',
  'stat-with-target': 'One number against an authored target.',
  'sparkline-table': 'Per-row trend beside per-row totals.',
  stack: 'A LAYOUT node — two widgets sharing one grid cell.',
}

export default function DashboardViewDemo() {
  return (
    <DocPage
      title="DashboardView"
      badge="wip"
      summary="The dashboard module type's blueprint-driven surface: a KPI strip, a filter-pill bar and a 12-column widget grid, all read from a DashboardModuleConfig blueprint. Filtering is a pure projection of the authored data — the template never fetches."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Rendered from <Code>dashboardConfigFixture</Code> with no per-dashboard code. The KPI strip,
          the filter pills and the widget grid are all entries in the blueprint; changing a pill
          reprojects every widget whose <Code>dataSource</Code> declares that dimension and fires{' '}
          <Code>onFiltersChange</Code> so the app can refetch if it wants to.
        </Prose>
        <div className="overflow-hidden rounded-md border border-border bg-background p-4">
          <DashboardView config={dashboardConfigFixture} renderer="canvas" />
        </div>
      </DocSection>

      <DocSection id="widget-types" title="Widget types">
        <Prose>
          <Code>DASHBOARD_WIDGET_RENDERERS</Code> is typed{' '}
          <Code>Record&lt;DashboardWidgetType, DashboardWidgetRenderer&gt;</Code>, so an unhandled
          enum value is a compile error and the schema cannot drift from the renderer map. Every
          type below is one entry from <Code>dashboardWidgetFixtures</Code>.
        </Prose>
        <Gallery
          layout="rows"
          items={WIDGET_TYPES.map((type) => ({
            label: type,
            caption: WIDGET_NOTES[type],
            node: (
              <DashboardWidgetView
                widget={dashboardWidgetFixtures[type]}
                filters={{}}
                renderer="canvas"
              />
            ),
          }))}
        />
        <DevNote title="Renderer map">
          <Code>{`Object.keys(DASHBOARD_WIDGET_RENDERERS).length === ${Object.keys(DASHBOARD_WIDGET_RENDERERS).length}`}</Code>
        </DevNote>
      </DocSection>

      <DocSection id="states" title="Widget states">
        <Prose>
          Every widget shares one shell, so loading, error and retry look identical whatever the
          type. <Code>loading</Code> holds the previous render at reduced opacity rather than
          flashing a skeleton; a non-empty <Code>error</Code> swaps the body, and passing{' '}
          <Code>onRetry</Code> is what puts a Retry affordance in the DOM at all.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Loading',
              caption: 'Previous render held, dimmed.',
              node: (
                <DashboardWidgetView widget={dashboardWidgetFixtures.bar} filters={{}} renderer="canvas" loading />
              ),
            },
            {
              label: 'Error',
              caption: 'No onRetry — no Retry button.',
              node: (
                <DashboardWidgetView
                  widget={dashboardWidgetFixtures.bar}
                  filters={{}}
                  renderer="canvas"
                  error="Could not load trips."
                />
              ),
            },
            {
              label: 'Error + retry',
              caption: 'onRetry present — Retry rendered.',
              node: (
                <DashboardWidgetView
                  widget={dashboardWidgetFixtures.bar}
                  filters={{}}
                  renderer="canvas"
                  error="Could not load trips."
                  onRetry={() => {}}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>DashboardView</Code> — the template itself.
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'config',
              type: 'DashboardModuleConfigBlueprint',
              required: true,
              description: 'The dashboard module config (DashboardModuleConfig.schema.json) — KPI strip, filter pills and widget grid.',
            },
            {
              prop: 'renderer',
              type: "'canvas' | 'svg'",
              default: "'canvas'",
              description: 'ECharts renderer forwarded to every chart widget. Use `svg` under jsdom.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Extra header content on the inline-end side. Omit for none — an unwired control must be ABSENT from the DOM, never inert.',
            },
            {
              prop: 'onFiltersChange',
              type: '(filters: DashboardFilterValues) => void',
              description: 'Fires whenever a filter pill changes, so the app can refetch or refilter.',
            },
            { prop: 'className', type: 'string', description: 'Extra classes on the surface root.' },
          ]}
        />
        <Prose>
          <Code>DashboardModuleSurface</Code> — the composer-renderer adapter. Reads the blueprint
          off the module render context and falls back to an empty state when the module carries no
          inline <Code>widgetGrid</Code>.
        </Prose>
        <PropsTable
          rows={[
            { prop: 'ctx', type: 'ModuleRenderContext', required: true, description: 'The composer render context; `ctx.module.config` supplies the blueprint.' },
            { prop: 'renderer', type: "'canvas' | 'svg'", default: "'canvas'", description: 'Forwarded to DashboardView.' },
            { prop: 'actions', type: 'ReactNode', description: 'Forwarded to DashboardView.' },
          ]}
        />
        <Prose>
          <Code>DashboardWidgetView</Code> — one widget, resolved through{' '}
          <Code>DASHBOARD_WIDGET_RENDERERS</Code>. This is the seam a filter selection meets a
          widget at: the renderer receives a <Code>dataSource</Code> already projected through the
          active pill values, so no renderer knows filtering exists.
        </Prose>
        <PropsTable
          rows={[
            { prop: 'widget', type: 'DashboardWidget', required: true, description: 'The authored widget node (its `type` picks the renderer).' },
            { prop: 'filters', type: 'DashboardFilterValues', required: true, description: 'Live filter-pill values. Widgets are re-keyed on change so charts re-render.' },
            { prop: 'selection', type: 'DashboardDimensionSelection', description: 'Resolved dimension selection; when present the widget data is projected through it before rendering.' },
            { prop: 'filterSummary', type: 'string', description: "The active selection in words, appended to the widget's aria-label — supplied only to widgets that actually respond to a selected dimension." },
            { prop: 'renderer', type: "'canvas' | 'svg'", default: "'canvas'", description: 'Forwarded to every chart composite.' },
            { prop: 'loading', type: 'boolean', description: 'Holds the previous render at reduced opacity rather than flashing a skeleton.' },
            { prop: 'error', type: 'string | null', description: 'Non-empty puts the widget in its error state.' },
            { prop: 'onRetry', type: '() => void', description: 'Presence renders a Retry affordance in the error state.' },
            { prop: 'onItemSelect', type: '(widgetId: string, itemId: string) => void', description: 'Row/marker/card activation seam. Presence is what makes rows interactive at all.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Author a whole dashboard as a blueprint — KPI strip, pills and grid are all metadata.',
            'Give every widget a dataSource.ariaLabel that names what the plot shows.',
            'Declare categoryDimensions / row dimensions so a filter pill can actually narrow the widget.',
            'Use a stack node when two widgets share one grid cell at their own heights.',
            'Pass onItemSelect only when there is something behind the click.',
          ]}
          donts={[
            'Don’t fetch inside the template — onFiltersChange hands refetching back to the app (Rule 8).',
            'Don’t hand-author a per-dashboard React component; the grid is fully authorable via span and stack.',
            'Don’t hardcode colours on a series — use colorIndex, or colorToken for a token-authored override.',
            'Don’t reuse a widget id inside one dashboard; the validator rejects duplicates.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every chart and map widget ships a keyboard-reachable visually-hidden <table> twin carrying the same numbers, wired to the plot via aria-describedby.',
            'Those twins sit in their own sr-only overflow-hidden clip wrapper, so they can never widen the page.',
            'A widget’s aria-label is rebuilt from the FILTERED data, so what a screen reader hears matches what is on screen after a pill change.',
            'Filter pills are real Base UI controls — a time-range pill is a radio list, a collection pill a searchable combobox.',
            'Rank, severity and bin membership are never colour-only: each also states itself in text or a glyph.',
            'RTL-safe throughout: logical properties, mirrored chart axes, <bdi> around composed numerals.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
