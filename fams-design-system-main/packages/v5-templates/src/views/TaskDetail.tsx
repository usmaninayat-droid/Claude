import { useMemo, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  FieldGrid,
  type TransitionStageTone,
} from '@fams/ui-kit'
import {
  compileFieldSet,
  deriveDetail,
  evalCondition,
  type EntityConfig,
  type EntityRecord,
  type UserContext,
} from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { getSectionComponentRenderer, registerSectionComponent } from '../lib/section-components'
import { renderReadCell } from './field-cell'
import { ViewEmptyState } from './ViewEmptyState'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TaskDetailAdditionalInfo, type TaskDetailAdditionalInfoProps } from './TaskDetailAdditionalInfo'
import { NotesSection, BeforePhotosSection, FieldColumnsSection, FieldTilesSection, NotesProofsSection } from './section-renderers'
import { LocationMapSectionLazy } from './LocationMapSectionSlot'
import { OnwaniLocationSectionLazy } from './OnwaniLocationSectionSlot'
import { LinkedRecordDetailSection } from '../entity-profile/LinkedRecordDetailSection'

/**
 * Built-in named SECTION renderers (figma-spec-detail.md §§4–7) — a
 * blueprint opts in by name alone, the same zero-app-code contract the
 * field-level component registry gives `IconTextView`/`PersonView`.
 * Registered here as real top-level CALLS (not bare `import './x'` side-
 * effect imports) — this package builds with `"sideEffects": false`
 * (`package.json`), and a bare import with no referenced binding is exactly
 * what esbuild is licensed to drop under that flag (confirmed against a
 * real `tsup` build: it silently elided two such imports before this fix).
 * `LocationMapSectionLazy` pulls the map stack only on first render — see
 * `LocationMapSectionSlot.tsx` for the lazy boundary itself.
 */
registerSectionComponent('NotesSection', NotesSection)
registerSectionComponent('BeforePhotosSection', BeforePhotosSection)
registerSectionComponent('LocationMapSection', LocationMapSectionLazy)
registerSectionComponent('FieldColumnsSection', FieldColumnsSection)
registerSectionComponent('NotesProofsSection', NotesProofsSection)
registerSectionComponent('FieldTilesSection', FieldTilesSection)
// The creation form's OnwaniLocationPicker mounted as a detail-sheet section,
// so location is edited through the SAME component everywhere (product ask
// 2026-09-03) — behind the same lazy boundary as `LocationMapSection`, since
// the picker's map lives in the heavy `./map` entry.
registerSectionComponent('OnwaniLocationSection', OnwaniLocationSectionLazy)
// The SPEC 29-42895 §1.4.3 "address tiles + map in ONE section" shape —
// pure composition of the two registered renderers above/below it, so a
// blueprint gets the Figma section without a bespoke component.
registerSectionComponent('FieldTilesMapSection', (props) => (
  <div className="flex flex-col gap-3">
    {FieldTilesSection(props)}
    <LocationMapSectionLazy {...props} />
  </div>
))
// The cross-module linked-record summary section (job-orders SPEC §2.23's
// "Asset Details" — the platform's designated stacking probe) — see
// `LinkedRecordDetailSection`'s own doc for the full `refCol`/`entityType`
// prop contract and why it reuses the target module's own Details layout
// rather than a second field-list shape.
registerSectionComponent('LinkedRecordDetailSection', LinkedRecordDetailSection)

/** Body renderer for a right-panel tab (Timeline / Activity / …). */
export type TaskDetailTabRenderer = (ctx: {
  config: EntityConfig
  record: EntityRecord
  userContext?: UserContext
}) => ReactNode

export interface TaskDetailProps {
  /** Pipeline module config. */
  config: EntityConfig
  /** The task/record being detailed. */
  record: EntityRecord
  /** Stage keys the user may transition TO (from the injected rule check). */
  allowedTransitions?: string[]
  onTransition?: (toStage: string, reason?: string) => void
  /** Per-stage tone override for the header stage chip. */
  statusTones?: Record<string, TransitionStageTone>
  /** Priority slot in the header (e.g. a Badge derived from the record). */
  priority?: ReactNode
  /** Header action buttons. */
  actions?: ReactNode
  /**
   * Wraps a field's already-rendered read value before it reaches
   * `FieldGrid` — the seam a host uses for an inline-edit affordance (e.g.
   * a ClickUp-style hover-reveal pencil anchored to the field that opens a
   * quick-edit popup) — applied uniformly through `toFields` (below) to
   * BOTH the top field grid (`detail.details`) and every section's default
   * `FieldGrid` (`detail.sections[].fields`), the same single derivation
   * path every value already goes through. Given `col` (the field's own
   * key, unique within this module) and the record so the host can decide
   * per-field, per-stage editability itself — this surface has no opinion
   * on which fields are editable or what a quick-edit control looks like
   * (rule 8/10: that is business logic, not this cross-tenant renderer's
   * business). Omit → every value renders exactly as `renderReadCell`
   * produced it, unchanged (this seam's behavior before it existed).
   */
  wrapFieldValue?: (ctx: { col: string; value: ReactNode; record: EntityRecord }) => ReactNode
  /**
   * Section-level write-through (`SectionComponentProps.onSave`) — the seam a
   * registered section renderer with in-place edit affordances (e.g.
   * `NotesProofsSection`'s `editable` mode) saves through. Omit → sections
   * render read-only regardless of what their blueprint props ask for.
   */
  onRecordSave?: (patch: Record<string, unknown>) => void
  /**
   * Record "type" chip (e.g. `BOOKING`) rendered next to the id chip
   * (figma-spec-detail.md §3.1) — only some modules have a type taxonomy
   * distinct from the record itself; omit when there isn't one (the id-only
   * chip is a spec-noted acceptable simplification).
   */
  recordType?: ReactNode
  /** Overrides the type chip's leading icon (defaults to `alert-triangle`, `TaskDetailHeader`'s own default) — e.g. a per-value icon (Request vs Complaint) matched to `recordType`'s value. */
  recordTypeIcon?: ReactNode
  /**
   * The trailing "Additional Info" collapsible section's body (description /
   * checklist / attachments / images, figma-spec-detail.md §4.4). Omit to
   * render no such section — every blueprint-derived section from
   * `config.uiConfig.profile.sections` still renders regardless.
   */
  additionalInfo?: TaskDetailAdditionalInfoProps
  /**
   * Right-panel tab bodies keyed by the blueprint `component` name
   * (`PipelineTimeline` / `ActivityFeed` / `LinkedItems` / `Attachments`).
   * Unresolved tabs render a placeholder — real data lands in phase 3.
   */
  tabRenderers?: Record<string, TaskDetailTabRenderer>
  /**
   * A "…" overflow-menu element per blueprint-derived section, keyed by the
   * section's stable `id` (falls back to `section-<index>` when the
   * blueprint omits one — see `deriveDetail`) — the KPI/Before Photos
   * accordion headers' `dots-horizontal` menu (figma-spec-detail.md §§6–7).
   * Rendered as a SIBLING of the section's `AccordionTrigger`, never nested
   * inside it. Omit for a section with no menu (most sections have none);
   * the DS has no opinion about what actions the menu offers — that is
   * app-specific business logic, not blueprint layout.
   */
  sectionActions?: Record<string, ReactNode>
  userContext?: UserContext
  className?: string
}

/**
 * TaskDetail — the pipeline-module record surface. [tier-2 pattern]
 *
 * Ports Shaheer's task-detail + pipeline-right-panel design onto core
 * primitives: a header (title / stage-transition control / priority), a left
 * detail column whose fields render through the FieldRegistry read renderers
 * (from `deriveDetail`), and a right panel whose tabs are the blueprint's
 * `rightPanel.tabs` as CONTRACT SLOTS — Timeline / Activity / Linked / Files —
 * resolved through injected `tabRenderers` (placeholder content until phase 3).
 * State-agnostic (Rule 8).
 */
export function TaskDetail({
  config,
  record,
  allowedTransitions,
  onTransition,
  statusTones,
  priority,
  actions,
  recordType,
  recordTypeIcon,
  additionalInfo,
  tabRenderers,
  sectionActions,
  wrapFieldValue,
  onRecordSave,
  userContext,
  className,
}: TaskDetailProps) {
  const compiled = useMemo(() => compileFieldSet(config), [config])
  const detail = useMemo(() => deriveDetail(config, record), [config, record])

  const tabs = detail.rightPanelTabs
  const [active, setActive] = useState<string | undefined>(undefined)
  const activeTab = active ?? tabs[0]?.key
  // Right-panel collapse (figma-spec-detail.md §5.5 "collapse rail" —
  // finding M5): local UI state only, no persistence (rule 8).
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const toFields = (cells: typeof detail.details) =>
    cells.map((cell) => {
      // `cell.component` is the placement's OWN override (`deriveDetail`'s
      // `profile.details`/section `resolveCell`, e.g. a "Priority Level"
      // detail-grid placement naming `PriorityFlagView` while the SAME
      // field's master `component` stays whatever Kanban/List need) — it
      // must win over the field's master `component`, so it's threaded
      // through explicitly rather than letting `renderReadCell` fall back to
      // the master-only resolution it used before this fix.
      const rendered = renderReadCell(compiled, record, cell.col, cell.label, cell.component)
      // Defensive fallback (bug fix): a `wrapFieldValue` implementation
      // that returns nullish (no host edit-callback wired, an unhandled
      // `col`, etc.) must never blank the field — fall back to the plain
      // read-only `rendered` value exactly as before this seam existed,
      // rather than trusting every caller to always produce a value.
      const wrapped = wrapFieldValue ? wrapFieldValue({ col: cell.col, value: rendered, record }) : rendered
      return {
        id: cell.col,
        label: cell.label,
        value: wrapped ?? rendered,
      }
    })

  const sections = detail.sections
    .filter((section) =>
      evalCondition(section.visibleWhen, { user: userContext ?? ({} as UserContext), task: record }),
    )
    .map((section, index) => ({
      key: `section-${index}`,
      ...section,
    }))
  const additionalInfoKey = 'section-additional-info'
  const openSections = [...sections.map((s) => s.key), ...(additionalInfo ? [additionalInfoKey] : [])]


  /** A section with `component` renders through the named SECTION registry
   *  (`LocationMapSection`/`NotesSection`/`BeforePhotosSection`, figma-spec-
   *  detail.md §§4–7) instead of the default label/value `FieldGrid` —
   *  falls back to the same "degrade, never crash" placeholder an
   *  unresolved tab uses when the name isn't registered. */
  const renderSectionBody = (section: (typeof sections)[number]): ReactNode => {
    if (section.component) {
      const Renderer = getSectionComponentRenderer(section.component)
      if (Renderer) {
        return (
          <Renderer
            config={config}
            record={record}
            props={section.componentProps}
            fields={toFields(section.fields)}
            onSave={onRecordSave}
          />
        )
      }
      return (
        <ViewEmptyState
          title="Nothing here yet"
          description={`No section renderer is registered for "${section.component}".`}
        />
      )
    }
    return (
      <FieldGrid
        layout="inline"
        columns={2}
        labelWidth={section.labelWidth}
        emphasis={section.fieldEmphasis}
        fields={toFields(section.fields)}
        className="px-[1.125rem]"
      />
    )
  }

  return (
    <div
      data-slot="task-detail"
      className={cn('flex h-full min-h-0 flex-col bg-card', className)}
    >
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          data-slot="task-detail-fields"
          // `[scrollbar-width:none]` + webkit hide: the column stays
          // scrollable but paints no persistent scrollbar gutter (product
          // direction 2026-09-02) — wheel/trackpad/keyboard scrolling is
          // untouched.
          className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-section text-start lg:border-e lg:border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TaskDetailHeader
            title={detail.title as ReactNode}
            statusList={config.uiConfig.statusList}
            currentStatus={record.status}
            allowedTransitions={allowedTransitions}
            onTransition={onTransition}
            statusTones={statusTones}
            priority={priority}
            actions={actions}
            recordId={record.uniqueidentifier}
            recordType={recordType}
            recordTypeIcon={recordTypeIcon}
            collapseControl={{ collapsed: panelCollapsed, onToggle: () => setPanelCollapsed((c) => !c) }}
          />

          <FieldGrid
            layout="inline"
            columns={2}
            labelWidth={detail.detailsLabelWidth}
            emphasis={detail.detailsFieldEmphasis}
            fields={toFields(detail.details)}
          />

          {sections.length || additionalInfo ? (
            <Accordion type="multiple" defaultValue={openSections}>
              {sections.map((section) => (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger
                    className="text-body-sm font-semibold text-foreground hover:no-underline"
                    chevronPosition="start"
                    actions={sectionActions?.[section.id]}
                  >
                    {section.name}
                  </AccordionTrigger>
                  <AccordionContent>{renderSectionBody(section)}</AccordionContent>
                </AccordionItem>
              ))}
              {additionalInfo ? (
                <AccordionItem value={additionalInfoKey}>
                  <AccordionTrigger className="text-body-sm font-semibold text-foreground hover:no-underline">
                    {additionalInfo.title ?? 'Additional Info'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <TaskDetailAdditionalInfo {...additionalInfo} />
                  </AccordionContent>
                </AccordionItem>
              ) : null}
            </Accordion>
          ) : null}
        </section>

        <TaskDetailPanel
          tabs={tabs}
          activeTab={activeTab}
          onActiveTabChange={setActive}
          collapsed={panelCollapsed}
          config={config}
          record={record}
          userContext={userContext}
          tabRenderers={tabRenderers}
          onRecordSave={onRecordSave}
        />
      </div>
    </div>
  )
}

TaskDetail.displayName = 'TaskDetail'
