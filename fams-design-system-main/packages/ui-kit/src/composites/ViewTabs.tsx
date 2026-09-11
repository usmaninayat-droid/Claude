import { forwardRef, useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { Plus, X, Pencil } from '../icons'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../primitives/DropdownMenu'

/**
 * ViewTabs — saved-view tab strip. [L3 composite]
 *
 * Browser-style tabs over a list of named saved views (filter presets,
 * dashboard views): select, inline rename (via a per-tab menu), close, add.
 * When the active view has unsaved edits (`dirty`), a "Modified" strip
 * surfaces Revert / Save as new / Save.
 *
 * State-agnostic (Rule 8): renders `tabs` it was GIVEN; which view is active,
 * what "dirty" means, and persisting a rename/save is the caller's concern
 * via callbacks. The only internal state is transient UI state — which tab
 * is mid-rename — never persisted here.
 *
 * A tab is a `div[role=tab]` rather than a `<button>`: it hosts a real,
 * independently-focusable rename trigger and close button, and a `<button>`
 * cannot legally contain another `<button>` (same rationale as Combobox's
 * chip-remove buttons — see that file).
 *
 * @usage-v5
 *   Retires the v5 codebase's saved-view tab strip:
 *   - `shared/components/tabs/ViewTabs.vue` — custom div strip + q-menu
 *     (autosave toggle, q-popup-edit rename, delete-with-confirm), `+` to
 *     create, mobile dropdown fallback
 *   - `shared/components/layouts/ModuleViewLayout.vue` — wires it to
 *     `useViewStore` (per-module saved views: list/map/grid/kanban)
 *   - `shared/components/layouts/ViewSelector.vue` — related view launcher,
 *     not a tab strip (card grid, no rename/close-in-place)
 *   Forms needed: rename, close, add, dirty→Revert/Save-as-new/Save strip.
 * @usage-index view-tabs
 */
export interface ViewTab {
  id: string
  label: string
  /** Unsaved local edits against this view. Drives the "Modified" actions strip when active. */
  dirty?: boolean
}

export interface ViewTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  tabs: ViewTab[]
  activeId: string
  onSelect: (id: string) => void
  /** Presence adds the "+" control at the end of the strip. */
  onAdd?: () => void
  /** Presence adds a close (×) control to every tab. */
  onClose?: (id: string) => void
  /** Presence adds a "Rename" menu to every tab. */
  onRename?: (id: string, label: string) => void
  onRevert?: () => void
  onSaveAsNew?: () => void
  onSave?: () => void
}

export const ViewTabs = forwardRef<HTMLDivElement, ViewTabsProps>(
  (
    { tabs, activeId, onSelect, onAdd, onClose, onRename, onRevert, onSaveAsNew, onSave, className, ...props },
    ref,
  ) => {
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [draft, setDraft] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (renamingId) {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }, [renamingId])

    const activeTab = tabs.find((tab) => tab.id === activeId)
    const modified = Boolean(activeTab?.dirty)

    const startRename = (tab: ViewTab) => {
      setDraft(tab.label)
      setRenamingId(tab.id)
    }

    const commitRename = (tab: ViewTab) => {
      const next = draft.trim()
      if (next && next !== tab.label) onRename?.(tab.id, next)
      setRenamingId(null)
    }

    // Roving focus between tabs; nested rename/close buttons keep their own
    // natural Tab order and are not part of this arrow-key group.
    const focusTabAt = (index: number) => {
      const list = ref && 'current' in ref ? ref.current : null
      const target = list?.querySelectorAll<HTMLElement>('[role="tab"]')[index]
      target?.focus()
    }

    const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number, tab: ViewTab) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect(tab.id)
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const step = event.key === 'ArrowRight' ? 1 : -1
        const nextIndex = (index + step + tabs.length) % tabs.length
        onSelect(tabs[nextIndex].id)
        focusTabAt(nextIndex)
      }
    }

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn('flex items-center gap-1 border-b border-border bg-card ps-2', className)}
        {...props}
      >
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((tab, index) => {
            const active = tab.id === activeId
            const isRenaming = renamingId === tab.id

            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => !isRenaming && onSelect(tab.id)}
                onKeyDown={(event) => !isRenaming && handleTabKeyDown(event, index, tab)}
                data-slot="view-tab"
                className={cn(
                  'group relative inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-t-sm px-3 py-2 text-body-sm outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? '-mb-px border-b-2 border-primary font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    value={draft}
                    aria-label={`Rename ${tab.label}`}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                      if (event.key === 'Enter') commitRename(tab)
                      if (event.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => commitRename(tab)}
                    className="w-24 min-w-0 rounded-xs border border-input bg-background px-1 text-body-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <span className="truncate">{tab.label}</span>
                )}

                {!isRenaming && onRename ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Rename ${tab.label}`}
                        onClick={(event) => event.stopPropagation()}
                        className="grid size-4 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => startRename(tab)}>
                        <Pencil className="size-3.5" />
                        Rename
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}

                {!isRenaming && onClose ? (
                  <button
                    type="button"
                    aria-label={`Close ${tab.label}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onClose(tab.id)
                    }}
                    className="grid size-4 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
            )
          })}

          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add view"
              className="ms-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>

        {modified ? (
          <div className="flex shrink-0 items-center gap-inline pe-2 text-body-xs">
            <span className="font-medium text-warning-text">Modified</span>
            {onRevert ? (
              <Button variant="ghost" size="sm" onClick={onRevert}>
                Revert
              </Button>
            ) : null}
            {onSaveAsNew ? (
              <Button variant="tertiary" size="sm" onClick={onSaveAsNew}>
                Save as new
              </Button>
            ) : null}
            {onSave ? (
              <Button variant="primary" size="sm" onClick={onSave}>
                Save
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  },
)

ViewTabs.displayName = 'ViewTabs'
