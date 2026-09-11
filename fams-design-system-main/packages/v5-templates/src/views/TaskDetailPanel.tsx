import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord, UserContext } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { getTabComponentRenderer, registerTabComponent } from '../entity-profile/tab-components'
import { ViewEmptyState } from './ViewEmptyState'
import { RecordListTab, type RecordListVariant } from './task-detail/RecordListTab'
import { ActivityCommentFeed } from './task-detail/ActivityCommentFeed'

/**
 * Built-in named TAB renderers for the record right panel — the tab-level
 * analogue of `TaskDetail.tsx`'s `registerSectionComponent` block, and
 * registered the same way: real top-level CALLS, never a bare
 * `import './x'` side-effect import, because this package builds with
 * `"sideEffects": false` and esbuild is licensed to drop an import whose
 * bindings are never referenced.
 *
 * `RecordList` is ONE generic renderer covering every "list this record's
 * array field" tab — `Attachments`, `Linked`, and whatever a later blueprint
 * points at some other field. The blueprint chooses the field, the row
 * flavour and the empty copy through `component.props`; no module vocabulary
 * reaches this package (root rule 10), and nothing here branches on
 * `pipelines` or any other module code.
 */
/*
 * `ActivityCommentFeed` — the generalized mixed system-log + @mention-comment
 * timeline with composer (SPEC task-detail-29-42895 §1.5/§2.14, AC-5.4..5.6).
 * Same contract as `RecordList`: the blueprint names WHICH record field
 * carries the feed via `component.props.field` (plus the current user's
 * mention handle for the accent rule); an unfinished declaration degrades to
 * the shared placeholder instead of guessing a field.
 */
registerTabComponent('ActivityCommentFeed', ({ record, props, onRecordChange }) => {
  const cfg = (props ?? {}) as {
    field?: string
    currentUser?: string
    placeholder?: string
    emptyLabel?: string
    search?: boolean
    searchPlaceholder?: string
    order?: 'newest-first' | 'oldest-first'
  }
  if (!cfg.field) return null
  return (
    <ActivityCommentFeed
      record={record}
      field={cfg.field}
      currentUser={cfg.currentUser}
      placeholder={cfg.placeholder}
      emptyLabel={cfg.emptyLabel}
      search={cfg.search}
      searchPlaceholder={cfg.searchPlaceholder}
      order={cfg.order}
      // Persist a posted comment into the record's own feed field when the
      // host wired a save path — the Timeline then reflects it like any
      // seeded entry. No save path → same local-only optimistic post as ever.
      onPost={
        onRecordChange
          ? (entry) => {
              const existing = record?.[cfg.field as string]
              onRecordChange({ [cfg.field as string]: [...(Array.isArray(existing) ? existing : []), entry] })
            }
          : undefined
      }
    />
  )
})

registerTabComponent('RecordList', ({ record, props }) => {
  const cfg = (props ?? {}) as {
    field?: string
    variant?: RecordListVariant
    emptyTitle?: string
    emptyDescription?: string
  }
  // A blueprint that names `RecordList` without saying WHICH field to list
  // has not finished the declaration; rendering the record's first array
  // field by guesswork would silently show the wrong data, so this degrades
  // to the shared "not wired yet" placeholder instead.
  if (!cfg.field) return null
  return (
    <RecordListTab
      field={cfg.field}
      record={record}
      variant={cfg.variant}
      emptyTitle={cfg.emptyTitle}
      emptyDescription={cfg.emptyDescription}
    />
  )
})

/** One right-panel tab, as `deriveDetail` hands it over. */
export interface TaskDetailPanelTab {
  key: string
  title: string
  component?: string
  /** The tab's authored `component.props` — what tells a generic renderer which field to render. */
  componentProps?: Record<string, unknown>
}

/** Body renderer for a right-panel tab, injected by the app for bespoke bodies. */
export type TaskDetailPanelTabRenderer = (ctx: {
  config: EntityConfig
  record: EntityRecord
  userContext?: UserContext
}) => ReactNode

export interface TaskDetailPanelProps {
  tabs: TaskDetailPanelTab[]
  activeTab: string
  onActiveTabChange: (key: string) => void
  collapsed?: boolean
  config: EntityConfig
  record: EntityRecord
  userContext?: UserContext
  tabRenderers?: Record<string, TaskDetailPanelTabRenderer>
  /**
   * Write-back channel for an editable tab body (e.g. `ActivityCommentFeed`
   * persisting a posted comment) — forwarded to registered tab components as
   * their `onRecordChange`, the same seam `EntityProfile` already threads.
   */
  onRecordSave?: (patch: Record<string, unknown>) => void
}

/**
 * TaskDetailPanel — the record detail's collapsible right panel: the tab
 * strip and the active tab's body. [tier-2 internal]
 *
 * Extracted from `TaskDetail` under root rule 12's decompose-on-touch (that
 * file sat exactly on the 300-line budget and this wave had to change the
 * tab-body resolution inside it). Behaviour is otherwise unchanged — a move,
 * not a rewrite.
 */
export function TaskDetailPanel({
  tabs,
  activeTab,
  onActiveTabChange,
  collapsed = false,
  config,
  record,
  userContext,
  tabRenderers,
  onRecordSave,
}: TaskDetailPanelProps) {
  /**
   * Resolution order — the NAMED REGISTRY FIRST, the caller's injected map
   * second. This is the order `EntityProfile` already uses, and adopting it
   * here is what makes a generic tab (`RecordList`) work for any module the
   * moment its blueprint names one, with zero app-layer wiring. Previously
   * this consulted `tabRenderers` alone, so every tab body had to be written
   * in the app — which is exactly how the pipeline right panel came to ship
   * with only the two tabs the app happened to have hand-written.
   *
   * A tab naming a component nobody has registered still degrades to a real
   * empty state rather than a blank pane or a crash.
   */
  const renderTabBody = (component?: string, componentProps?: Record<string, unknown>): ReactNode => {
    if (component) {
      const registered = getTabComponentRenderer(component)
      const body = registered?.({ config, record, userContext, props: componentProps, onRecordChange: onRecordSave })
      if (body != null) return body
      if (tabRenderers?.[component]) return tabRenderers[component]({ config, record, userContext })
    }
    return (
      <ViewEmptyState
        title="Nothing here yet"
        description="This panel is a contract slot — real data arrives in a later phase."
      />
    )
  }

  return (
    <aside
      data-slot="task-detail-panel"
      hidden={collapsed}
      className={cn('min-h-0 w-full flex-col lg:w-96', collapsed ? 'hidden' : 'flex')}
    >
      {tabs.length > 1 ? (
        <Tabs value={activeTab} onValueChange={onActiveTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0 px-section">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="min-h-0 flex-1 overflow-y-auto p-section [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {renderTabBody(tab.component, tab.componentProps)}
            </TabsContent>
          ))}
        </Tabs>
      ) : tabs.length === 1 ? (
        // A single-tab right panel has no switcher to render (figma-spec-
        // detail.md §9: the Timeline pane is "just a heading, no tab-
        // switcher node") — skip straight to that one tab's body under a
        // plain heading, same typography `AccordionTrigger` uses above.
        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className="shrink-0 px-section pt-section text-body-sm font-semibold text-foreground">
            {tabs[0].title}
          </h3>
          <div className="min-h-0 flex-1 overflow-y-auto p-section [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{renderTabBody(tabs[0].component, tabs[0].componentProps)}</div>
        </div>
      ) : (
        <div className="p-section text-body-sm text-muted-foreground">No panels.</div>
      )}
    </aside>
  )
}

TaskDetailPanel.displayName = 'TaskDetailPanel'
