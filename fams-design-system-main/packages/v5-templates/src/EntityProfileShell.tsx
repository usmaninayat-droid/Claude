import { useId, useState, type KeyboardEvent } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  Badge,
} from '@fams/ui-kit'
import { cn } from './lib/cn'
import type { EntityProfileRecord, EntityProfileShellProps } from './EntityProfileShell.types'

/**
 * ⚠️ DRAFT EXEMPLAR — for design review. Built to demonstrate the patterns
 * tier concretely (docs/BOUNDARIES.md § The patterns tier); not yet adopted
 * by a second v5 module, so treat every visual/behavioral call below as a
 * proposal for the design team to accept, adjust, or reject — not a shipped
 * contract.
 *
 * EntityProfileShell — the v5-signature multi-tab pinned entity-profile
 * drawer. [tier-2 pattern]
 *
 * Holds MULTIPLE records open at once, browser-tab style, in a strip above
 * the record body — the pattern behind v5's asset-profile / task-detail /
 * ProfileDrawer surfaces (~17 call sites per the v5 functional analysis).
 * Composes core `@fams/ui-kit` only:
 *  - `Sheet`/`SheetContent` for the drawer chrome (overlay, focus trap,
 *    Esc-to-close, RTL-correct slide direction — all inherited for free).
 *  - `Avatar` on every pinned tab and the active record's header.
 *  - `Badge` for the active record's status chip (`status.tone` maps
 *    directly onto `Badge`'s `variant`).
 *  - `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` for the active record's
 *    OWN sections (Overview/Trips/Events, …) — a second, independent tab
 *    concept nested inside the first.
 *
 * The pinned-record strip itself (the closeable browser-tab row) is NOT
 * built from the core `Tabs` primitive: `Tabs`' trigger renders a real
 * `<button>` and offers no per-tab close affordance. It's hand-rolled to
 * satisfy two axe rules at once:
 *  - `aria-required-children` — a `[role="tablist"]` may own ONLY
 *    `[role="tab"]` children, so a sibling close `<button>` inside the strip
 *    is illegal; each pinned entry is therefore a single `[role="tab"]`.
 *  - `nested-interactive` — that `[role="tab"]` must have no focusable
 *    descendant, so the close ✕ is a decorative, `aria-hidden`,
 *    non-focusable `<span>`, never a `<button>`.
 * Close is dispatched from the tab's own handlers: pointer-close by
 * hit-testing whether the click landed on the ✕ region, keyboard-close by
 * Delete/Backspace on the focused tab (`aria-keyshortcuts="Delete"`) — the
 * WAI-ARIA APG closeable-tabs pattern. It borrows the *convention* other core
 * components already use (`data-slot`, `data-state` + `data-[state=active]:`
 * selectors) rather than the `Tabs` implementation itself. See the "core
 * gaps" note below.
 *
 * State-agnostic (Rule 8): every record, its tabs, and its status come in
 * as props. The only internal state is which SECTION tab each open record
 * last showed — purely ephemeral UI memory, reset if the caller ever
 * unmounts the shell. Opening, closing, reordering, and fetching records is
 * entirely the caller's concern.
 *
 * Core gaps surfaced while building this (genuine findings for the review —
 * see docs/BOUNDARIES.md § The patterns tier: "needing to fork a core
 * component means the core has an API gap, fixed in core"):
 *  - `@fams/ui-kit`'s `cn()` isn't part of its PUBLIC export surface, so
 *    this package re-implements it (`./lib/cn`, clsx + tailwind-merge — same
 *    as core). Worth exporting `cn` from the core so every tier shares one
 *    canonical version rather than each re-declaring it.
 *  - No `RovingFocusGroup`-style primitive is exposed for hand-rolled tab
 *    strips like this pinned-record row — the roving-tabindex + arrow-key
 *    logic here is reimplemented locally instead of reused from core.
 * (The styling toolkit — clsx/tailwind-merge/cva/lucide-react — is now a
 *  declared dependency of this package, matching the core's toolkit.)
 */

/** `title` is typically a plain record name, but is typed `ReactNode` for caller flexibility — Avatar's initials fallback only works from a string. */
function avatarLabel(title: EntityProfileRecord['title']): string | undefined {
  return typeof title === 'string' ? title : undefined
}

/** Lucide's `X` glyph, hand-copied (2 paths, MIT) rather than imported — this package has no icon-library dependency of its own (see the "core gaps" note above), and the close affordance is small enough not to warrant one. */
function CloseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

const SHELL_WIDTH_CLASS = {
  md: 'sm:max-w-3xl',
  lg: 'sm:max-w-5xl',
  xl: 'sm:max-w-7xl',
} as const satisfies Record<NonNullable<EntityProfileShellProps['width']>, string>

function shellWidthClass(width: EntityProfileShellProps['width']): string {
  return SHELL_WIDTH_CLASS[width ?? 'lg']
}

// The "pill" styling is applied directly to the single [role="tab"] element
// (see the component doc's a11y note): the tablist owns only role="tab"
// children, and the close ✕ inside each tab is decorative/aria-hidden, so
// there is no separate wrapper or focusable close control to style.
const PINNED_TAB_WRAPPER_BASE_CLASS =
  'group flex min-w-0 max-w-56 shrink-0 items-stretch border-b-2 border-e border-e-border/60 text-body-sm font-medium transition-colors'
const PINNED_TAB_WRAPPER_STATE_CLASS = {
  active: 'border-b-primary bg-card text-foreground',
  inactive: 'border-b-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
}

function pinnedTabWrapperClass(isActive: boolean): string {
  return cn(
    PINNED_TAB_WRAPPER_BASE_CLASS,
    isActive ? PINNED_TAB_WRAPPER_STATE_CLASS.active : PINNED_TAB_WRAPPER_STATE_CLASS.inactive,
  )
}

/**
 * EntityProfileShell — see module doc above. DRAFT EXEMPLAR, for design review.
 */
export function EntityProfileShell({
  open,
  onOpenChange,
  records,
  activeRecordId,
  onActivateRecord,
  onCloseRecord,
  activeTabId,
  onTabChange,
  width,
  className,
}: EntityProfileShellProps) {
  const baseId = useId()
  const pinnedTabDomId = (recordId: string) => `${baseId}-tab-${recordId}`
  const recordPanelDomId = (recordId: string) => `${baseId}-panel-${recordId}`

  // Uncontrolled default per record (see EntityProfileShellProps.activeTabId):
  // remembers each open record's own last-viewed section so flipping between
  // pinned tabs restores where the caller left off, browser-tab style.
  const [internalTabByRecord, setInternalTabByRecord] = useState<Record<string, string>>({})

  const activeRecord = records.find((record) => record.id === activeRecordId)

  const currentTabId =
    activeTabId ?? (activeRecord ? (internalTabByRecord[activeRecord.id] ?? activeRecord.tabs[0]?.id) : undefined)

  function handleTabChange(tabId: string) {
    if (activeTabId === undefined && activeRecord) {
      setInternalTabByRecord((prev) => ({ ...prev, [activeRecord.id]: tabId }))
    }
    onTabChange?.(tabId)
  }

  /**
   * Manual activation model (WAI-ARIA Tabs pattern): arrow keys move focus
   * only, Enter/Space activates. Chosen because activating a pinned record
   * here is "expensive" (swaps the whole profile body), which the ARIA
   * authoring practices call out as the case for manual over automatic
   * activation. Roving index is computed from the live DOM (nearest
   * ancestor `[role="tablist"]` — each pinned tab IS the role="tab" element,
   * so its direct parent is the tablist) rather than a ref list — simple, and
   * correct as long as this strip's own [role="tab"] descendants are the only
   * thing queried.
   */
  function handlePinnedTabKeyDown(event: KeyboardEvent<HTMLDivElement>, recordId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivateRecord(recordId)
      return
    }
    // Close the focused record with Delete/Backspace — the keyboard-accessible
    // counterpart to the decorative ✕ (which is aria-hidden and pointer-only,
    // so the pinned strip's role="tablist" owns nothing but role="tab").
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onCloseRecord(recordId)
      return
    }
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const list = event.currentTarget.closest('[role="tablist"]')
    if (!list) return
    const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'))
    const currentIndex = tabs.indexOf(event.currentTarget)
    if (currentIndex === -1) return
    let nextIndex: number
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else nextIndex = (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[nextIndex]?.focus()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-slot="entity-profile-shell"
        className={cn('gap-0 p-0', shellWidthClass(width), className)}
      >
        <div
          role="tablist"
          aria-label="Open records"
          data-slot="entity-profile-shell-tabstrip"
          className="flex shrink-0 items-stretch overflow-x-auto border-b border-border pe-12"
        >
          {records.map((record) => {
            const isActive = record.id === activeRecordId
            const closeLabel = `Close ${typeof record.title === 'string' ? record.title : 'record'}`
            return (
              // Single [role="tab"] per record — the ONLY child type the
              // parent [role="tablist"] may own (axe aria-required-children).
              // The ✕ is a decorative, aria-hidden, non-focusable <span>, not a
              // nested control, so the tab has no focusable descendant
              // (axe nested-interactive stays clean). Pointer-close vs activate
              // is dispatched by hit-testing the click target; keyboard-close is
              // Delete/Backspace (see handlePinnedTabKeyDown).
              <div
                key={record.id}
                role="tab"
                id={pinnedTabDomId(record.id)}
                aria-selected={isActive}
                // Only the ACTIVE record's panel is mounted, so only the active
                // tab controls a real element — pointing inactive tabs at an
                // unrendered panel id is a dangling IDREF (axe aria-valid-attr-value).
                aria-controls={isActive ? recordPanelDomId(record.id) : undefined}
                aria-keyshortcuts="Delete"
                tabIndex={isActive ? 0 : -1}
                data-slot="entity-profile-shell-pinned-tab"
                data-state={isActive ? 'active' : 'inactive'}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('[data-slot="entity-profile-shell-pinned-tab-close"]')) {
                    onCloseRecord(record.id)
                  } else {
                    onActivateRecord(record.id)
                  }
                }}
                onKeyDown={(event) => handlePinnedTabKeyDown(event, record.id)}
                className={cn(
                  pinnedTabWrapperClass(isActive),
                  'cursor-pointer items-center gap-2 py-2 ps-3 pe-2 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                )}
              >
                <Avatar src={record.avatarSrc} name={avatarLabel(record.title)} size="xs" />
                <span className="min-w-0 flex-1 truncate">{record.title}</span>
                <span
                  data-slot="entity-profile-shell-pinned-tab-close"
                  aria-hidden="true"
                  title={closeLabel}
                  className="inline-flex size-4 shrink-0 select-none items-center justify-center rounded-xs opacity-70 transition-colors hover:bg-muted-foreground/20 hover:opacity-100 group-data-[state=active]:opacity-100"
                >
                  <CloseGlyph />
                </span>
              </div>
            )
          })}
        </div>

        {activeRecord ? (
          <div
            role="tabpanel"
            id={recordPanelDomId(activeRecord.id)}
            aria-labelledby={pinnedTabDomId(activeRecord.id)}
            data-slot="entity-profile-shell-record"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              data-slot="entity-profile-shell-header"
              className="flex shrink-0 items-center gap-3 border-b border-border p-4 text-start sm:p-6"
            >
              <Avatar src={activeRecord.avatarSrc} name={avatarLabel(activeRecord.title)} size="lg" />
              <div className="min-w-0 flex-1">
                <SheetTitle>{activeRecord.title}</SheetTitle>
                {activeRecord.subtitle ? <SheetDescription>{activeRecord.subtitle}</SheetDescription> : null}
              </div>
              {activeRecord.status ? (
                <Badge variant={activeRecord.status.tone} dot>
                  {activeRecord.status.label}
                </Badge>
              ) : null}
            </div>

            <Tabs value={currentTabId} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
              <TabsList aria-label="Sections" className="px-4 sm:px-6">
                {activeRecord.tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {activeRecord.tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

EntityProfileShell.displayName = 'EntityProfileShell'

export type { EntityProfileRecord, EntityProfileRecordTab, EntityProfileShellProps } from './EntityProfileShell.types'
