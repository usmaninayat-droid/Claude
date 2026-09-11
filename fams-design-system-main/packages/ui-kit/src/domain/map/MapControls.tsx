import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, Minus, Plus } from '../../icons'
import {
  SvgLayersThree_02 as LayersThree02,
  SvgMaximize_02 as Maximize02,
  SvgMinimize_02 as Minimize02,
} from '../../icons/glyphs'
import { cn } from '../../lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from '../../primitives/Popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../primitives/Tooltip'
import { SearchRefractionIcon } from './map-glyphs'

/**
 * Map control chrome — the floating, token-styled controls overlaid on the map
 * in the Live Monitoring Figma: square white icon buttons grouped into stacked
 * clusters, a connected zoom control, a basemap STYLE SWITCHER and a generic
 * place-search control.
 *
 * Pure presentational + framework-agnostic of the map engine. The map page
 * positions clusters in the four corners and wires the handlers.
 *
 * ### Round-1 parity corrections (2026-08-24)
 * - Buttons are **40×40 on a 52px pitch** (12px gap), radius 8, with
 *   **grey-700** glyphs, and the ACTIVE tile is `#0072D6` with a white glyph
 *   (SPEC §2.3; visual #41).
 * - Each button extends its hit area to **≥44×44** with a symmetric
 *   `::before` overlay while the PAINTED tile stays 40×40 (WCAG 2.5.8,
 *   interaction E11). The inset is physical and symmetric, so the
 *   negative-logical-inset build pitfall does not apply.
 * - The layers control is a **style switcher**, not a binary toggle, and its
 *   selected tile shows a mini basemap **preview** rather than a plain white
 *   button (visual #23, interaction 19b).
 *
 * ### Two generic contracts the design system must NOT hardcode data for
 * - `MapUnavailableTool` — a tool that renders and stays interactive but has
 *   no data source in this deployment. Activating it does NOT toggle: it
 *   reports the caller's `message` so the app raises its own toast. The
 *   message text is ALWAYS application-supplied; zero environment- or
 *   tenant-specific copy lives here.
 * - `MapPlace` — the place-search source. The design system ships no
 *   gazetteer and performs no geocoding: the caller supplies the list, and
 *   `onPlaceSelect` hands the picked place back for the camera fly-to.
 */

/* Figma `Shadow/Map` token — 6px 10px 12px rgba(0,0,0,0.05). Applies to every
   floating map control tile + the zoom pill. */
// token-exempt: Figma-sourced one-off shadow (Shadow/Map — directional, no DS token equivalent)
const MAP_SHADOW = 'shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]'

/**
 * 40×40 PAINTED on a real 44×44 target (WCAG 2.5.8 / UX-NOTES C18, round-4
 * finding S1).
 *
 * The button element itself is `size-11` (44px) with a symmetric `-m-0.5`, so
 * it occupies 40px of layout — the Figma 52px pitch and every tile's screen
 * position are unchanged — while `getBoundingClientRect()` reports the honest
 * 44×44 target. Everything VISIBLE (tile background, radius, `Shadow/Map`,
 * the focus ring) moved onto the inert `::before` at `inset-0.5`, which is
 * exactly the old 40×40 box, so not a painted pixel moves.
 *
 * The previous shape — a 40×40 button with a `-inset-0.5` overlay — did give
 * a 44×44 HIT area, but only a hit test could see it; the round-4 UX gate
 * measured the element and read 40×40 against a ≥44 MUST. A target you cannot
 * measure is a target nobody can verify, so the geometry is now real.
 *
 * NO `overflow-hidden` here: it would clip the `before:` tile. The preview
 * clips itself instead.
 */
// token-exempt: Figma-sourced one-off shadow (Shadow/Map — directional, no DS token equivalent)
const TILE_PAINT_SHADOW = 'before:shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]'
const TILE_BASE = cn(
  'relative grid size-11 -m-0.5 shrink-0 place-items-center outline-none',
  'before:absolute before:inset-0.5 before:rounded-md before:transition-colors before:content-[""]',
  TILE_PAINT_SHADOW,
  'focus-visible:before:ring-2 focus-visible:before:ring-ring',
  '[&_svg]:relative [&_svg]:size-5',
)

/* Non-interactive geometry constants (the `ClusterBadge` carve-out). */
/** Inter-tile gap: 12px → the Figma's 52px pitch on a 40px tile. */
const GROUP_GAP = 'gap-3'

/* Zoom-pill geometry, Figma 19:23006 — component geometry no spacing token
   expresses, the same carve-out `TILE_BASE` documents above. */
const ZOOM_PILL_HEIGHT = 70
const ZOOM_PILL_PADDING = 7
const ZOOM_PILL_RULE_WIDTH = 26

/**
 * A map tool that renders and stays interactive but has no live data source in
 * this deployment: activating it raises `message` instead of toggling.
 *
 * The message text is ALWAYS supplied by the application — the design system
 * never ships environment-specific copy. Mirrors `@fams/v5-templates`'
 * `LiveMapUnavailableTool` by shape (structurally assignable both ways), and
 * is duplicated rather than imported so `ui-kit` keeps no dependency on a
 * package that depends on it.
 */
export interface MapUnavailableTool {
  /** Tool identifier, matched against a control's `tool` / label. */
  tool: string
  /** Caller-authored explanation raised when the tool is activated. */
  message: string
}

/** Finds `tool` in an app-supplied unavailable list (exact id match). */
export function findUnavailableTool(
  tools: MapUnavailableTool[] | undefined,
  tool: string,
): MapUnavailableTool | undefined {
  return tools?.find((entry) => entry.tool === tool)
}

/** A named place the map's search filters over and flies to. Caller-supplied. */
export interface MapPlace {
  id: string
  name: string
  /** `[lng, lat]` — GeoJSON order. */
  position: [number, number]
  /** Optional grouping / secondary label, e.g. "Landmark". */
  category?: string
}

/** One selectable basemap style in `MapLayersControl`. Caller-supplied. */
export interface MapBasemapStyle {
  id: string
  label: string
  /** Tile thumbnail shown on the control + beside the option. */
  preview?: ReactNode
}

export interface MapIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required since the button is icon-only. */
  label: string
  /** Figma ACTIVE treatment: primary tile, white glyph. */
  active?: boolean
  /**
   * Painted behind the glyph when set (the layers tile's mini basemap
   * thumbnail, visual #23). The glyph rides on top in white, over a fixed
   * `gray-900/50` scrim that guarantees the white glyph clears WCAG 1.4.11's
   * 3:1 floor against ANY supplied thumbnail — including a near-white one,
   * which measured 1.03:1 before the scrim (round-2 UX finding 1).
   */
  preview?: ReactNode
  /**
   * When set, the control is UNAVAILABLE in this deployment: clicking reports
   * the message through `onUnavailable` and never calls `onClick`, so nothing
   * toggles. Text is always caller-supplied (see `MapUnavailableTool`).
   */
  unavailableMessage?: string
  onUnavailable?: (message: string) => void
}

/** A single 40×40 white map control tile (≥44×44 hit area). */
export const MapIconButton = forwardRef<HTMLButtonElement, MapIconButtonProps>(
  (
    {
      label,
      active = false,
      preview,
      unavailableMessage,
      onUnavailable,
      onClick,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-slot="map-icon-button"
      data-unavailable={unavailableMessage ? 'true' : undefined}
      onClick={(event) => {
        // Unavailable tools REPORT; they never toggle (invoker decision 1).
        if (unavailableMessage) {
          event.preventDefault()
          onUnavailable?.(unavailableMessage)
          return
        }
        onClick?.(event)
      }}
      className={cn(
        TILE_BASE,
        preview
          ? 'before:bg-card text-white'
          : active
            ? 'before:bg-primary text-primary-foreground hover:before:bg-primary/90'
            : 'before:bg-card text-gray-700 hover:before:bg-muted',
        className,
      )}
      {...props}
    >
      {preview ? (
        /*
         * QA A11: the thumbnail is inset a further 2px INSIDE the 40x40
         * painted card (`before:inset-0.5`), so a 2px ring of `bg-card`
         * frames it and the tile reads as the same white card every other
         * map control paints — the thumbnail is an inlay, not the tile.
         */
        <span aria-hidden="true" className="absolute inset-1 overflow-hidden rounded-sm">
          {preview}
          {/*
           * Contrast floor for the white glyph (WCAG 1.4.11, round-2 UX
           * finding 1). Figma's layers tile carries a mid-tone satellite
           * raster, so its white glyph reads; a caller may pass ANY preview,
           * including a near-white one, and white-on-white measured 1.03:1.
           * This scrim is a fixed darkening pass over whatever the preview
           * paints, so the glyph clears 3:1 against every supplied thumbnail
           * while the thumbnail itself stays recognisable. 50% is the value
           * that clears the floor against the WORST case, a pure-white
           * preview: #ffffff at 50% over gray-900 resolves to L=0.242, i.e.
           * 3.60:1 for white — every darker preview only improves on it.
           */}
          <span className="absolute inset-0 bg-gray-900/50" />
        </span>
      ) : null}
      <span className="relative grid place-items-center [&_svg]:size-5">{children}</span>
    </button>
  ),
)
MapIconButton.displayName = 'MapIconButton'

export interface MapControlGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Stack direction. */
  orientation?: 'vertical' | 'horizontal'
}

/** Stacks map control tiles on the Figma's 52px pitch (40px tile + 12px gap). */
export const MapControlGroup = forwardRef<HTMLDivElement, MapControlGroupProps>(
  ({ orientation = 'vertical', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex',
        GROUP_GAP,
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
MapControlGroup.displayName = 'MapControlGroup'

/**
 * MapBasemapPreview — the fallback mini-basemap thumbnail for a style tile
 * (visual #23) when the caller supplies no raster preview of its own.
 *
 * Drawn entirely from tokens (land / water / road bands), so it re-themes per
 * tenant and never smuggles a hardcoded map colour into the design system.
 * Callers with a real tile image should pass it as `preview` instead.
 */
export function MapBasemapPreview({ className }: { className?: string }) {
  /*
   * Geometry is inline (percentages + a rotation), never arbitrary Tailwind
   * values: a package-authored `h-[2px]`/`w-[150%]`/`rotate-[22deg]` is not
   * guaranteed to be emitted by the consuming app's Tailwind build, and this
   * run has already lost three features to exactly that. Colour stays 100%
   * token classes so the thumbnail re-themes per tenant.
   */
  return (
    <span aria-hidden="true" className={cn('relative block size-full overflow-hidden bg-gray-200', className)}>
      {/* Water — a diagonal band across one corner, the most recognisable
          feature of a basemap thumbnail at 40px. */}
      <span
        className="absolute bg-primary/70"
        style={{ insetInlineStart: '-25%', top: '-28%', width: '150%', height: '52%', transform: 'rotate(22deg)' }}
      />
      {/* Green space. */}
      <span className="absolute bottom-0 end-0 bg-success/40" style={{ width: '40%', height: '34%' }} />
      {/* Road network — trunk road, cross street, slip road. Land + water +
          park + roads together are Figma's "actual basemap raster" (visual
          #24) rather than the flat two-tone swatch this used to paint, with no
          binary asset and no non-free imagery. */}
      <span
        className="absolute bg-card"
        style={{ insetInlineStart: '-10%', top: '52%', width: '130%', height: '8%', transform: 'rotate(-8deg)' }}
      />
      <span
        className="absolute bg-card"
        style={{ insetInlineStart: '34%', top: '-10%', width: '7%', height: '130%', transform: 'rotate(12deg)' }}
      />
      <span
        className="absolute bg-card/70"
        style={{ insetInlineStart: '-5%', bottom: '22%', width: '80%', height: '5%', transform: 'rotate(16deg)' }}
      />
    </span>
  )
}

export interface MapLayersControlProps {
  /** Selectable basemap styles — ALWAYS caller-supplied (no style names here). */
  styles: MapBasemapStyle[]
  /** Currently applied style id. */
  activeStyleId?: string
  onStyleChange?: (id: string) => void
  /** Accessible label for the tile. @default 'Map layers' */
  label?: string
  /** Heading above the option list. @default 'Basemap style' */
  heading?: string
  /** Renders + reports instead of switching (see `MapUnavailableTool`). */
  unavailableMessage?: string
  onUnavailable?: (message: string) => void
  className?: string
}

/**
 * MapLayersControl — the basemap STYLE SWITCHER (SPEC 3.19, interaction 19b).
 *
 * Round 1 shipped a binary toggle that cycled an internal list; the spec wants
 * an option list. The control owns no style vocabulary: `styles` comes from
 * the caller, so nothing environment-specific lives in the design system. The
 * selected tile paints that style's `preview` (or `MapBasemapPreview`) instead
 * of a plain white button (visual #23).
 */
export function MapLayersControl({
  styles,
  activeStyleId,
  onStyleChange,
  label = 'Map layers',
  heading = 'Basemap style',
  unavailableMessage,
  onUnavailable,
  className,
}: MapLayersControlProps) {
  const active = styles.find((s) => s.id === activeStyleId) ?? styles[0]

  const tile = (
    <MapIconButton
      label={label}
      active={Boolean(active)}
      preview={active ? (active.preview ?? <MapBasemapPreview />) : undefined}
      unavailableMessage={unavailableMessage}
      onUnavailable={onUnavailable}
      className={className}
      data-slot="map-layers-control"
    >
      <LayersThree02 />
    </MapIconButton>
  )

  // An unavailable layers tool must not open a list it cannot honour.
  if (unavailableMessage) return tile

  return (
    <Popover>
      <PopoverTrigger asChild>{tile}</PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div
          role="listbox"
          aria-label={heading}
          className="flex flex-col"
          data-slot="map-basemap-styles"
        >
          <span className="px-2 py-1.5 text-caption font-semibold uppercase text-gray-400">
            {heading}
          </span>
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              role="option"
              aria-selected={style.id === active?.id}
              onClick={() => onStyleChange?.(style.id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-caption outline-none transition-colors',
                'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                style.id === active?.id ? 'font-semibold text-primary' : 'text-foreground',
              )}
            >
              <span className="size-6 shrink-0 overflow-hidden rounded border border-border">
                {style.preview ?? <MapBasemapPreview />}
              </span>
              <span className="flex-1 truncate">{style.label}</span>
              {/* WCAG 1.4.1: selection was signalled by the label's colour
                  ALONE (round-3 UX #8). The tick is the non-colour channel;
                  the gutter is reserved on every row so picking one moves
                  nothing. */}
              <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
                {style.id === active?.id ? <Check className="size-4" /> : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface MapLayersSwitcherProps {
  /** Selectable basemap styles — ALWAYS caller-supplied. */
  styles: MapBasemapStyle[]
  activeStyleId?: string
  onStyleChange?: (id: string) => void
  /** Accessible label for the collapsed control. @default 'Map layers' */
  label?: string
  /** Start expanded (docs / a11y fixtures). @default false */
  defaultOpen?: boolean
  className?: string
}

/**
 * MapLayersSwitcher — the HOVER-ROW basemap style switcher (map-layer-
 * switcher spec, points 1–4).
 *
 * A collapsed `MapIconButton` (thumbnail + white Layers glyph + primary
 * border) expands, on hover OR focus, into a row of same-size style cards.
 * Reuses `MapIconButton`/`MapBasemapPreview`'s scrim-over-preview pattern and
 * the same `role="listbox"`/`role="option"`/`aria-selected` semantics
 * `MapLayersControl`'s popover already uses — this is a second INTERACTION
 * mode over the same `MapBasemapStyle[]` shape, not a second component.
 *
 * Fully controlled: no store import here (ui-kit DoD rule 8 — state-agnostic
 * presenters, no global store). Callers wire `activeStyleId`/`onStyleChange`
 * to whatever holds the selection — v5-templates' `useGlobalBasemapId` for
 * app-wide sync.
 */
export function MapLayersSwitcher({
  styles,
  activeStyleId,
  onStyleChange,
  label = 'Map layers',
  defaultOpen = false,
  className,
}: MapLayersSwitcherProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [focusIndex, setFocusIndex] = useState(0)
  const rowRef = useRef<HTMLDivElement>(null)
  // Roving focus: while the row is open, focus follows `focusIndex`
  // (jsx-a11y forbids `autoFocus`; this is the controlled equivalent, and it
  // only moves focus when it is ALREADY inside the row — a pointer hover must
  // not steal focus from wherever the user had it).
  useEffect(() => {
    if (!open || !rowRef.current) return
    const row = rowRef.current
    if (!row.contains(document.activeElement) && document.activeElement !== document.body) return
    const target = row.querySelectorAll<HTMLButtonElement>('[role="option"]')[focusIndex]
    target?.focus()
  }, [open, focusIndex])
  const activeIndex = Math.max(
    0,
    styles.findIndex((s) => s.id === activeStyleId),
  )
  const active = styles[activeIndex] ?? styles[0]
  /*
   * Row order: OTHER styles first (fanning start-ward/left), the SELECTED
   * style last — the row is anchored `insetInlineEnd: 0` (below), so its
   * LAST child always lands in the trigger slot, matching the reference
   * `BasemapSwitcher` (fams-v5-demo-environment LiveGisMap.tsx, commit
   * 1df3b47). Selecting a different style re-anchors it into that slot on
   * the next expand, since `active` (and therefore this ordering) is
   * recomputed from `activeStyleId` every render.
   */
  const orderedStyles = active
    ? [...styles.filter((s) => s.id !== active.id), active]
    : styles
  const orderedActiveIndex = orderedStyles.length - 1

  /*
   * Escape LATCHES the row shut until the pointer actually leaves.
   *
   * Without the latch, collapsing while the pointer is still over the
   * switcher re-opens it instantly: swapping the expanded row for the
   * collapsed trigger inserts a NEW element under a stationary cursor, and
   * the browser fires `mouseover` for it, which React reports to the wrapper
   * as `onMouseEnter`. The row would visibly close and re-open on the same
   * frame, which is exactly the "Escape does nothing" the audit saw.
   */
  const dismissedRef = useRef(false)
  const collapse = () => setOpen(false)
  const expand = () => {
    if (dismissedRef.current) return
    setFocusIndex(orderedActiveIndex)
    setOpen(true)
  }
  const leave = () => {
    dismissedRef.current = false
    setOpen(false)
  }
  const dismiss = () => {
    dismissedRef.current = true
    setOpen(false)
  }
  /*
   * QA A1 — `Escape` must collapse the row. The `onKeyDown` handlers below
   * only ever fire when focus is INSIDE the switcher, and the row's normal
   * opening gesture is a HOVER, which never moves focus: pressing Escape
   * after hovering therefore reached nothing and the row stayed open. A
   * document-level listener, live only while the row is open, closes it
   * whatever holds focus. `keydown` (not `keyup`) so it matches the
   * component's own handlers, and it is removed the moment the row closes,
   * so a collapsed switcher listens for nothing.
   */
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      dismissedRef.current = true
      setOpen(false)
    }
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [open])
  const select = (id: string) => onStyleChange?.(id)

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        expand()
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      dismiss()
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusIndex((i) => Math.min(orderedStyles.length - 1, i + 1))
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusIndex((i) => Math.max(0, i - 1))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const target = orderedStyles[focusIndex]
      if (target) select(target.id)
      collapse()
    }
  }

  return (
    <div
      // Fixed 44×44 footprint (the tile's own hit-area geometry) regardless of
      // open state — the trigger and the expanded row are both painted as
      // ABSOLUTE overlays inside it (below), so neither ever changes this
      // element's box, which is what a sibling flex-col stack measures
      // (map-layer-switcher spec point 2 layout-shift fix). Without this the
      // expanded row's own intrinsic width became this element's flex-basis,
      // widening it and sliding every sibling tile below it sideways.
      // QA A19: `-m-0.5` mirrors `TILE_BASE`'s geometry, so this wrapper
      // occupies the same 40px of LAYOUT as every sibling tile. Without it the
      // switcher was the only 44px-wide child of the tool column, which made
      // the column 44 wide and left every OTHER tile's painted box 4px short
      // of the column's end edge — so the top-end stack's tiles and the
      // bottom-end zoom cluster could never line up in one column.
      className={cn('relative size-11 -m-0.5 shrink-0', className)}
      onMouseEnter={expand}
      // Leaving clears the Escape latch, so the next hover expands again.
      onMouseLeave={leave}
      data-slot="map-layers-switcher"
    >
      {!open ? (
        <>
          <MapIconButton
            label={label}
            // QA A11: NOT `active`. The collapsed trigger is a disclosure,
            // not a toggle — `aria-pressed=true` made it read (to AT and, via
            // the pressed styling contract, to sighted users) as permanently
            // engaged, unlike every sibling control. The active-layer
            // thumbnail is the only state cue it needs.
            preview={active?.preview ?? <MapBasemapPreview />}
            onFocus={expand}
            onKeyDown={onKeyDown}
            aria-expanded={false}
          >
            <LayersThree02 />
          </MapIconButton>
          {/* NO selected-state ring on the COLLAPSED trigger (designer, round
              5): it read as a maroon halo unlike every other map control. The
              trigger now carries exactly the sibling tiles' geometry —
              `MapIconButton`'s 40×40 painted box, radius 8 and `Shadow/Map` —
              with the active-layer thumbnail behind the white Layers glyph as
              its only state cue. The primary border survives ONLY on the
              selected CARD inside the expanded row below. */}
        </>
      ) : null}
      {open ? (
        <div
          ref={rowRef}
          role="listbox"
          aria-label={label}
          aria-expanded={true}
          tabIndex={-1}
          data-slot="map-layers-switcher-row"
          // Absolute overlay anchored to the trigger's top-end corner,
          // growing START-ward (leftward in LTR) over the map, ABOVE every
          // other control (z-20) — never in normal flow, so it cannot widen
          // this element's box (see the `size-11` note above). Logical
          // inset via inline style, never a negative/logical utility class:
          // a consuming app's Tailwind build does not reliably emit those
          // (the same rule this module's other absolute overlays follow).
          style={{ insetInlineEnd: 0, insetBlockStart: 0 }}
          // ~200ms (duration-normal) combined slide + fade, matching the reference's expand
          // (`motion-reduce` drops both, per the module's motion contract).
          className={cn(
            'absolute z-20 flex items-stretch overflow-hidden rounded-lg',
            'animate-in fade-in slide-in-from-right-4 duration-normal ease-out motion-reduce:animate-none',
          )}
        >
          {orderedStyles.map((style, index) => {
            const selected = style.id === active?.id
            return (
              <Tooltip key={style.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={index === focusIndex ? 0 : -1}
                    onKeyDown={onKeyDown}
                    onClick={() => {
                      select(style.id)
                      setFocusIndex(index)
                    }}
                    onFocus={() => setFocusIndex(index)}
                    className={cn(
                      'relative -ms-1 grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg outline-none first:ms-0',
                      selected ? 'border-2 border-primary' : 'border border-border',
                      'focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-md">
                      {style.preview ?? <MapBasemapPreview />}
                    </span>
                    <span className="sr-only">{style.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{style.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export interface MapSearchControlProps {
  /**
   * The GENERIC search source. The design system ships no gazetteer and does
   * no geocoding — the application supplies this list, so zero place names
   * live in the design system.
   */
  places?: MapPlace[]
  /** A place was picked (fly the camera to `place.position`). */
  onPlaceSelect?: (place: MapPlace) => void
  /** Query text changed — for callers that fetch their own results. */
  onQueryChange?: (query: string) => void
  /** Overrides the default name/category substring match. */
  filterPlace?: (place: MapPlace, query: string) => boolean
  /** Accessible label for the tile + input. @default 'Search map' */
  label?: string
  placeholder?: string
  emptyLabel?: string
  /** Controlled expansion; omit for the control's own state. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Renders + reports instead of searching (see `MapUnavailableTool`). */
  unavailableMessage?: string
  onUnavailable?: (message: string) => void
  className?: string
}

function defaultFilter(place: MapPlace, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    place.name.toLowerCase().includes(q) ||
    (place.category?.toLowerCase().includes(q) ?? false)
  )
}

/**
 * MapSearchControl — the map's place search (SPEC 3.18, invoker decision 2).
 *
 * This is the STANDALONE-map variant, wired by `MapContainer`: one tile that
 * expands in place, for a map carrying no other floating chrome. Live
 * Monitoring has a SECOND place search in
 * `@fams/v5-templates` `map/chrome/LiveMapTools.tsx`, because that one has to
 * share a 52px tile pitch and stacking order with five sibling tools and
 * double as the drop-pin target. The behavioural half is shared
 * (`findUnavailableTool` here, `MapLayersControl` here); only the geometry is
 * duplicated. Fix place-search BEHAVIOUR in both, or lift it here first
 * (Phase 7 code review, finding 7).
 *
 * A `search-refraction` tile that expands into a combobox over the
 * caller-supplied `places`. Keyboard: ↑/↓ move the active option, Enter picks
 * it, Escape collapses. The listbox is wired through `aria-activedescendant`
 * so the input keeps focus while the active option is announced.
 */
export function MapSearchControl({
  places,
  onPlaceSelect,
  onQueryChange,
  filterPlace = defaultFilter,
  label = 'Search map',
  placeholder,
  emptyLabel = 'No matching places',
  open,
  defaultOpen = false,
  onOpenChange,
  unavailableMessage,
  onUnavailable,
  className,
}: MapSearchControlProps) {
  const idBase = useId()
  const listId = `${idBase}-places`
  const optionId = (id: string) => `${idBase}-option-${id}`
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [ownOpen, setOwnOpen] = useState(defaultOpen)
  const expanded = open ?? ownOpen
  const setExpanded = (next: boolean) => {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = (places ?? []).filter((place) => filterPlace(place, query))
  const activeOption = results[activeIndex]

  const pick = (place: MapPlace | undefined) => {
    if (!place) return
    onPlaceSelect?.(place)
    setExpanded(false)
  }

  return (
    <div className={cn('flex items-start', GROUP_GAP, className)} data-slot="map-search-control">
      <MapIconButton
        label={label}
        active={expanded}
        aria-expanded={expanded}
        unavailableMessage={unavailableMessage}
        onUnavailable={onUnavailable}
        onClick={() => {
          setExpanded(!expanded)
          if (!expanded) window.requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <SearchRefractionIcon />
      </MapIconButton>

      {expanded && !unavailableMessage ? (
        <div className={cn('relative w-56 rounded-lg bg-card', MAP_SHADOW)}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? optionId(activeOption.id) : undefined}
            placeholder={placeholder ?? label}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
              onQueryChange?.(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                pick(activeOption)
              } else if (event.key === 'Escape') {
                setExpanded(false)
              }
            }}
            className="h-10 w-full rounded-lg bg-transparent px-3 text-caption text-foreground outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="fams-scroll-region max-h-56 overflow-y-auto border-t border-border py-1"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-caption text-gray-400">{emptyLabel}</li>
            ) : (
              results.map((place, index) => (
                <li key={place.id}>
                  <button
                    type="button"
                    id={optionId(place.id)}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => pick(place)}
                    className={cn(
                      'flex w-full flex-col items-start px-3 py-1.5 text-start text-caption outline-none',
                      index === activeIndex ? 'bg-muted text-foreground' : 'text-foreground',
                    )}
                  >
                    <span className="truncate font-semibold">{place.name}</span>
                    {place.category ? (
                      <span className="truncate text-gray-400">{place.category}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export interface MapZoomControlProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFullscreen?: () => void
  /**
   * Whether the map is CURRENTLY fullscreen. Flips the detached button's
   * glyph and its accessible name, so a user already in fullscreen is told
   * how to leave rather than being offered the state they are in. State lives
   * in the caller (rule 8) — this component subscribes to nothing.
   */
  fullscreen?: boolean
  className?: string
}

/**
 * MapZoomControl — connected +/− (single rounded white pill, hairline divider)
 * with an optional detached fullscreen button below, matching the Figma's
 * bottom-right cluster. Both halves are 40×40 painted with a ≥44×44 hit area.
 */
export function MapZoomControl({
  onZoomIn,
  onZoomOut,
  onFullscreen,
  fullscreen = false,
  className,
}: MapZoomControlProps) {
  return (
    <div data-slot="map-zoom-control" className={cn('flex flex-col items-center', GROUP_GAP, className)}>
      {/*
       * Figma 19:23006: the zoom pair is ONE 40x70 card (not two 40x40 cells),
       * 7px padding, a 26x1px grey-200 hairline between two 20px glyphs. The
       * box geometry is inline for the reason `TILE_BASE` documents — an
       * arbitrary-value height class is not reliably emitted by a consuming
       * app's Tailwind build, and a dropped one silently resolves to `auto`.
       */}
      <div
        style={{ height: ZOOM_PILL_HEIGHT, padding: ZOOM_PILL_PADDING }}
        className={cn('flex w-10 flex-col items-center justify-between overflow-hidden rounded-md bg-card', MAP_SHADOW)}
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className='relative grid w-full flex-1 place-items-center text-gray-700 outline-none before:absolute before:-inset-x-2 before:inset-y-0 before:content-[""] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-5'
        >
          <Plus />
        </button>
        <div style={{ width: ZOOM_PILL_RULE_WIDTH }} className="h-px shrink-0 bg-border" />
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className='relative grid w-full flex-1 place-items-center text-gray-700 outline-none before:absolute before:-inset-x-2 before:inset-y-0 before:content-[""] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-5'
        >
          <Minus />
        </button>
      </div>
      {onFullscreen ? (
        <MapIconButton
          label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          active={fullscreen}
          onClick={onFullscreen}
        >
          {fullscreen ? <Minimize02 /> : <Maximize02 />}
        </MapIconButton>
      ) : null}
    </div>
  )
}
