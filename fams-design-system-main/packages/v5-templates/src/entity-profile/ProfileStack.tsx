import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Sheet, SheetContent, SheetTitle, SheetDescription, DockedPanel, Avatar } from '@fams/ui-kit'
import { ChevronDown, ChevronUp } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'

/** One open record in the stack's browser-tab strip. */
export interface ProfileStackItem {
  id: string
  title: ReactNode
  /** Small caption above the title on the tab (record type / category). */
  category?: ReactNode
  avatarSrc?: string
  /**
   * Leading glyph override (figma-spec-detail.md §2 window-chrome tab strip:
   * a module icon, e.g. `plane`, not a person avatar). Takes precedence over
   * the default `Avatar` — a record isn't a person, so a caller opening a
   * pipeline/module record can supply its module glyph here instead of
   * falling back to an initials circle (which reads oddly, or renders a
   * broken image icon, for non-person records).
   */
  icon?: ReactNode
}

export interface ProfileStackProps {
  open: boolean
  /**
   * Fired when the surface's open state changes for a reason OTHER than a
   * dismiss. Esc / overlay click no longer route here: they POP ONE record
   * (see `onClose`), so a dismiss is a real state change in the caller's stack
   * rather than an `open=false` the caller has to interpret.
   */
  onOpenChange: (open: boolean) => void
  /** Open records, browser-tab style, in order. */
  items: ProfileStackItem[]
  activeId: string | null
  onActivate: (id: string) => void
  onClose: (id: string) => void
  /** Close-all (red control) — clears the whole stack. */
  onCloseAll?: () => void
  /** Minimize (amber control) — hides the surface but keeps the stack. */
  onMinimize?: () => void
  /**
   * Whether the caller's stack is currently minimized. Passing it (together
   * with `onRestore`) is what makes the minimized stack VISIBLE: without a
   * restore affordance a minimized stack is unreachable state that silently
   * reappears under the next record the user opens.
   */
  minimized?: boolean
  /** Un-minimize — wired to the docked restore affordance. */
  onRestore?: () => void
  /**
   * Where focus should land when the LAST record is popped. Optional: without
   * it the surface falls back to the module shell underneath.
   */
  restoreFocusRef?: RefObject<HTMLElement | null>
  /**
   * Presence adds the trailing "+" affordance at the end of the tab row
   * (figma-spec-nav §4 — the same control reappears after the record-tabs
   * row as after the top navbar's view-tab row). The app opens its own
   * "new record" flow; this component neither creates nor stacks anything.
   */
  onAddRecord?: () => void
  /** Accessible label for the add-record button. Defaults to `'New record'`. */
  addRecordLabel?: string
  /** Renders the active record's body. */
  renderProfile: (item: ProfileStackItem) => ReactNode
  width?: 'md' | 'lg' | 'xl'
  className?: string
  /**
   * Renders the stack DOCKED beside a still-live page (a map, a hybrid
   * list+map view) instead of as a modal: no scrim, no focus trap, no
   * overlay-click-to-close — the same `DockedPanel` mechanism
   * `WeatherStationDrawer` uses for its own one-off panel. Linked-record
   * STACKING (this component's whole reason to exist — the browser-tab
   * strip below) renders identically in both modes, per the FAMS
   * side-sheet contract's requirement that stacking keep working docked
   * too. Defaults to the existing modal `Sheet` chrome when omitted — no
   * existing caller's behavior changes. This is how a Task Detail /
   * Entity Detail caller opens docked: pass `docked` (and `dockedWidth`)
   * to the same `ProfileStack` instance instead of reaching for a
   * different component.
   */
  docked?: boolean
  /**
   * Docked-mode panel width (CSS length). Defaults to the design's 550px,
   * matching `WeatherStationDrawer`'s own default. Ignored in modal mode
   * (`width` governs modal sizing there).
   */
  dockedWidth?: string
  /**
   * Docked-mode full-height ↔ partial-height toggle — the FAMS side-sheet
   * contract's "expand-from-bottom-to-full-height" affordance. Omit to
   * keep the panel always full height (every current docked design —
   * station sidesheet, docked live-monitoring sheet — shows this); pass
   * both this and `onExpandedChange` to surface the expand/restore toggle
   * in the stack's chrome. Ignored in modal mode.
   */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

const WIDTH_CLASS = {
  md: 'sm:max-w-3xl',
  lg: 'sm:max-w-5xl',
  // Figma "Asset Profile" sidesheet, re-measured off the 1920×1080 tanker-detail
  // frames (`plan/tanker-detail/figma-tab-overview.png`): the sheet's start edge
  // lands on x=491 and the app window spans x=8…1912, so the sheet is
  // 1421/1904 ≈ 74.5% of the viewport, leaving ~483px of the page visible.
  // Bumped to 82% 2026-09-15 on IWMP feedback — the workforce Training tab's
  // 8-column RecordTable was wrapping cell text at 74.5% on ≤1440px screens.
  // `sm:max-w-none` drops `Sheet`'s own `sm:max-w-sm` cap so the percentage
  // width actually takes effect instead of being clamped by it.
  xl: 'sm:w-[90%] sm:max-w-none',
} as const

/**
 * `Transparent/Black/40` (#00000066) — the scrim the tanker-detail frames
 * measure (a pixel over white page content reads exactly `rgb(153,153,153)`,
 * i.e. 0.6×255, which is a 40% black dim). Passed through `SheetContent`'s
 * `overlayClassName` seam rather than changed on `SheetOverlay` itself, so the
 * platform default (`bg-black/60`) stays put for every other sheet.
 */
const SCRIM_CLASS = 'bg-black/40'

/**
 * ProfileStack — the multi-profile "browser-tab stacking" SURFACE. [tier-2]
 *
 * Ports Shaheer's `DetailSheet` chrome (a browser-tab strip with macOS
 * window-chrome controls) onto the core `Sheet`, but replaces the two
 * documented raw-hex traffic-light dots with tokens: the close-all dot is
 * `bg-destructive`, the minimize dot is `bg-warning` — no raw hex, our token
 * lint has no `coherence-allow` escape.
 *
 * Fully controlled / state-agnostic (Rule 8): the stack state is owned by the
 * caller (typically `useDetailStack`). Esc/overlay dismiss POPS EXACTLY ONE
 * record (`onClose(activeId)`) — it used to map to MINIMIZE, which took a
 * depth-2 stack to depth 0 on one keypress and merely HID it, so the next
 * unrelated record opened at depth 3 with both "closed" records still tabbed.
 * Minimize stays available on the amber control, and a caller that passes
 * `minimized`/`onRestore` gets a docked restore affordance so a hidden stack is
 * never invisible state. Each tab is an activate
 * `<button>` beside a sibling close `<button>` (never nested — keeps
 * `nested-interactive` clean without hand-rolling roving-tabindex ARIA tabs).
 */
export function ProfileStack({
  open,
  onOpenChange,
  items,
  activeId,
  onActivate,
  onClose,
  onCloseAll,
  onMinimize,
  minimized = false,
  onRestore,
  restoreFocusRef,
  onAddRecord,
  addRecordLabel = 'New record',
  renderProfile,
  width = 'lg',
  className,
  docked = false,
  dockedWidth = '34.375rem',
  expanded,
  onExpandedChange,
}: ProfileStackProps) {
  const activeItem = items.find((i) => i.id === activeId) ?? null
  const activeTitle = activeItem?.title ?? 'Record details'

  // ── Focus restoration after a pop (B2) ────────────────────────────────────
  // Radix restores focus to the dialog's TRIGGER on close; `ProfileStack` is
  // fully controlled and has no trigger, so its default landed focus on
  // `<body>`. And the element that opened the sheet (a `LinkView` inside the
  // parent record) is gone from the DOM by the time the sheet closes, so
  // "return to the opener" is not achievable. The rule implemented here:
  //   • records remain  → focus the now-active record's TAB button, i.e. the
  //     control that names where the user just landed;
  //   • stack empties   → focus the module surface underneath
  //     (`[data-slot="module-view-shell"]`, made programmatically focusable),
  //     or `restoreFocusRef` when the host supplies a better target.
  const tabButtons = useRef(new Map<string, HTMLButtonElement | null>())
  const pendingFocus = useRef(false)

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    const tab = activeId ? tabButtons.current.get(activeId) : null
    if (tab?.isConnected) {
      tab.focus()
      return
    }
    const fallback =
      restoreFocusRef?.current ??
      (typeof document === 'undefined'
        ? null
        : document.querySelector<HTMLElement>('[data-slot="module-view-shell"]'))
    if (!fallback) return
    if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1')
    fallback.focus()
  }, [items, activeId, restoreFocusRef])

  /**
   * Esc / overlay dismiss. Pops EXACTLY ONE record and really removes it —
   * previously this minimized, which collapsed the whole stack from view while
   * silently KEEPING every record, so the next unrelated record the user opened
   * came back with the "closed" ones still tabbed.
   */
  const dismiss = useCallback(() => {
    if (activeId) {
      pendingFocus.current = true
      onClose(activeId)
      return
    }
    onOpenChange(false)
  }, [activeId, onClose, onOpenChange])

  const closeRecord = useCallback(
    (id: string) => {
      pendingFocus.current = true
      onClose(id)
    },
    [onClose],
  )

  const closeEverything = useCallback(() => {
    pendingFocus.current = true
    if (onCloseAll) onCloseAll()
    else onOpenChange(false)
  }, [onCloseAll, onOpenChange])

  if (minimized && items.length > 0 && onRestore) {
    return (
      <div
        data-slot="profile-stack-restore-dock"
        className="fixed bottom-4 end-4 z-50 flex items-center"
      >
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-body-sm font-semibold text-card-foreground shadow-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
          {items.length === 1 ? '1 minimized record' : `${items.length} minimized records`}
        </button>
      </div>
    )
  }

  // Shared by both the modal (`Sheet`) and docked (`DockedPanel`) wrappers
  // below: the tab-strip chrome and body are identical in either mode — only
  // the outer surface (scrim'd Radix dialog vs. plain docked `<aside>`)
  // differs. This is what keeps linked-record STACKING working in docked
  // mode too, per the FAMS side-sheet contract — the same tabs, the same
  // activate/close wiring, just a different container around them.
  const stackChrome = (
    <>

      <div
        data-slot="profile-stack-chrome"
        // 48px tall, on `Surface/Minimal` with a `Border/Lightest` hairline —
        // all three re-measured off the tanker-detail frames (the bar reads
        // #f9fafb, i.e. `--color-muted`, not `bg-background`/white, and the
        // rule is #eaecf0 = `border-border`, not `border-gray-300`); the white
        // chip below is what reads as raised against it.
        className="flex h-12 shrink-0 items-stretch border-b border-border bg-muted"
      >
        <div className="flex items-center gap-2 px-4">
          {/* Flat, glyph-free traffic-light dots (figma-spec-detail.md §2:
              "plain flat solid circles, no inner glyph") — the accessible
              name lives on `aria-label` alone; a QA pixel-crop confirmed the
              Figma dots carry no baked-in ×/− icon at any zoom level. */}
          <button
            type="button"
            aria-label="Close all records"
            onClick={closeEverything}
            className="size-4 shrink-0 rounded-full bg-destructive transition-opacity hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => (onMinimize ? onMinimize() : onOpenChange(false))}
            className="size-4 shrink-0 rounded-full bg-warning transition-opacity hover:opacity-80"
          />
          {/* Expand/restore toggle — only in docked mode when the caller opts
              in via `onExpandedChange` (FAMS side-sheet contract: expand from
              bottom to full height). */}
          {docked && onExpandedChange ? (
            <button
              type="button"
              aria-label={expanded === false ? 'Expand to full height' : 'Restore'}
              onClick={() => onExpandedChange(expanded === false)}
              className="grid size-5 shrink-0 place-items-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded === false ? (
                <ChevronUp aria-hidden="true" className="size-3.5" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ) : null}
        </div>

        <div data-slot="profile-stack-tabs" className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {items.map((item) => {
            const active = item.id === activeId
            return (
              <div
                key={item.id}
                data-slot="profile-stack-tab"
                data-state={active ? 'active' : 'inactive'}
                className={cn(
                  // figma-spec-nav §4 "Browser-Style Record Tabs Row": every
                  // tab shares a 1px left+right border with its neighbors
                  // (`border-s` per tab + `last:border-e` closes the strip,
                  // same shared-border technique as `ModuleViewTabs`' navbar
                  // variant — never a doubled hairline between adjacent
                  // tabs). Selected = white (`bg-card`); unselected =
                  // transparent, the page bg showing through.
                  // Width bumped from an earlier 5.5rem: at 5.5rem the icon
                  // (1.5rem) + gap (0.5rem) + paddings + the close button
                  // (2rem) left only a couple of px for the label text, which
                  // rendered as unreadable single-glyph slivers instead of a
                  // truncated "TKT-04"-style id — 8rem leaves a real ~3.5rem
                  // for the label column so `truncate` can do its job.
                  // 156px per figma-spec-detail.md §1.2's stacked-tab spec
                  // (task-detail-29-42895 SPEC §1.2), up from an earlier
                  // 128px/148px which starved the two-line caption/title
                  // column and caused the module-name overline to truncate
                  // mid-word (QA round 2, P2-1).
                  'group flex w-[9.75rem] shrink-0 items-stretch border-s border-border last:border-e',
                  // The ACTIVE chip reads as a raised document tab: white,
                  // top-corner radius, and no bottom hairline of its own so it
                  // merges into the pane below (`-mb-px` covers the chrome
                  // bar's own `border-b`). Logical corner utilities, so the
                  // radius flips under `dir="rtl"`.
                  active
                    ? '-mb-px rounded-ss-sm rounded-se-sm border-b border-b-card bg-card'
                    : 'hover:bg-muted/60',
                )}
              >
                <button
                  type="button"
                  ref={(el) => {
                    if (el) tabButtons.current.set(item.id, el)
                    else tabButtons.current.delete(item.id)
                  }}
                  onClick={() => onActivate(item.id)}
                  title={typeof item.title === 'string' ? item.title : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2 ps-3 pe-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {item.icon ? (
                    <span aria-hidden className="flex size-5 shrink-0 items-center justify-center text-primary">
                      {item.icon}
                    </span>
                  ) : (
                    <Avatar src={item.avatarSrc} name={typeof item.title === 'string' ? item.title : undefined} size="xs" />
                  )}
                  <span className="flex min-w-0 flex-col justify-center leading-tight">
                    {item.category ? (
                      // "Asset"-style overline: `Lighter` #98a2b3 unselected,
                      // `Light` #667085 selected — stays muted even active
                      // (figma-spec-nav §4). SPEC §1.2 calls this 8px/60%-
                      // opacity/tracked-uppercase; `text-caption` (12px) is
                      // kept as the platform's accessibility-minimum font
                      // size (Shaheer T-072 decision #2 — never go below
                      // 12px), with uppercase + wide tracking + 60% opacity
                      // as the closest parity fix (QA round 2, P2-1).
                      <span
                        className={cn(
                          'truncate text-caption font-semibold uppercase tracking-wide opacity-60',
                          active ? 'text-muted-foreground' : 'text-gray-400',
                        )}
                      >
                        {item.category}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'truncate text-body-xs font-semibold',
                        active ? 'text-card-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 items-center pe-2">
                  <button
                    type="button"
                    aria-label={`Close ${typeof item.title === 'string' ? item.title : 'record'}`}
                    onClick={() => closeRecord(item.id)}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span aria-hidden="true" className="text-caption leading-none">
                      ×
                    </span>
                  </button>
                </span>
              </div>
            )
          })}
        </div>

        {onAddRecord ? (
          <button
            type="button"
            onClick={onAddRecord}
            aria-label={addRecordLabel}
            className="flex w-11 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="text-body-lg leading-none">
              +
            </span>
          </button>
        ) : null}
      </div>

      {/* `overflow-hidden`, not `overflow-auto`: the frames scroll the profile's
          CONTENT PANE internally while the identity rail stays put. With a
          scrolling wrapper here the whole two-pane body scrolled as one block
          and the rail (plus the tab strip) slid out of view — the panes own
          their own scrollports (`EntityProfile`'s rail + `TabsContent`), so
          this one must not compete with them. */}
      <div data-slot="profile-stack-body" className="min-h-0 flex-1 overflow-hidden bg-card">
        {activeItem ? renderProfile(activeItem) : null}
      </div>
    </>
  )

  if (docked) {
    // No scrim, no focus trap, no overlay-click-to-close (AC-2.1's "do not
    // build a click-away dismiss" ruling) — `DockedPanel` gives Escape for
    // free, wired to the same one-record `dismiss()` as the modal branch
    // below, so Escape pops exactly one stacked record in docked mode too.
    return (
      <DockedPanel
        data-slot="profile-stack"
        aria-label={typeof activeTitle === 'string' ? activeTitle : 'Record details'}
        open={open}
        onClose={dismiss}
        width={dockedWidth}
        expanded={expanded}
        className={cn('gap-0 rounded-tl-sm p-0', className)}
      >
        {stackChrome}
      </DockedPanel>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          dismiss()
          return
        }
        onOpenChange(next)
      }}
    >
      <SheetContent
        side="right"
        hideClose
        data-slot="profile-stack"
        // We own focus restoration (see the effect above); Radix's default
        // would race it and land on `<body>`.
        onCloseAutoFocus={(event) => event.preventDefault()}
        overlayClassName={SCRIM_CLASS}
        // `rounded-ss-sm`, not `rounded-tl-sm`: the frame rounds the sheet's
        // top-START corner, which is the top-RIGHT one under `dir="rtl"`
        // (root CLAUDE.md rule 4 — logical properties only).
        className={cn('gap-0 rounded-ss-sm p-0', WIDTH_CLASS[width], className)}
      >
        <SheetTitle className="sr-only">{activeTitle}</SheetTitle>
        <SheetDescription className="sr-only">Stacked record profiles</SheetDescription>
        {stackChrome}
      </SheetContent>
    </Sheet>
  )
}

ProfileStack.displayName = 'ProfileStack'
