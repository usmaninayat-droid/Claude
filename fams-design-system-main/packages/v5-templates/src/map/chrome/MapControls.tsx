import { Compass, Maximize, Minimize, Minus, Plus } from '@fams/ui-kit/icons'
import { Button, IconControl, MapZoomControl } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

/**
 * MapControls — the standard zoom-in / zoom-out / reset-bearing /
 * fullscreen control stack (bottom-end chrome), built on `@fams/ui-kit`'s
 * `Button` (token-styled, no bespoke button markup) rather than MapLibre's
 * own `NavigationControl` DOM widget — keeps every pixel of chrome on the
 * same design-system primitives as the rest of the product.
 *
 * Each control is `size-11` (44px), not `Button size="icon"`'s `size-9`
 * (36px): UX verdict V11 requires a ≥44×44 hit area with a visible focus
 * ring for every map control. Placement is `bottom-4 end-4` — logical
 * utilities compiling to `inset-inline-end`, never `right` (verdict V12).
 *
 * Each control is icon-only, so each is wrapped in `IconControl` — the one
 * helper that pairs an accessible name with a tooltip that opens on hover AND
 * on keyboard focus. A native `title=` (what these used to carry) never opens
 * on focus, so a keyboard user got no hint at all (UX K.67).
 *
 * The fullscreen control is a TOGGLE: `fullscreen` flips its glyph and its
 * accessible name so a user in fullscreen is told how to leave (Escape also
 * exits, natively). State lives in the caller (`MapPanel`), which owns the
 * `fullscreenchange` subscription — rule 8.
 */
/**
 * `'stacked'` — the original four-in-one column (zoom in / zoom out / reset
 * bearing / fullscreen), unchanged for every existing map surface.
 * `'figma'` — the Live Monitoring bottom-end cluster (SPEC §2.3): a single
 * zoom PILL (`plus` / hairline divider / `minus`) with the fit/fullscreen
 * control detached below it, and **no** bearing control (Figma has none).
 */
export type MapControlsVariant = 'stacked' | 'figma'

export interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetBearing: () => void
  onFullscreen: () => void
  /** Whether the map is currently fullscreen — drives the toggle's glyph + label. */
  fullscreen?: boolean
  /** Control-cluster layout. @default 'stacked' */
  variant?: MapControlsVariant
  /**
   * Suppress the detached fullscreen tile below the `'figma'` zoom pill
   * (`MapPanelProps.hideFullscreenControl`, `uiConfig.map.hideFullscreenControl`).
   * The `'stacked'` variant's combined column is unaffected — it has no
   * per-module opt-out today.
   */
  hideFullscreen?: boolean
  className?: string
}

const CONTROL = 'size-11 rounded-none'

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetBearing,
  onFullscreen,
  fullscreen = false,
  variant = 'stacked',
  hideFullscreen = false,
  className,
}: MapControlsProps) {
  const fullscreenLabel = fullscreen ? 'Exit fullscreen' : 'Fullscreen'
  const FullscreenIcon = fullscreen ? Minimize : Maximize
  if (variant === 'figma') {
    /*
     * QA A19: the Live Monitoring cluster is ui-kit's `MapZoomControl`, not a
     * second hand-built one. This variant used to paint its own `Button
     * size-11` cells — 44px of painted surface against the 40px every other
     * floating control paints, with `shadow-sm` instead of the `Shadow/Map`
     * token and a 1px border nothing else carries — so the bottom-end
     * cluster read as visibly larger and heavier than the top-end stack and
     * their edges did not align. One primitive, one geometry.
     */
    return (
      <div data-slot="map-controls" data-variant="figma" className={cn('absolute bottom-4 end-4 z-10', className)}>
        <MapZoomControl
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          // `MapZoomControl` only paints the detached fullscreen tile when
          // `onFullscreen` is truthy — omitting the handler (rather than
          // passing a no-op) is what actually removes the tile per module.
          onFullscreen={hideFullscreen ? undefined : onFullscreen}
          fullscreen={fullscreen}
        />
      </div>
    )
  }

  return (
    <div
      data-slot="map-controls"
      className={cn(
        'absolute bottom-4 end-4 z-10 flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm',
        className,
      )}
    >
      <IconControl tip="Zoom in">
        <Button variant="ghost" size="icon" onClick={onZoomIn} className={CONTROL}>
          <Plus size={16} aria-hidden />
        </Button>
      </IconControl>
      <span className="h-px bg-border" aria-hidden />
      <IconControl tip="Zoom out">
        <Button variant="ghost" size="icon" onClick={onZoomOut} className={CONTROL}>
          <Minus size={16} aria-hidden />
        </Button>
      </IconControl>
      <span className="h-px bg-border" aria-hidden />
      <IconControl tip="Reset bearing">
        <Button variant="ghost" size="icon" onClick={onResetBearing} className={CONTROL}>
          <Compass size={16} aria-hidden />
        </Button>
      </IconControl>
      <span className="h-px bg-border" aria-hidden />
      <IconControl tip={fullscreenLabel}>
        <Button variant="ghost" size="icon" aria-pressed={fullscreen} onClick={onFullscreen} className={CONTROL}>
          <FullscreenIcon size={16} aria-hidden />
        </Button>
      </IconControl>
    </div>
  )
}
