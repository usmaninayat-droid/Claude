import { ChevronRight, ChevronsRight, X } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'
import { stepWidthState, type LiveListWidthState } from './live-list-model'

/**
 * LivePanelDivider — the hybrid split's grabber (SPEC v2 §2.2, Figma node
 * 540:23249): **ONE** white pill 16×57, fully rounded, attached flush to the
 * list panel's inline-END edge and vertically centered.
 *
 * ### Three glyphs, per Figma (QA A15 — supersedes round-4 finding S2)
 * Figma stacks three 12x12 glyphs inside the 57px pill and the design review
 * asked for all three, so the pill paints all three: `x` (hide), `chevron`
 * (widen one step) and `double-chevron` (fully expand, or step back when the
 * panel is already at its widest).
 *
 * That is a ~19px vertical pitch, which does not satisfy WCAG 2.2 SC 2.5.8's
 * size (24px) or spacing (24px pitch) tests on its own. It rides SC 2.5.8's
 * **equivalent control** exception instead, which genuinely applies here:
 * every one of these three states — Hidden, Collapsed/Expanded and Fully
 * Expanded — is also reachable from Customize View -> List View State
 * (`LIVE_LIST_WIDTH_STATES`), a full-size control set. The exception was
 * already what justified the `x` before this change; it covers all three
 * equally.
 *
 * The hit extension stays INLINE-ONLY (`+/-12px` -> ~40px wide). Extending it
 * in the BLOCK axis is what made adjacent targets overlap in the round-4
 * attempt, letting the later sibling win the hit test over part of the
 * earlier one's painted glyph; each button owns exactly its own 1/3 of the
 * pill and no more.
 *
 * Labels are logical ("widen"/"collapse"), so RTL keeps meaning while the
 * glyphs mirror. Pill geometry (16×57, 12px icons, 14×1 rule) is Figma
 * component geometry no spacing token expresses — the same carve-out
 * `ClusterBadge`/`VehicleMarker` document; expressed in rem, never `[Npx]`.
 */
export interface LivePanelDividerProps {
  state: LiveListWidthState
  onStateChange: (state: LiveListWidthState) => void
  onHide: () => void
  /**
   * The panel is already as wide as the viewport allows, so a further widen
   * step would change state with no visible consequence (round-4 finding N5 —
   * at 1280 `Fully Expanded` renders pixel-identical to `Expanded` because the
   * map's 560px floor clamps both). The chevron then offers the way BACK
   * instead of a step that does nothing.
   */
  atMaxWidth?: boolean
}

/**
 * 12px glyph button inside the pill. The invisible hit extension is
 * INLINE-ONLY (`±12px` → ~40px wide): the pill is 16px wide and its two
 * targets sit ~28px apart, so growing the block axis would overlap the
 * neighbour and let the later sibling steal part of its target (S2).
 */
const PILL_BUTTON =
  'relative flex flex-1 w-full items-center justify-center text-muted-foreground outline-none transition-colors ' +
  "before:absolute before:-inset-x-3 before:inset-y-0 before:content-[''] " +
  'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'

/** 14×1 hairline separating the pill's three icons. */
function PillRule() {
  return <span aria-hidden="true" className="h-px w-3.5 shrink-0 bg-border" />
}

/**
 * The pill SHELL — 16×57, fully rounded, the three glyphs stacked and
 * centred inside — shared verbatim by `LivePanelDivider` (straddling the
 * panel's live edge) and `LivePanelReopenButton`'s collapsed-rail rendering
 * (centred inside the 13px rail) below. Positioning (which edge it sits on,
 * how it's centred) is the only thing that differs between the two — the
 * pill itself must never diverge, per the run's UX ruling (SPEC
 * `live-monitoring-4-19-27942` §1.3 / UX-NOTES AC-2.3): the same glyph set
 * has to stay recognisable at every collapse level, hidden included.
 */
const PILL_SHELL =
  'flex h-[3.5625rem] w-4 flex-col items-center justify-between overflow-hidden rounded-full border border-border bg-card shadow-sm'

/** The persistent collapsed-rail strip's own width (Figma `19:28215`: 13px, a
 *  real layout width — not the zero-width hairline `LivePanelDivider` draws
 *  while the panel is visible). Expressed in rem per the file's own geometry
 *  carve-out rule (13px = 0.8125rem). */
const RAIL_WIDTH_CLASS = 'w-[0.8125rem]'

/** Collapsed → Expanded → Fully Expanded → Collapsed, clamping when the
 *  viewport already binds the panel's width (N5). */
export function cycleWidthState(state: LiveListWidthState, atMaxWidth: boolean): LiveListWidthState {
  if (state === 'fully-expanded') return 'collapsed'
  if (atMaxWidth) return 'collapsed'
  return stepWidthState(state, 'wider')
}

export function LivePanelDivider({ state, onStateChange, onHide, atMaxWidth = false }: LivePanelDividerProps) {
  const stepsBack = state === 'fully-expanded' || (atMaxWidth && state !== 'collapsed')
  /* The double-chevron's own direction: it points OUT while there is still a
     "fully expanded" to reach, and BACK once the panel is already there (or
     the viewport clamp has made further widening invisible — N5). */
  const fullyExpanded = state === 'fully-expanded' || (atMaxWidth && state !== 'collapsed')
  return (
    <div
      data-slot="live-panel-divider"
      data-width-state={state}
      data-at-max-width={atMaxWidth ? 'true' : undefined}
      className="relative z-10 flex w-0 flex-none self-stretch border-e border-border"
    >
      <div
        data-slot="live-panel-grabber"
        // ONE pill straddling the panel's trailing edge, vertically centered.
        // The half-width pull onto that edge is an inline LOGICAL margin, not
        // a negative logical utility (`-ms-2`): those are not reliably emitted
        // by a consuming app's Tailwind build and fall back to the physical
        // left, which breaks RTL (lane-A root cause, 2026-08-24).
        style={{ marginInlineStart: '-0.5rem' }}
        className={cn('absolute top-1/2 start-0 -translate-y-1/2', PILL_SHELL)}
      >
        <button type="button" aria-label="Hide vehicle list" className={PILL_BUTTON} onClick={onHide}>
          <X className="size-3" aria-hidden="true" />
        </button>
        <PillRule />
        <button
          type="button"
          /* STEP labels. They must not collide with the double-chevron's JUMP
             labels below — two buttons in one pill sharing an accessible name
             is unresolvable for anyone driving by name (voice control, a
             screen-reader's element list), and the first one wins. */
          aria-label={stepsBack ? 'Narrow vehicle list' : 'Widen vehicle list'}
          // N5: when the clamp binds, say so rather than offering a step whose
          // outcome the user cannot see.
          title={atMaxWidth && state !== 'collapsed' ? 'Vehicle list is at its maximum width' : undefined}
          className={PILL_BUTTON}
          onClick={() => onStateChange(cycleWidthState(state, atMaxWidth))}
        >
          <ChevronRight
            className={cn('size-3 rtl:rotate-180', stepsBack && 'rotate-180 rtl:rotate-0')}
            aria-hidden="true"
          />
        </button>
        <PillRule />
        {/* Figma's third glyph (QA A15): the DIRECT jump to Fully Expanded,
            and — once there, or once the viewport clamp binds — the direct
            jump back to Collapsed. The middle chevron still STEPS; this one
            goes straight to the end of the range, which is what a
            double-chevron means everywhere else in the product. */}
        <button
          type="button"
          aria-label={
            fullyExpanded ? 'Collapse vehicle list' : 'Expand vehicle list to full width'
          }
          title={atMaxWidth && state !== 'collapsed' ? 'Vehicle list is at its maximum width' : undefined}
          className={PILL_BUTTON}
          onClick={() => onStateChange(fullyExpanded ? 'collapsed' : 'fully-expanded')}
        >
          <ChevronsRight
            className={cn('size-3 rtl:rotate-180', fullyExpanded && 'rotate-180 rtl:rotate-0')}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  )
}

LivePanelDivider.displayName = 'LivePanelDivider'

export interface LivePanelReopenButtonProps {
  /**
   * The middle chevron: restores the panel to whatever width state it held
   * immediately before it was hidden (SPEC §2.4 / AC-2.4 — hiding never
   * discards the prior width, so re-showing never forces a default).
   */
  onShow: () => void
  /**
   * The double-chevron: jumps straight to the panel's fully-expanded width,
   * bypassing whatever width it held before hiding (SPEC §1.3/§2.4's
   * "»" = jump-to-max, the same meaning it carries in `LivePanelDivider`).
   */
  onShowFullyExpanded: () => void
}

/**
 * The collapsed-rail affordance shown while the panel is hidden (Figma
 * `live-monitoring-4-19-27942` node `19:28215` "collapsed list rail" +
 * `19:30264` its pill) — a persistent 13px strip immediately end-of the map
 * pane's start edge, carrying the SAME 16×57 pill `LivePanelDivider` renders
 * while the panel is visible, glyphs rotated to read as "expand" (pointing
 * away from the rail, into the map) instead of "collapse."
 *
 * UX-NOTES AC-2.3's ruling: a control whose glyph set silently changes shape
 * between collapse levels breaks the "I recognise this control" affordance
 * that's the whole point of a persistent rail. Before this change this was a
 * DIFFERENT, single-glyph `PanelLeftOpen` button — that divergence is the
 * gap this component now closes, per the ruling's own fallback (a): render
 * the same pill shape here too, since the pill cannot literally float
 * independent of the panel state it controls in this codebase.
 *
 * All three targets stay in the DOM for recognisability, but ✕ has nothing
 * further to hide once the panel is already gone — Figma's own open
 * question #2 (SPEC §2.4) — so it renders disabled here rather than as a
 * dead click that silently does nothing (the run's own P0 red flag).
 */
export function LivePanelReopenButton({ onShow, onShowFullyExpanded }: LivePanelReopenButtonProps) {
  return (
    <div
      data-slot="live-panel-reopen"
      data-width-state="hidden"
      className={cn(
        'relative z-10 flex flex-none self-stretch border-e border-border bg-card',
        'shadow-[2px_0_2px_rgba(0,0,0,0.09)]',
        RAIL_WIDTH_CLASS,
      )}
    >
      <div
        data-slot="live-panel-grabber"
        className={cn('absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2', PILL_SHELL)}
      >
        <button
          type="button"
          aria-label="Hide vehicle list"
          title="Vehicle list is already hidden"
          disabled
          className={cn(PILL_BUTTON, 'cursor-not-allowed opacity-40 hover:text-muted-foreground')}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
        <PillRule />
        <button type="button" aria-label="Show vehicle list" className={PILL_BUTTON} onClick={onShow}>
          {/* Unrotated — same "growing to the end-ward side" reading
              `LivePanelDivider`'s own widen chevron uses; there is no
              panel yet for this to point "back" into. */}
          <ChevronRight className="size-3 rtl:rotate-180" aria-hidden="true" />
        </button>
        <PillRule />
        <button
          type="button"
          aria-label="Expand vehicle list to full width"
          className={PILL_BUTTON}
          onClick={onShowFullyExpanded}
        >
          <ChevronsRight className="size-3 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
