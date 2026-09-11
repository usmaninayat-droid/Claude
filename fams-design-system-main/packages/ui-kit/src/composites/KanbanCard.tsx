import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview'
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { cn } from '../lib/cn'
import { ROW_AFFORDANCE_GROUP, ROW_AFFORDANCE_SURFACE } from './row-affordance'
import { Avatar } from '../primitives/Avatar'
import { kanbanNodeLabel, useKanbanBoardContext, useKanbanColumnId } from './kanban-context'
import { KanbanCardGhost, KanbanCardPlaceholder } from './KanbanCardGhost'
import { KanbanCardMoveMenu } from './KanbanCardMoveMenu'
import { useKanbanCardMoveTargets } from './use-kanban-card-move-targets'

/**
 * KanbanCard — see `Kanban.tsx` for the family docblock (board/column/card
 * split out of one file per the ~300-line soft budget, root CLAUDE.md rule
 * 12). Draggable via `@atlaskit/pragmatic-drag-and-drop`'s `draggable()` +
 * `dropTargetForElements()` (the latter with `pragmatic-drag-and-drop-
 * hitbox`'s closest-edge detection, so hovering a card reorders relative to
 * it rather than only accepting drops on the column's empty space) and
 * keyboard/screen-reader accessible via a "Move to…" menu built from
 * `KanbanBoard`'s column registry (`kanban-context.ts`) — pragmatic-dnd ships
 * no built-in keyboard DnD, so this menu is the a11y-parity fallback.
 */

export type KanbanTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'
export type KanbanCardSize = 'compact' | 'default' | 'wide'

export interface KanbanCardAvatar {
  name: string
  src?: string
}

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'title'> {
  /** Draggable id — must be unique across the whole board. */
  id: string
  /**
   * Position within its column. Used to translate a drag into the board's
   * `onCardMove(cardId, fromColumnId, toColumnId, toIndex)` contract and to
   * detect a same-slot no-op drop.
   */
  index: number
  title: ReactNode
  /**
   * Chip row above the title — content is app-owned (e.g. `Badge` instances).
   * Put `ms-auto` on the last item to pin it to the far end of the row, same
   * as any flex layout — no separate "trailing badge" prop needed.
   */
  badges?: ReactNode
  /** Render slot for label/value rows (due date, reference, location, …) — content is app-owned. */
  metadataFields?: ReactNode
  /**
   * Cover thumbnail, rendered as the card's FIRST content row — above
   * `badges` (kanban spec §1.2's card anatomy, top → bottom). Omit it for an
   * image-off display mode; there is deliberately no second card component.
   */
  coverImage?: string
  /** Accessible alt text for `coverImage` — required whenever `coverImage` is set. */
  coverImageAlt?: string
  /** Free-form slot below the metadata rows — e.g. a `size="sm"` `LiveDurationCard`. */
  extra?: ReactNode
  /** Overlapping avatar stack. Omit to hide. */
  avatars?: KanbanCardAvatar[]
  /**
   * Caps how many `avatars` render before collapsing the rest into a
   * trailing "+N" overflow chip (figma-spec-kanban.md §3's assignee
   * overflow counter) — a generic overlapping-stack affordance, not
   * business logic. Omit for no cap (every avatar renders).
   */
  maxAvatars?: number
  /** Trailing footer content, app-owned (e.g. a due date). Renders alongside `avatars` in a bordered footer row — the row itself only appears when at least one of the two is present. */
  footerEnd?: ReactNode
  /** Closed semantic tone, resolved to a status-token top accent. Defaults to no accent. */
  tone?: KanbanTone
  /**
   * Runtime accent color (e.g. a blueprint-configured per-record highlight
   * flag — figma-spec-kanban.md §6's full-border card-highlight state)
   * applied as the card's own border color, replacing the default
   * `border-border` perimeter — never a hardcoded value, same
   * genuine-runtime-data precedent as `KanbanColumn.accentColor`/
   * `StatusPill.color`. This is a generic "this card is flagged" visual —
   * the DS carries no concept of WHY a card is highlighted (that's the
   * blueprint/record's business meaning, e.g. `uiConfig.kanbanCard.highlight`
   * in `@fams/v5-composer`). Omit for the plain default border.
   */
  highlightColor?: string
  /** Padding/gap density. Defaults to `'default'`. */
  size?: KanbanCardSize
  /** Selected-state ring — e.g. a keyboard-focused or multi-selected card. */
  selected?: boolean
  /**
   * Label for the keyboard-accessible "Move to…" menu — the a11y fallback
   * for pointer-drag reordering (pragmatic-drag-and-drop ships no built-in
   * keyboard DnD). Defaults to `'Move to column'` — ui-kit is core-tier, so
   * a v5-tier caller composing pipeline vocabulary may override with e.g.
   * `'Move to stage'`.
   */
  moveMenuLabel?: string
  /**
   * CONDENSED content for the drag ghost — the elevated copy of this card that
   * follows the cursor while it is in flight. The caller decides what survives
   * the condense (a reference chip, a priority chip, the title, the meta rows
   * and the footer, but not a long description), because only the caller knows
   * which of its own slots are essential. Omit and the ghost shows `title`
   * alone. The origin slot is left as a tinted placeholder at this card's exact
   * height either way — the condense can never reflow the column.
   */
  dragGhost?: ReactNode
  /**
   * Leading multi-select control (a `Checkbox`) rendered at the start of the
   * card's badge row. Supplying it makes the card selectable; the caller owns
   * the selection set, so a board's selection can be ONE flat set spanning
   * every column (UX note G.45) rather than per-column state living here.
   * Omit for a non-selectable card (default, unaffected).
   */
  selectionControl?: ReactNode
  /**
   * Per-card options control — the hover-revealed `…` menu (Figma Dev Note
   * `33534:32263`), rendered next to the built-in "Move to…" trigger. Whatever
   * is passed owns its own reveal classes, which hook onto the shared row/card
   * affordance group this card carries (`composites/row-affordance.ts`). Omit
   * for no options control (default, unaffected).
   */
  actions?: ReactNode
  /**
   * Opts the card into the shared hover-affordance recipe — background AND
   * border colour change on hover, mirrored on `focus-within`, held while a
   * child menu is open (`composites/row-affordance.ts`). Defaults ON whenever
   * `actions` is supplied (that control is what the hover reveals).
   */
  hasHoverAffordance?: boolean
}

/** `neutral` adds nothing — the shell's base `border border-border` (above)
 *  already gives every card a plain 1px perimeter. Any other tone swaps just
 *  the top edge for a 4px status-token accent — never a raw hex. */
const TONE_ACCENT_CLASSES: Record<KanbanTone, string> = {
  neutral: '',
  primary: 'border-t-4 border-t-primary',
  info: 'border-t-4 border-t-info',
  success: 'border-t-4 border-t-success',
  warning: 'border-t-4 border-t-warning',
  danger: 'border-t-4 border-t-destructive',
}

const SIZE_CLASSES: Record<KanbanCardSize, string> = {
  compact: 'gap-2 p-3',
  default: 'gap-3 p-4',
  wide: 'gap-4 p-5',
}

const TITLE_SIZE_CLASSES: Record<KanbanCardSize, string> = {
  compact: 'text-body-sm',
  default: 'text-body-md',
  wide: 'text-body-md',
}

const COVER_HEIGHT_CLASSES: Record<KanbanCardSize, string> = {
  compact: 'h-24',
  default: 'h-32',
  wide: 'h-40',
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  (
    {
      className,
      id,
      index,
      title,
      badges,
      metadataFields,
      coverImage,
      coverImageAlt,
      extra,
      avatars,
      maxAvatars,
      footerEnd,
      tone = 'neutral',
      highlightColor,
      size = 'default',
      selected,
      moveMenuLabel = 'Move to column',
      dragGhost,
      selectionControl,
      actions,
      hasHoverAffordance,
      style,
      onClick,
      ...rest
    },
    ref,
  ) => {
    const elementRef = useRef<HTMLDivElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    // The source card's own width, captured at drag start so the ghost matches
    // the lane it left rather than guessing a size.
    const [ghostWidth, setGhostWidth] = useState(0)
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
    const boardCtx = useKanbanBoardContext()
    const fromColumnId = useKanbanColumnId()
    const label = kanbanNodeLabel(title, id)

    // The keyboard "Move to…" menu's enabled set — and, per-target, the exact
    // commit + announce behavior a pick from it performs. `useKanbanCardMoveTargets`
    // reads `canDropCard`, the CALLER's rule predicate, straight off the board
    // registry — the very same function each column paints its pointer-drag
    // validity from, so the menu and the drag can never disagree about which
    // lanes are reachable. Shared (not inlined) so an external `actions` menu
    // (see the `moveTargets.length > 0 && !actions` render below) can offer the
    // identical move path — see that hook's docblock for why.
    const moveTargets = useKanbanCardMoveTargets(id, label)
    // A card with NOWHERE to go must not be draggable at all — mouse and
    // keyboard must agree on which cards can move (fix7, run-2026-09-05:
    // JO-1009/1010/1011/1012's terminal lanes left every card `draggable`
    // with an empty "Move to…" menu, so a mouse could still drag them while a
    // keyboard could not move them anywhere — the two paths disagreed).
    const canMove = moveTargets.length > 0

    useEffect(() => {
      const el = elementRef.current
      if (!el) return
      return combine(
        ...(canMove
          ? [
              draggable({
                element: el,
                getInitialData: () => ({
                  type: 'card' as const,
                  cardId: id,
                  fromColumnId: fromColumnId ?? '',
                  index,
                  // Published so the BOARD can name this card in the one
                  // outcome-aware announcement it makes on drop (see `Kanban.tsx`'s
                  // monitor `onDrop`). The card cannot make that announcement
                  // itself: pragmatic-dnd dispatches the drop to the source BEFORE
                  // the monitors, so at this point in the lifecycle the card does
                  // not yet know whether `onCardMove` will commit or refuse.
                  cardLabel: label,
                }),
                // The platform's own drag image is suppressed so the React ghost
                // below (a CONDENSED card that follows the cursor, per the design's
                // drag-ghost rule) is the only thing the user sees in flight.
                onGenerateDragPreview: ({ nativeSetDragImage }) => disableNativeDragPreview({ nativeSetDragImage }),
                onDragStart: () => {
                  setGhostWidth(el.getBoundingClientRect().width)
                  setIsDragging(true)
                  announce(`Picked up ${label}.`)
                },
                // NO announcement here. This fires BEFORE the board's monitor has
                // run `onCardMove`, so anything said here is said without knowing
                // the outcome — which is exactly how a REFUSED move came to be
                // narrated as `Dropped <card>.`, an optimistic success for a card
                // that never moved. The drop is announced once, authoritatively,
                // by the board (`Kanban.tsx`), after the outcome is known.
                onDrop: () => {
                  setIsDragging(false)
                },
              }),
            ]
          : []),
        dropTargetForElements({
          element: el,
          getData: ({ input }) =>
            attachClosestEdge(
              { type: 'card' as const, cardId: id, fromColumnId: fromColumnId ?? '', index },
              { element: el, input, allowedEdges: ['top', 'bottom'] },
            ),
          canDrop: ({ source }) => {
            if (source.data.type !== 'card' || source.data.cardId === id) return false
            const ownColumn = fromColumnId ? boardCtx?.registry.get(fromColumnId) : undefined
            return ownColumn?.canDrop !== false
          },
          onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
          onDragLeave: () => setClosestEdge(null),
          onDrop: () => setClosestEdge(null),
        }),
      )
      // Depend on `boardCtx?.registry` (the registry `Map`, mutated in place
      // and NEVER replaced — see `kanban-context.ts`), not the whole
      // `boardCtx` object, which gets a new identity on every column
      // register/unregister. Depending on the whole object here would
      // re-attach draggable()/dropTargetForElements() on every OTHER
      // column's mount/unmount for no reason; the registry read inside
      // `canDrop` always sees live data regardless, since the Map itself
      // never changes identity. `canMove` (derived from `moveTargets`, itself
      // derived from the same registry) governs whether `draggable()` is even
      // attached, so it must retrigger this effect too.
    }, [id, index, fromColumnId, label, boardCtx?.registry, canMove])

    // "+N" overflow (figma-spec-kanban.md §3): when `avatars` exceeds
    // `maxAvatars`, render `maxAvatars - 1` real avatars plus one overflow
    // chip counting the rest — so the cap always shows exactly `maxAvatars`
    // slots total, never `maxAvatars` avatars PLUS an extra overflow circle.
    const hasCap = typeof maxAvatars === 'number' && maxAvatars > 0
    const overflowCount = hasCap && avatars && avatars.length > maxAvatars ? avatars.length - (maxAvatars - 1) : 0
    const visibleAvatars = overflowCount > 0 ? avatars!.slice(0, maxAvatars! - 1) : avatars

    const mergedStyle: CSSProperties | undefined = highlightColor ? { ...style, borderColor: highlightColor } : style
    const hoverAffordance = hasHoverAffordance ?? Boolean(actions)

    // `onClick` below is a MOUSE+bubble target, not the keyboard entry point: the
    // `kanban-card-open` `<button>` rendered inside IS the real keyboard control
    // (native focus + native Enter/Space activation), a SIBLING whose own click —
    // real or keyboard-synthesized — bubbles up to this exact handler. Giving
    // this outer `<div>` its own `role`/`tabIndex` instead (what these jsx-a11y
    // rules otherwise want) would nest a second interactive element around the
    // checkbox/move-trigger/`actions` controls it contains, which is exactly
    // what axe-core's `nested-interactive` rule flags — see that button's own
    // docblock below. The axe sweep (`a11y.axe.test.tsx`) exercises this fixture
    // with `onClick` set and is green, confirming the real accessibility contract
    // holds even though these static rules can't see the sibling relationship.
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        ref={(node) => {
          elementRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node
        }}
        data-slot="kanban-card"
        data-dragging={isDragging || undefined}
        data-highlighted={highlightColor ? true : undefined}
        className={cn(
          // figma-spec-kanban.md §5.3/§8: the card shell always carries a
          // full 1px `Border/Lightest` perimeter, on every side, regardless
          // of `tone` — and the reference is flat (no resting shadow;
          // borders alone do the separation work). `TONE_ACCENT_CLASSES`
          // then overrides just the TOP edge (width + color) for a
          // non-neutral tone's 4px status accent; the base `border
          // border-border` below still supplies the other three sides.
          // `highlightColor` (figma-spec-kanban.md §6's full-border
          // card-highlight state, "1–2px solid" per the spec's own visual
          // estimate) bumps the whole perimeter to `border-2` and its color
          // is applied via `mergedStyle.borderColor` below — genuine runtime
          // data, not a lint violation (see `highlightColor`'s own JSDoc).
          'relative flex flex-col rounded-md border border-border bg-card text-start outline-none transition-shadow',
          highlightColor && 'border-2',
          'focus-visible:ring-2 focus-visible:ring-ring',
          // Re-themes the `<DropIndicator>` rendered below onto FAMS tokens.
          // That component takes no color prop at all (only
          // `appearance: 'default' | 'warning'`); its `Line` internals read
          // the stroke color from the Atlassian design token custom property
          // `--ds-border-selected` (`presets.js`: `var(--ds-border-selected,
          // …)`, an Atlassian blue fallback) and the stroke width from
          // `--ds-border-width-selected`. Both are plain inherited CSS custom
          // properties, so defining them here — on the card, the indicator's
          // own ancestor — is the library's supported theming seam and makes
          // the indicator use the primary token instead of Atlassian blue.
          // Never restate the library's fallback hex; only point the property
          // at a FAMS token. Width is deliberately left on the library's own
          // default — `@fams/tokens` carries no border-width token to point
          // `--ds-border-width-selected` at, and inventing one for a
          // dependency's indicator isn't a design decision to make here.
          '[--ds-border-selected:var(--color-primary)]',
          TONE_ACCENT_CLASSES[tone],
          SIZE_CLASSES[size],
          // The ONE shared row/card hover recipe — identical to the one
          // `DataTable` rows use, because the designer wrote a single rule for
          // list rows, hybrid cards and kanban cards (`row-affordance.ts`).
          hoverAffordance && ROW_AFFORDANCE_GROUP,
          hoverAffordance && ROW_AFFORDANCE_SURFACE,
          selected && 'ring-2 ring-primary',
          // In flight the real card is hidden with `visibility` (NOT unmounted
          // and NOT `display:none`) so its box — and therefore the column's
          // scroll height — is unchanged for the whole drag; the tinted
          // placeholder is layered over it and the elevated ghost is portaled
          // out to follow the cursor.
          isDragging && '[&>*:not([data-slot="kanban-card-placeholder"])]:invisible',
          className,
        )}
        style={mergedStyle}
        onClick={onClick}
        {...rest}
      >
        {/* The whole-card KEYBOARD "open" control (Rule 5 — accessible by
            construction, not bolted on). Only rendered when the caller wired
            an `onClick` (unchanged behavior otherwise). Carries NO click
            handler of its own — it is a real `<button>` purely so Tab reaches
            it and Enter/Space activation is native (never a hand-rolled
            keydown handler — root CLAUDE.md's "never reinvent an accessible
            primitive"); its own click, real or synthesized by the browser's
            default Enter/Space action, simply BUBBLES to the root `<div>`
            above, which still owns the actual `onClick` — same single
            handler, same `handleClick` guards in `KanbanCardView`
            (menu/checkbox ancestry), mouse or keyboard, unchanged.
            It is a SIBLING of the checkbox/move-trigger/`actions` below,
            never their ancestor: nesting real interactive controls inside a
            `role="button"` card root is exactly what axe-core's
            `nested-interactive` rule flags, so this button instead stretches
            `absolute inset-0` under everything (CSS paints a positioned box
            above static in-flow content by default, so it transparently
            catches a click anywhere the card has no other control) while
            those three controls each carry `relative` below to stay on top
            and independently clickable — otherwise the overlay would swallow
            their clicks instead of bubbling to the intended control. */}
        {onClick ? (
          <button
            type="button"
            data-slot="kanban-card-open"
            aria-label={label}
            className="absolute inset-0 z-0 rounded-md bg-transparent p-0 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : null}
        {isDragging ? <KanbanCardPlaceholder /> : null}
        {isDragging ? <KanbanCardGhost width={ghostWidth}>{dragGhost ?? title}</KanbanCardGhost> : null}
        {closestEdge ? <DropIndicator edge={closestEdge} /> : null}
        {/* The cover thumbnail is the card's FIRST content row — above the
            id-pill/priority badge row, not below the metadata. Kanban spec
            §1.2 states the anatomy top → bottom as "optional image
            thumbnail; row of id pill + priority chip; …" and the reference
            render agrees (finding A7b-2: it used to sit between the metadata
            rows and the footer). Display-mode remains a caller flag on this
            ONE card — an image-off mode simply omits `coverImage`. */}
        {coverImage ? (
          <img
            data-slot="kanban-card-cover"
            src={coverImage}
            alt={coverImageAlt ?? ''}
            loading="lazy"
            className={cn('w-full rounded-sm border border-border object-cover', COVER_HEIGHT_CLASSES[size])}
          />
        ) : null}
        {badges || selectionControl ? (
          <div data-slot="kanban-card-badges" className="flex flex-wrap items-center gap-1.5">
            {selectionControl ? (
              // `relative` lifts this above the whole-card open button (see
              // that button's docblock) so the checkbox stays independently
              // clickable rather than swallowed by the card-open overlay.
              <span data-slot="kanban-card-selection" className="relative z-10 flex shrink-0 items-center">
                {selectionControl}
              </span>
            ) : null}
            {badges}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-1">
          <p
            data-slot="kanban-card-title"
            className={cn(
              // Figma spec: "Body | Subtitle/md/Semibold" (Gilroy, weight
              // 600) — not Bold (700).
              'min-w-0 flex-1 font-semibold leading-snug text-card-foreground [overflow-wrap:anywhere]',
              TITLE_SIZE_CLASSES[size],
            )}
          >
            {title}
          </p>
          {/* Card-level trigger count, not two: the reported double-menu bug
              was this "Move to…" `⋮` control rendering ALONGSIDE the caller's
              own "…" `actions` overflow (`RecordActionsMenu`) whenever a board
              supplied both. A kanban card ends with exactly ONE overflow
              trigger — the "…" — so this one only renders when the caller has
              no `actions` menu of its own; drag-and-drop (plus this fallback
              for boards that opt out of `actions`) remains the move path. A
              caller that DOES supply `actions` is responsible for exposing the
              same move path itself, from the exported `useKanbanCardMoveTargets`
              hook this trigger is also built from (`RecordActionsMenu` in
              `@fams/v5-templates` is the shipped example) — a card with
              onward transitions must always expose a keyboard move path,
              through exactly one trigger. */}
          {moveTargets.length > 0 && !actions ? (
            // `relative` lifts the trigger above the card-open overlay button.
            <span className="relative z-10">
              <KanbanCardMoveMenu moveMenuLabel={moveMenuLabel} cardLabel={label} targets={moveTargets} />
            </span>
          ) : null}
          {/* Same lift as the move trigger above — the caller's own overflow
              control must stay clickable over the card-open overlay. */}
          {actions ? <span className="relative z-10">{actions}</span> : null}
        </div>
        {metadataFields ? (
          <div
            data-slot="kanban-card-metadata"
            className="flex flex-col gap-1.5 text-body-xs text-muted-foreground"
          >
            {metadataFields}
          </div>
        ) : null}
        {extra}
        {(avatars && avatars.length > 0) || footerEnd ? (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            {avatars && avatars.length > 0 ? (
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {visibleAvatars!.map((avatar, avatarIndex) => (
                  <Avatar
                    key={`${avatar.name}-${avatarIndex}`}
                    name={avatar.name}
                    src={avatar.src}
                    size="xs"
                    className="ring-2 ring-card"
                  />
                ))}
                {overflowCount > 0 ? (
                  <span
                    data-slot="kanban-card-avatar-overflow"
                    className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-medium text-muted-foreground ring-2 ring-card"
                  >
                    +{overflowCount}
                  </span>
                ) : null}
              </div>
            ) : (
              <span />
            )}
            {footerEnd ? <div className="shrink-0">{footerEnd}</div> : null}
          </div>
        ) : null}
      </div>
    )
  },
)
KanbanCard.displayName = 'KanbanCard'
