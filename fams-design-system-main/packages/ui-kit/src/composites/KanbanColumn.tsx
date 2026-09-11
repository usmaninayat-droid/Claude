import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { cn } from '../lib/cn'
import { CountChip, tintFromAccent } from './CountChip'
import { KanbanColumnIdContext, useKanbanBoardContext } from './kanban-context'
import {
  KanbanDragMessage,
  dragPaintClasses,
  dragPaintStyle,
  resolveDragState,
} from './kanban-drag-paint'

/**
 * KanbanColumn — the stage lane: header (title, count, caller `headerEnd`),
 * an internally-scrolling card body, a rule-gated drop target, pinning, and
 * the pre-emptive drag-validity painting. Split out of `Kanban.tsx` per the
 * ~300-line soft budget (root CLAUDE.md rule 12); see that file for the
 * family docblock and `kanban-drag-paint.tsx` for the painting rules.
 */

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Drop-target id — must match one entry in the parent `KanbanBoard`'s `columns`. */
  id: string
  title: ReactNode
  /** Card count shown next to the title. Omit to hide the count badge. */
  count?: number
  /**
   * Rule-aware drop gating, decided by the caller (e.g. "this lane can't
   * receive the card currently being dragged"). `false` disables the lane as
   * a drop target, dims it, and excludes it from every card's "Move to…"
   * menu. Default `true`.
   */
  canDrop?: boolean
  /**
   * CARD-AWARE rule gating: `canDropCard(cardId)` answers "may THIS card land
   * here?", the question `canDrop`'s whole-column boolean cannot. Supplying it
   * is what turns a caller's rule engine into BOTH consumers of one predicate:
   * this column paints its pre-emptive drag validity from it (tint + stroke +
   * `validDropLabel`, or `invalidDropMessage`), and every card's keyboard
   * "Move to…" menu reads the very same function off the board registry to
   * decide which columns it offers. Omit for no per-card gating.
   */
  canDropCard?: (cardId: string) => boolean
  /**
   * Marks this lane as part of the pinned group. Pinned lanes are hoisted to
   * the start of the board by the CALLER (it owns column order) — this prop is
   * ONLY the resulting presentation (a permanently-revealed, active pin
   * control), never a change of scroll behaviour.
   *
   * Deliberately NOT sticky. Figma "Pin Column" Dev Note `33534:44658`:
   * "Horizontal scrolling will be applied to all columns together. There will
   * be no separate behavior where pinned columns remain fixed while the
   * remaining columns scroll. All columns will scroll at once. This is to
   * prevent multiple scrollbars in smaller viewports." Pinning therefore
   * REORDERS only; the board keeps exactly one horizontal scroller. Default
   * `false`.
   */
  pinned?: boolean
  /**
   * Draws a vertical rule on the lane's inline-end edge — the caller marks the
   * LAST pinned lane with it to separate the pinned group from the unpinned
   * remainder. Default `false`.
   */
  pinnedSeparator?: boolean
  /**
   * Copy for the centred pill painted on this lane while it is a VALID target
   * for the card in flight — the caller names the transition (it owns the
   * vocabulary). Omit to paint the tint + stroke with no pill.
   */
  validDropLabel?: ReactNode
  /**
   * Copy for the centred, non-blocking refusal message painted on this lane
   * while it is an INVALID target for the card in flight. Decoration only
   * (`aria-hidden`) — the caller announces the denial once, on the terminal
   * event. Omit to paint the near-white body with no message.
   */
  invalidDropMessage?: ReactNode
  /**
   * Runtime accent color (e.g. a per-tenant pipeline stage's configured
   * color) applied as a 3px top border on the column header — never a
   * hardcoded value. This is genuine per-tenant RUNTIME DATA threaded through
   * at render time (like `ReadColor`'s swatch), not a literal color in
   * component source, so it is not a token-lint violation (`docs/history/
   * PORT-LEDGER.md` § policy 1) — the same reasoning already applied to
   * `@fams/v5-templates`' `KanbanColumnView` stage-color dot this prop
   * replaces. Omit for no accent.
   */
  accentColor?: string
  /**
   * Whether the column body derives a light background tint from
   * `accentColor` (`tintFromAccent`, above). Default `true` — unchanged
   * behavior for every existing caller. Some references (figma-spec-
   * kanban.md §6, "Incident Reporting" kanban) show a flat, untinted column
   * body — the page/module background shows through in the gaps between
   * cards — so a caller composing for that surface passes `false` rather
   * than this mechanism being removed outright (it's genuine, documented,
   * per-tenant runtime-data behavior other consumers may still want).
   */
  tintBody?: boolean
  /**
   * Right-aligned, static trailing content in the column header (e.g. a
   * `pin-01` glyph, figma-spec-kanban.md §5.1) — a generic slot so the DS
   * carries no opinion on what it renders; the caller supplies its own icon.
   */
  headerEnd?: ReactNode
  /**
   * Muted in-column line shown when the lane holds no cards — UX note J.58:
   * "an empty *stage* renders the column with its header, its `0` count chip,
   * and a short muted in-column line … plus it remains a valid drop target".
   * Rendered INSIDE the body (so the lane keeps its drop target) but OUTSIDE
   * `children`, so it never counts as a card in the drop payload. The caller
   * owns the copy (Rule 10). Omit for a silently empty lane.
   */
  emptyMessage?: ReactNode
  /**
   * Heading level for the lane's title, so a lens's heading outline is correct
   * and sequential (UX K.68: stage names are `h3` under the lens's own `h2`).
   * Omit for a non-heading `span` — the pre-existing behaviour, kept for
   * callers whose surface has no heading outline to slot into.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /**
   * Screen-reader text for the lane's card count — e.g. `"18 tasks"`. The
   * visible `CountChip` is a bare numeral, which reads as a meaningless "18"
   * out of context, so when this is given it becomes part of the lane's
   * accessible name ("Assigned, 18 tasks") and the chip itself is hidden from
   * AT. The caller owns the noun (Rule 10). Omit and the count is visual-only.
   */
  countLabel?: string
  children?: ReactNode
}

export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  (
    {
      className,
      id,
      title,
      count,
      canDrop = true,
      canDropCard,
      pinned = false,
      pinnedSeparator = false,
      validDropLabel,
      invalidDropMessage,
      accentColor,
      tintBody = true,
      headerEnd,
      emptyMessage,
      headingLevel,
      countLabel,
      children,
      ...props
    },
    ref,
  ) => {
    const boardCtx = useKanbanBoardContext()
    const titleId = useId()
    const countId = useId()
    // A lane is a labelled GROUP of cards, not an unnamed `div`: without this a
    // screen-reader user hears 179 cards in one undifferentiated stream and
    // never learns which stage any of them is in (UX K.69). The name is
    // composed from the same two things a sighted user reads — the stage title
    // and its count — rather than a second, invented string that could drift.
    const Title = headingLevel ? (`h${headingLevel}` as 'h3') : 'span'
    const bodyRef = useRef<HTMLDivElement>(null)
    const [isOver, setIsOver] = useState(false)
    const cardCount = Children.count(children)
    const dragState = resolveDragState(id, boardCtx?.activeDrag ?? null, canDrop, canDropCard)

    // Whether THIS lane refuses the card currently in flight, kept in a ref so
    // the drop target's `getData` reads the live value without the drop target
    // being torn down and re-registered mid-drag (which would lose the drag's
    // own target tracking). Written on every render, read only during a drag.
    //
    // This is the seam that closes UX F.35 / L.74: a refusing lane stays a
    // real drop target and reports itself as BLOCKED, instead of silently not
    // being a target at all — which left the board with an empty drop-target
    // list, indistinguishable from a drop into empty space, and narrated as
    // the optimistic `Dropped <card>.`. A lane the user aimed at can now be
    // named in the refusal.
    const blockedRef = useRef(false)
    blockedRef.current = !canDrop || dragState === 'invalid'

    // The lane's OUTER element is a drop target too, so the 42px header (and
    // any padding outside the scrolling body) belongs to the lane the user
    // sees rather than to "nowhere". Nested drop targets are reported
    // innermost-first, so the body still wins whenever the pointer is in it.
    const outerRef = useRef<HTMLDivElement | null>(null)
    const setOuterRef = useCallback(
      (node: HTMLDivElement | null) => {
        outerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node
      },
      [ref],
    )

    // Deliberately depend on the STABLE `registerColumn`/`unregisterColumn`
    // functions (each `useCallback([])`-memoized in `useKanbanColumnRegistry`,
    // never changing identity) rather than the whole `boardCtx` object —
    // `boardCtx` itself gets a new identity on every register/unregister
    // (the version-bump re-render that lets "Move to…" menus see fresh
    // registry content), so depending on it here would re-run this effect
    // every time ANY column (un)registers, which unregisters + re-registers
    // this column too, bumping the version again — an infinite update loop.
    useEffect(() => {
      boardCtx?.registerColumn(id, { title, canDrop, canDropCard, count: cardCount })
      return () => boardCtx?.unregisterColumn(id)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardCtx?.registerColumn, boardCtx?.unregisterColumn, id, title, canDrop, canDropCard, cardCount])

    useEffect(() => {
      const el = bodyRef.current
      const outer = outerRef.current
      if (!el || !outer) return
      // `canDrop: () => true` on purpose. A lane that refuses the card must
      // still RECEIVE the drop event — it reports `blocked` in its data and
      // the board turns that into a spoken refusal naming this lane. Opting
      // out of being a target instead is what made a refusal indistinguishable
      // from a drop into empty space (UX F.35 / L.74); nothing is committed
      // either way, since `resolveCardDropOutcome` never turns a blocked
      // target into a move.
      const getData = () => ({
        type: 'column' as const,
        columnId: id,
        count: cardCount,
        blocked: blockedRef.current,
      })
      return combine(
        dropTargetForElements({
          element: el,
          getData,
          onDragEnter: () => setIsOver(true),
          onDragLeave: () => setIsOver(false),
          onDrop: () => setIsOver(false),
        }),
        dropTargetForElements({ element: outer, getData }),
      )
    }, [id, cardCount])

    return (
      <div
        ref={setOuterRef}
        data-slot="kanban-column"
        data-pinned={pinned || undefined}
        data-drag-state={dragState ?? undefined}
        aria-disabled={!canDrop || undefined}
        role="group"
        aria-labelledby={countLabel ? `${titleId} ${countId}` : titleId}
        className={cn(
          // 320px per figma-spec-kanban.md §2 ("Column outer pitch: 320px
          // per column") — Tailwind's `w-80` (20rem) scale step lands on
          // this exactly, no arbitrary value needed (supersedes the earlier
          // 300px estimate from an older export).
          // `group/kanban-column` is the named hover/focus group a caller's
          // `headerEnd` control uses to reveal itself on lane hover (e.g. a
          // hover-revealed pin toggle) — the column owns the group because it
          // owns the hover surface.
          // `min-h-0` is what lets the lane be SHORTER than its cards: without
          // it a flex item's automatic minimum size is its content, so the
          // body's `overflow-y-auto` had nothing to scroll and the lane grew to
          // the full card stack (UX notes B.9/B.10). Paired with the board's
          // `items-stretch`, the lane takes the board's height and the body
          // becomes the per-column scroller.
          // `relative` is LOAD-BEARING, not decoration. Tailwind's `sr-only`
          // is `position: absolute`, so an sr-only descendant (this lane's
          // `countLabel`, a caller's `headerEnd` label, a card's own sr-only
          // text) resolves its containing block to the nearest POSITIONED
          // ancestor. With every lane and the board scroller `static`, that
          // was the initial containing block — the html element — so the
          // board's `overflow-x-auto` never clipped those spans (an overflow
          // ancestor only clips a descendant it is a containing block for).
          // The spans then sat at the board's CONTENT x-coordinates and
          // extended `documentElement.scrollWidth` to the last lane's origin,
          // giving the whole PAGE a horizontal scrollbar at every viewport
          // width. Making the lane a containing block puts them back inside
          // its own `overflow-hidden`, where they are clipped to nothing.
          'group/kanban-column relative flex w-80 min-h-0 shrink-0 flex-col overflow-hidden rounded-md transition-opacity',
          !canDrop && 'opacity-40',
          // `pinned` paints NOTHING on the lane box itself: Dev Note
          // `33534:44658` forbids the frozen-column behaviour an earlier
          // `sticky start-0` here implemented, because a second, independently
          // scrolling region means two horizontal scrollbars at narrow
          // viewports. The pinned group is expressed purely by ORDER (the
          // caller hoists it) plus the separator rule below.
          pinnedSeparator && 'border-e-2 border-primary',
          className,
        )}
        // figma-spec-kanban.md §2: "2–3px" top accent (visual estimate, no
        // exact source data) — 3px, the midpoint.
        style={accentColor ? { borderTop: `3px solid ${accentColor}` } : undefined}
        {...props}
      >
        <div
          className={cn(
            // 42px header height (figma-spec-kanban.md §2) — no spacing
            // token covers this exact height, so a `rem` arbitrary value is
            // used (token-lint only flags `px` arbitrary values; `rem`
            // brackets are the established escape hatch, e.g. the width
            // comment above / DropdownMenu's `min-w-[8rem]`). Horizontal
            // padding matches the body's own 8px inset (`p-2` below).
            'flex h-[2.625rem] shrink-0 items-center gap-2 border-b border-border bg-card px-2',
          )}
        >
          <Title id={titleId} className="text-body-sm font-semibold text-foreground">
            {title}
          </Title>
          {typeof count === 'number' ? (
            <>
              {/* fix7 (P1-1): the count no longer tints from `accentColor` —
                  see `CountChip`'s own docblock for the contrast finding and
                  the deliberate "count is not a status" judgment call. */}
              <CountChip aria-hidden={countLabel ? true : undefined}>
                {count}
              </CountChip>
              {countLabel ? (
                <span id={countId} className="sr-only">
                  {countLabel}
                </span>
              ) : null}
            </>
          ) : null}
          {headerEnd ? (
            <span data-slot="kanban-column-header-end" className="ms-auto flex shrink-0 items-center text-muted-foreground">
              {headerEnd}
            </span>
          ) : null}
        </div>
        <div
          ref={bodyRef}
          data-slot="kanban-column-body"
          className={cn(
            // `min-h-0` for the same reason as the lane above: this is the
            // per-column vertical scroller, so it must be allowed to be
            // shorter than the cards inside it. The RESTING tint/inset/card-
            // gap moved to `kanban-column-body-content` below (fix7, P1-C) —
            // this scroller itself stays visually neutral at rest so a short
            // lane's empty scroll space below the last card never paints a
            // coloured slab. In-flight drag painting (`dragPaintClasses`/
            // `dragPaintStyle`, the `isOver` hover ring) is DELIBERATELY kept
            // here, full-height: those indicate "this whole lane is a drop
            // target", a different visual job from the resting stage tint.
            'flex min-h-0 flex-1 flex-col overflow-y-auto',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block',
            isOver && canDrop && !dragState && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
            dragPaintClasses(dragState),
          )}
          style={dragState ? dragPaintStyle(dragState, accentColor) : undefined}
        >
          {dragState ? (
            <KanbanDragMessage
              state={dragState}
              validDropLabel={validDropLabel}
              invalidDropMessage={invalidDropMessage}
              accentColor={accentColor}
            />
          ) : null}
          <div
            data-slot="kanban-column-body-content"
            className={cn(
              // 8px body inset (figma-spec-kanban.md §2: "Column content is
              // inset 8px on each side") + 16px card gap ("Card gap… 16px") —
              // `p-2`/`gap-4` land exactly on both. Deliberately NOT `flex-1`:
              // this wrapper sizes to its OWN content (cards + empty message),
              // never stretching to fill the lane's remaining scroll height —
              // that stretch is exactly what made a short lane's tint paint a
              // large empty coloured block below its last card (P1-C).
              'flex flex-col gap-4 p-2',
              tintBody && !accentColor && !dragState && 'bg-muted/40',
            )}
            style={tintBody && accentColor && !dragState && !isOver ? { backgroundColor: tintFromAccent(accentColor) } : undefined}
          >
            <KanbanColumnIdContext.Provider value={id}>{children}</KanbanColumnIdContext.Provider>
            {cardCount === 0 && emptyMessage ? (
              <p data-slot="kanban-column-empty" className="px-1 py-2 text-body-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  },
)
KanbanColumn.displayName = 'KanbanColumn'
