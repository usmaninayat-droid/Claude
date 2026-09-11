import { type ReactNode } from 'react'
import { Navigation, Pause, Square } from '../../icons'
import { cn } from '../../lib/cn'
import type { VehicleStatusTone } from './VehiclePopupCard'
import { VehicleIcon3D, type VehicleIcon3DArt } from './VehicleIcon3D'

/**
 * VehicleMarker — the on-map vehicle marker from the Live Monitoring Figma
 * (SPEC §2.3, pixel-verified against map-only-495-22362 / 495:2998):
 *
 * - ~40px white circle with a 2px status-tone ring, holding the 3D isometric
 *   vehicle art (`VehicleIcon3D`, ~26px wide) — never a photo (P0-1).
 * - ~14px status badge coin on the ring's top-center: filled status color,
 *   white ring, white glyph (arrow = moving · pause = idling ·
 *   square = stopped/non-reporting). While `moving`, the arrow glyph rotates
 *   to `heading`.
 * - Leader line: a 1.5px status-colored stem (~14px) dropping from the circle
 *   to a 5px filled dot sitting on the exact coordinate (mount inside a
 *   MapLibre `Marker` with `anchor="bottom"`).
 * - ONE 120x20 info capsule running BEHIND the circle — plate at the start,
 *   a trailing value (fill level / speed / dwell) at the end — black @40%
 *   with a grey-300 hairline and 10px semibold white text (Figma 13:17558).
 *   `showPill` defaults to TRUE; pass `false` for the dense treatment, which
 *   is what the zoom-driven detail level does at far-out zooms.
 * - SELECTED (Figma 13:18868): the circle body takes the status hue's
 *   lightest tint behind a 2px ring of the same status colour, the stem
 *   thickens and lengthens, and the capsule is NOT drawn — the popup opening
 *   on top of the marker already carries both values.
 *
 * Hit area covers the full visual footprint (circle + badge + leader ≈
 * 44×58, UX C19) and the accessible name carries plate + status + speed/dwell
 * (UX-9) — the chips are redundant, never sole-source.
 *
 * Marker geometry note (same carve-out as `ClusterBadge`): the stem/dot/hit
 * sizes are Figma component geometry no spacing token expresses — they live
 * here as component-scoped constants fed to inline styles (never `[Npx]`
 * utility classes). Colors are 100% tokens.
 */

export interface VehicleMarkerProps {
  /** Plate / short id shown on the start-side chip. */
  label: string
  /** Trailing chip text, e.g. "37 mins" / "100 km/h" / "0 km/h". */
  meta?: string
  /** Status word for the accessible name, e.g. "Moving" (UX-9). */
  statusLabel?: string
  /** Overrides the 3D vehicle art inside the circle (rarely needed). */
  icon?: ReactNode
  /**
   * Which `VehicleIcon3D` illustration fills the circle when `icon` isn't
   * overridden. Config-driven per module (e.g. a tanker fleet's
   * `uiConfig.map.vehicleArt`) — never a hardcoded per-tenant fork.
   * @default 'car'
   */
  art?: VehicleIcon3DArt
  /**
   * @deprecated Photos are no longer rendered anywhere in Live Monitoring
   * (2026-08-24 parity run, P0-1) — the 3D vehicle art is the rendered truth.
   * The prop stays accepted for API compatibility (FAMS Desk vendors ui-kit)
   * and is ignored.
   */
  photoUrl?: string
  /** Status tone → ring + badge + leader color. */
  tone?: VehicleStatusTone
  /** Whether the vehicle is moving — rotates the badge arrow to `heading`. */
  moving?: boolean
  /** Heading in degrees (0 = north, clockwise). Only used when `moving`. */
  heading?: number
  /** Selected treatment — red ring/badge/leader + keeps the chips. */
  selected?: boolean
  /**
   * De-emphasize — a sibling marker is selected and this one is not. Fades
   * the pin so the selected route reads at a glance on a busy map instead of
   * being carried by the polylines alone (UX G.35). Opacity only: the status
   * ring keeps its full-strength colour relationships, so this never lowers a
   * contrast ratio below its measured value.
   */
  dimmed?: boolean
  /**
   * Chip visibility. **Default `true`** — Figma's map frames (495:2998,
   * 495:22362) show the plate + speed/dwell chips on EVERY marker, so a bare
   * `<VehicleMarker>` renders them. Pass `false` for the dense treatment
   * (circle + badge only, chips revealed on hover or while `selected`), e.g.
   * far-out zooms where labels would collide.
   *
   * ⚠ Callers that gate this on zoom hide the Figma anatomy at the live
   * view's default zoom — that was the 2026-08-24 "chips missing" bug.
   */
  showPill?: boolean
  /**
   * Hide the chips because a higher-priority marker or cluster badge occupies
   * the same screen box, or because the chip run would be cut by the map
   * pane's edge (round-1 UX finding 17). The COLLISION PASS is the map
   * layer's — `@fams/v5-templates`' `suppressedChipIds()` computes the set and
   * the map sets this flag per marker; the design system only renders it.
   *
   * Suppression removes no information channel: the chips still reveal on
   * hover, always render while `selected`, and the same plate / status /
   * speed stay in `aria-label` (UX-9).
   */
  chipsSuppressed?: boolean
  /**
   * Higher wins a chip collision (selected markers score highest). Reflected
   * as `data-collision-priority` so the caller's pass can read it back off the
   * DOM; the design system itself never computes collisions.
   */
  collisionPriority?: number
  /**
   * Status badge coin (arrow/pause/square) on the ring's top-center.
   * **Default `true`** — every mobility art (`car`/`tanker`) keeps the
   * Figma anatomy unchanged. Pass `false` for a STATIC entity (e.g.
   * `art="weather-station"`): there is no mobility state to glyph, so the
   * status stays a plain ring/leader tint per the map legend, with no coin
   * at all — never a glyph-less coin, which would just read as visual
   * noise on ~40 markers that never move.
   */
  badge?: boolean
  onClick?: () => void
}

/**
 * Ring colour per tone — sampled from the designer's own marker exports
 * (Figma 13:18626 / 13:18868): moving `#12B76A` success-500, idling
 * `#F79009` warning-500, stopped `#F04438` error-500 in the resting states
 * and `#D92D20` error-600 on the list thumb. Non-Reporting is grey-400.
 */
const TONE_RING: Record<VehicleStatusTone, string> = {
  success: 'border-success-scale-500',
  warning: 'border-warning-scale-500',
  error: 'border-destructive',
  // Non-Reporting is grey-**400** (#98A2B3) per SPEC §1, not grey-500 /
  // `muted-foreground` (#667085) — round-1 visual finding #33.
  muted: 'border-gray-400',
}
const TONE_FILL: Record<VehicleStatusTone, string> = {
  success: 'bg-success-scale-500',
  warning: 'bg-warning-scale-500',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}
/**
 * SELECTED body tint (13:18868 `Assets_on_Map Icons*.svg`): the circle fills
 * with the status hue's lightest step — `#ECFDF3` / `#FFFAEB` / `#FEF3F2` —
 * behind a 2px ring of the SAME status colour. The pin is emphasised by
 * weight and tint, NOT recoloured red (which is what the pre-2026-08-30
 * treatment did and what the designer's assets replace).
 */
const TONE_SELECTED_BODY: Record<VehicleStatusTone, string> = {
  success: 'bg-success-scale-50',
  warning: 'bg-warning-scale-50',
  error: 'bg-error-50',
  muted: 'bg-gray-50',
}

/** Marker geometry (13:18626 / 13:18868) — see the header's carve-out note.
 *  Resting: 1px stem x 16px + a 6px dot. Selected: the stem thickens to 2px
 *  and grows to 20px, lifting the circle clear of its neighbours. */
const STEM = { width: 1, height: 16 }
const STEM_SELECTED = { width: 2, height: 20 }
const DOT = { width: 6, height: 6 }
/** Minimum hit footprint (UX C19). Width only — the button's own content
 *  already spans the full ~59px height, and bottom padding would shift the
 *  anchor dot off the coordinate. */
const HIT_MIN_WIDTH = 44
/** The info capsule's width (13:17557 draws it 120px inside a 122px frame). */
const PILL_WIDTH = 120

function badgeGlyph(tone: VehicleStatusTone, moving: boolean, heading: number): ReactNode {
  if (tone === 'success') {
    return (
      <span
        className="flex items-center justify-center"
        style={moving ? { transform: `rotate(${heading}deg)` } : undefined}
      >
        <Navigation className="size-2 fill-current" strokeWidth={0} />
      </span>
    )
  }
  if (tone === 'warning') return <Pause className="size-2 fill-current" strokeWidth={0} />
  return <Square className="size-2 fill-current" strokeWidth={0} />
}

export function VehicleMarker({
  label,
  meta,
  statusLabel,
  icon,
  art = 'car',
  // Accepted-but-ignored (deprecated) — photos are never rendered (P0-1).
  photoUrl: _photoUrl,
  tone = 'muted',
  moving = false,
  heading = 0,
  selected = false,
  dimmed = false,
  showPill = true,
  chipsSuppressed = false,
  collisionPriority,
  badge = true,
  onClick,
}: VehicleMarkerProps) {
  // Selection always beats suppression — the selected marker keeps its chips.
  const pillVisible = (showPill && !chipsSuppressed) || selected
  // Selected keeps its OWN status colour and is emphasised by a tinted body,
  // a 2px ring and a longer stem (Figma 13:18868) — it is no longer recoloured
  // destructive-red, which read as "this vehicle has a fault".
  const ringClass = TONE_RING[tone]
  const fillClass = TONE_FILL[tone]
  const stem = selected ? STEM_SELECTED : STEM

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={[label, statusLabel, meta].filter(Boolean).join(' · ')}
      // A single vehicle, never an aggregate. MapLibre stamps its OWN generic
      // `aria-label="Map marker"` on every marker CONTAINER it positions —
      // clusters included — so that attribute cannot tell a vehicle from a
      // cluster badge. This slot can (round-2 interaction 14a was that
      // conflation: the "swallowed" marker clicks were cluster expansions).
      data-dimmed={dimmed || undefined}
      data-slot="vehicle-marker"
      data-chips-suppressed={chipsSuppressed ? 'true' : undefined}
      data-collision-priority={collisionPriority}
      className={cn(
        'group relative flex flex-col items-center rounded-md outline-none transition-opacity duration-fast focus-visible:ring-2 focus-visible:ring-ring',
        // Hover and focus always restore full strength — a dimmed pin stays
        // fully usable, it is only visually recessed.
        dimmed && !selected && 'opacity-55 hover:opacity-100 focus-visible:opacity-100',
      )}
      style={{ minWidth: HIT_MIN_WIDTH }}
    >
      {/* Circle + info pill. The pill renders BEFORE the circle so the circle
          (positioned, later in DOM order) paints over its middle. */}
      <span className="relative flex items-center justify-center">
        {/* ONE continuous 120x20 capsule running BEHIND the circle (Figma
            13:17558): black @40% with a grey-300 hairline, the plate at the
            start and the trailing value at the end, both 10px semibold
            white. The previous treatment drew two separate tucked chips —
            the designer's marker exports show a single pill. Never rendered
            while `selected`: the popup that opens on top already carries
            both values, so the pill would only fight it for space. */}
        {!selected ? (
          <span
            data-slot="vehicle-marker-pill"
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-between gap-2',
              'rounded-full border border-gray-300 bg-black/40 px-2 py-1',
              'text-[0.625rem] font-semibold whitespace-nowrap text-white transition-opacity',
              pillVisible ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:opacity-100',
            )}
            style={{ width: PILL_WIDTH }}
          >
            <span>{label}</span>
            {meta ? <span>{meta}</span> : null}
          </span>
        ) : null}

        {/* Circular pin: white (or, selected, status-tinted) body, status
            ring, 3D vehicle art, status badge coin on the ring's top-center. */}
        <span
          className={cn(
            'relative grid size-10 place-items-center rounded-full',
            selected ? cn('border-2', TONE_SELECTED_BODY[tone]) : 'border bg-white',
            // token-exempt: Figma-sourced one-off shadow (marker pin elevation)
            'shadow-[0_3px_8px_rgba(16,24,40,0.30)] transition-transform',
            ringClass,
            'group-hover:scale-105',
          )}
        >
          {icon ?? <VehicleIcon3D size={26} art={art} />}
          {/* Status badge coin — top center (logical wrapper keeps it RTL-safe). */}
          {badge ? (
            <span className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
              <span
                className={cn(
                  'pointer-events-auto grid size-3.5 place-items-center rounded-full text-white ring-2 ring-white',
                  fillClass,
                )}
              >
                {badgeGlyph(tone, moving, heading)}
              </span>
            </span>
          ) : null}
        </span>
      </span>

      {/* Leader line — stem + 6px dot standing on the coordinate. */}
      <span className={cn('rounded-full', fillClass)} style={stem} />
      <span className={cn('rounded-full', fillClass)} style={DOT} />
    </button>
  )
}
