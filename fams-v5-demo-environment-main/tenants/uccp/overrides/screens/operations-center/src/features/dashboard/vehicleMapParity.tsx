import { useMemo, type ReactNode } from 'react'
import { AssetGlyph } from '@ds/icons'
import { cn } from '@fams/design-system'
import {
  Navigation as NavigationIcon,
  Pause as PauseIcon,
  Square as SquareIcon,
} from 'lucide-react'
import type { AssetMarkerState } from '@ds/components/map'

/* ── Live Monitoring vehicle-marker / cluster parity ────────────────────────
 *
 * PROVENANCE (2026-09-01 Live GIS parity run). Everything in this file is the
 * SHIPPED Live Monitoring anatomy, copied verbatim from the design system and
 * re-expressed on the cockpit's vendored primitives:
 *
 *   fams-design-system/packages/ui-kit/src/domain/map/VehicleMarker.tsx
 *   fams-design-system/packages/ui-kit/src/domain/map/ClusterBadge.tsx
 *   fams-design-system/packages/ui-kit/src/domain/map/vehicle-popup-style.ts
 *   fams-design-system/packages/v5-templates/src/map/cluster.ts
 *   fams-design-system/packages/v5-templates/src/map/constants.ts
 *
 * The cockpit is an ISOLATED React-18 bundle with no `@fams/ui-kit`
 * dependency (see vite.config.ts's header), so — exactly as `MapToolDrawer`
 * and `gisTabTables` did before it — the anatomy is replicated here on the
 * vendored tree rather than imported. Only two things are adapted:
 *
 *  1. Tone class names. The DS ships `-scale-` ramp aliases
 *     (`bg-success-scale-500`); the vendored theme names the same tokens
 *     `--color-success-500` → `bg-success-500`. Same colour, same ramp step.
 *  2. The 3D art. `VehicleIcon3D art="tanker"` and the vendored
 *     `AssetGlyph name="Tanker" variant="map"` are the SAME asset
 *     (assets/vectors/vehicle/tanker/Asset Icons/Map/Tanker.svg) — the
 *     precedent `gisTabTables` set for the Vehicles list rows.
 */

/** DS `VehicleStatusTone` (ui-kit `VehiclePopupCard`). */
export type VehicleStatusTone = 'success' | 'warning' | 'error' | 'muted'

/**
 * The cockpit's map-marker state vocabulary → the DS's four status tones.
 * Mirrors ui-kit's `mobility-status.tsx` mapping: moving → success,
 * idling (incl. excess-idling) → warning, stopped/immobilized → error,
 * non-reporting → muted.
 */
export function toneForState(state: AssetMarkerState): VehicleStatusTone {
  if (state === 'moving') return 'success'
  if (state === 'idle' || state === 'excess-idling') return 'warning'
  if (state === 'stopped' || state === 'immobilized') return 'error'
  return 'muted'
}

/* ── tone maps (VehicleMarker.tsx + vehicle-popup-style.ts) ─────────────── */

export const TONE_RING: Record<VehicleStatusTone, string> = {
  success: 'border-success-500',
  warning: 'border-warning-500',
  error: 'border-destructive',
  // Non-Reporting is grey-400 (#98A2B3) per SPEC §1, not grey-500.
  muted: 'border-gray-400',
}
export const TONE_FILL: Record<VehicleStatusTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}
/** SELECTED body tint (Figma 13:18868) — the status hue's lightest step. */
export const TONE_SELECTED_BODY: Record<VehicleStatusTone, string> = {
  success: 'bg-success-50',
  warning: 'bg-warning-50',
  error: 'bg-error-50',
  muted: 'bg-gray-50',
}
/** 68×70 popup header tile tint — the status-100 scale (#FEE4E2 = error-100). */
export const TONE_TILE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success-100',
  warning: 'bg-warning-100',
  error: 'bg-error-100',
  muted: 'bg-gray-100',
}
/** Popup header badge coin fill. Idling reads warning-600 here (SPEC §1). */
export const TONE_BADGE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning-600',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}
export const TONE_TEXT: Record<VehicleStatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning-600',
  error: 'text-destructive',
  muted: 'text-gray-400',
}

/* ── marker geometry (Figma 13:18626 / 13:18868) ────────────────────────── */

const STEM = { width: 1, height: 16 }
const STEM_SELECTED = { width: 2, height: 20 }
const DOT = { width: 6, height: 6 }
/** Minimum hit footprint (UX C19). */
const HIT_MIN_WIDTH = 44
/** The info capsule's width (13:17557 draws it 120px inside a 122px frame). */
const PILL_WIDTH = 120

/** Status badge coin glyph: arrow = moving · pause = idling · square = stopped
 *  / non-reporting. While moving, the arrow rotates to `heading`. */
export function badgeGlyph(tone: VehicleStatusTone, moving: boolean, heading: number): ReactNode {
  if (tone === 'success') {
    return (
      <span
        className="flex items-center justify-center"
        style={moving ? { transform: `rotate(${heading}deg)` } : undefined}
      >
        <NavigationIcon className="size-2 fill-current" strokeWidth={0} />
      </span>
    )
  }
  if (tone === 'warning') return <PauseIcon className="size-2 fill-current" strokeWidth={0} />
  return <SquareIcon className="size-2 fill-current" strokeWidth={0} />
}

/** The 3D tanker illustration the LM marker/tile/list row all render. */
export function TankerArt({ size }: { size: number }) {
  return (
    <span data-slot="vehicle-marker-art" className="grid place-items-center">
      <AssetGlyph name="Tanker" variant="map" size={size} />
    </span>
  )
}

export interface VehicleMarkerProps {
  /** Capsule's leading text — the plate. */
  label: string
  /** Capsule's trailing value (speed / fill level / dwell). */
  meta?: string
  /** Status word for the accessible name. */
  statusLabel?: string
  tone?: VehicleStatusTone
  moving?: boolean
  heading?: number
  selected?: boolean
  dimmed?: boolean
  /** Capsule visibility. LM's zoom-driven detail level passes `false` at
   *  far-out zooms, which is the state the live LM map renders at its
   *  default zoom — the pill stays hover-only. */
  showPill?: boolean
  onClick?: (e: React.MouseEvent) => void
}

/**
 * VehicleMarker — LM's on-map vehicle marker (SPEC §2.3, Figma
 * map-only-495-22362 / 495:2998), copied anatomy for anatomy:
 *
 * - 40px white circle, 2px status-tone ring, holding the 3D tanker art
 *   (~26px wide) — never a photo.
 * - 14px status badge coin on the ring's top-center: filled status colour,
 *   white ring, white glyph.
 * - Leader line: a status-coloured stem (16px) dropping to a 6px dot that
 *   stands on the exact coordinate.
 * - ONE 120×20 info capsule running BEHIND the circle — plate at the start,
 *   trailing value at the end — black @40% with a grey-300 hairline and 10px
 *   semibold white text (Figma 13:17558). Never drawn while `selected`: the
 *   popup opening on top already carries both values.
 * - SELECTED (Figma 13:18868): the body takes the status hue's lightest tint
 *   behind a 2px ring of the same status colour and the stem thickens.
 *
 * The cockpit positions its markers itself (container-pixel overlay), so
 * `x`/`y` replace LM's MapLibre `Marker anchor="bottom"` mount — the visual
 * anatomy below is unchanged.
 */
export function VehicleMarker({
  x,
  y,
  label,
  meta,
  statusLabel,
  tone = 'muted',
  moving = false,
  heading = 0,
  selected = false,
  dimmed = false,
  showPill = false,
  onClick,
}: VehicleMarkerProps & { x: number; y: number }) {
  const ringClass = TONE_RING[tone]
  const fillClass = TONE_FILL[tone]
  const stem = selected ? STEM_SELECTED : STEM

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={[label, statusLabel, meta].filter(Boolean).join(' · ')}
      data-slot="vehicle-marker"
      data-dimmed={dimmed || undefined}
      className={cn(
        'group pointer-events-auto absolute flex cursor-pointer flex-col items-center rounded-md outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring',
        dimmed && !selected && 'opacity-55 hover:opacity-100 focus-visible:opacity-100',
      )}
      style={{
        left: x,
        top: y,
        minWidth: HIT_MIN_WIDTH,
        transform: 'translate(-50%, -100%)',
        zIndex: selected ? 2 : 1,
      }}
    >
      {/* Circle + info pill. The pill renders BEFORE the circle so the circle
          (later in DOM order) paints over its middle. */}
      <span className="relative flex items-center justify-center">
        {!selected ? (
          <span
            data-slot="vehicle-marker-pill"
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-between gap-2',
              'rounded-full border border-gray-300 bg-black/40 px-2 py-1',
              'text-[0.625rem] font-semibold whitespace-nowrap text-white transition-opacity',
              showPill ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:opacity-100',
            )}
            style={{ width: PILL_WIDTH }}
          >
            <span>{label}</span>
            {meta ? <span>{meta}</span> : null}
          </span>
        ) : null}

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
          <TankerArt size={26} />
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
        </span>
      </span>

      {/* Leader line — stem + 6px dot standing on the coordinate. */}
      <span className={cn('rounded-full', fillClass)} style={stem} />
      <span className={cn('rounded-full', fillClass)} style={DOT} />
    </button>
  )
}

/* ── ClusterBadge (ui-kit/domain/map/ClusterBadge.tsx, verbatim) ─────────── */

export type ClusterBadgeSize = 32 | 40 | 48 | 56

export interface ClusterBadgeSegment {
  tone: VehicleStatusTone
  count: number
  label?: string
}

/** Figma tier geometry: outer diameter → inner (count circle) diameter. */
const INNER: Record<ClusterBadgeSize, number> = { 32: 24, 40: 30, 48: 36, 56: 42 }
/** Count typography per tier (Figma: 10/12/14/16px bold). */
const FONT_REM: Record<ClusterBadgeSize, string> = {
  32: '0.625rem',
  40: '0.75rem',
  48: '0.875rem',
  56: '1rem',
}
/** The cluster ring's orange is warning-**500**, deliberately unlike the
 *  single marker's idle ring — don't "unify". */
const TONE_STROKE: Record<VehicleStatusTone, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-destructive)',
  muted: 'var(--color-gray-400)',
}
/** The ring draws EXACTLY three arcs — moving / idling / stopped. */
const ARC_TONES: readonly VehicleStatusTone[] = ['success', 'warning', 'error']
/** Gap between arcs in `pathLength` units (the ring is normalised to 100). */
const ARC_GAP = 2

export function clusterBadgeTier(count: number): ClusterBadgeSize {
  if (count <= 99) return 32
  if (count <= 999) return 40
  if (count <= 9999) return 48
  return 56
}

export function formatClusterCount(count: number): string {
  return count.toLocaleString('en-US')
}

/**
 * ClusterBadge — the segmented map-cluster badge from the LM Figma
 * (component set 551:8483/8492/8501/8510): a dark centre circle with a white
 * count, wrapped in a donut ring whose arc segments are proportional to the
 * cluster's status mix. NON-interactive by design — the map layer that places
 * it owns the click target.
 */
export function ClusterBadge({
  count,
  segments = [],
  size,
  className,
}: {
  count: number
  segments?: ClusterBadgeSegment[]
  size?: ClusterBadgeSize
  className?: string
}) {
  const outer = size ?? clusterBadgeTier(count)
  const inner = INNER[outer]
  const ringWidth = (outer - inner) / 2
  const radius = (outer - ringWidth) / 2

  const arcs = segments.filter((s) => s.count > 0 && ARC_TONES.includes(s.tone))
  const total = arcs.reduce((sum, s) => sum + s.count, 0)
  let consumed = 0

  const labelled = segments.filter((s) => s.count > 0 && s.label)
  const mix = labelled.map((s) => `${s.count} ${s.label}`).join(', ')
  const ariaLabel = mix
    ? `Cluster of ${formatClusterCount(count)}: ${mix}`
    : `Cluster of ${formatClusterCount(count)}`

  return (
    <span
      data-slot="cluster-badge"
      role="img"
      aria-label={ariaLabel}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: outer, height: outer }}
    >
      <svg
        viewBox={`0 0 ${outer} ${outer}`}
        width={outer}
        height={outer}
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
      >
        {total === 0 ? (
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="var(--color-gray-400)"
            strokeWidth={ringWidth}
          />
        ) : null}
        {total > 0
          ? arcs.map((s, i) => {
              const share = (s.count / total) * 100
              const offset = -(consumed / total) * 100
              consumed += s.count
              const drawn = Math.max(share - ARC_GAP, 0)
              return (
                <circle
                  key={`${s.tone}-${i}`}
                  cx={outer / 2}
                  cy={outer / 2}
                  r={radius}
                  fill="none"
                  stroke={TONE_STROKE[s.tone]}
                  strokeWidth={ringWidth}
                  pathLength={100}
                  strokeDasharray={`${drawn} ${100 - drawn}`}
                  strokeDashoffset={offset - ARC_GAP / 2}
                  data-tone={s.tone}
                />
              )
            })
          : null}
      </svg>
      <span
        className="relative grid place-items-center rounded-full bg-foreground font-bold leading-none text-background"
        style={{ width: inner, height: inner, fontSize: FONT_REM[outer] }}
      >
        {formatClusterCount(count)}
      </span>
    </span>
  )
}

/* ── clustering (v5-templates `cluster.ts` semantics) ────────────────────── */

/** LM's supercluster options (v5-templates `constants.ts`). */
export const CLUSTER_RADIUS = 60
export const CLUSTER_MAX_ZOOM = 16
export const CLUSTER_MIN_POINTS = 2

export interface ClusterInput<T> {
  /** Container-pixel position — the cockpit's marker overlay already
   *  projects every asset to this space on each pan/zoom. */
  point: { x: number; y: number } | null
  tone: VehicleStatusTone
  datum: T
}

export interface ClusterGroup<T> {
  key: string
  x: number
  y: number
  members: ClusterInput<T>[]
  segments: ClusterBadgeSegment[]
}

const TONE_WORD: Record<VehicleStatusTone, string> = {
  success: 'moving',
  warning: 'idling',
  error: 'stopped',
  muted: 'non-reporting',
}

/**
 * Greedy pixel-space clustering with LM's parameters (radius 60px,
 * minPoints 2, never past zoom 16).
 *
 * WHY NOT supercluster: LM clusters through `supercluster` over lng/lat at
 * the map's integer zoom, which is that library's grid-collapse in TILE
 * space. The cockpit bundle pins React 18 and vendors its own dependency
 * tree (vite.config.ts header) — adding a runtime dep to it is exactly the
 * trade `MapToolDrawer`/`gisTabTables` avoided. The cockpit already projects
 * every marker to CONTAINER PIXELS on every viewport change, and
 * supercluster's radius is itself specified in pixels-at-zoom, so grouping
 * markers that land within 60px of each other reproduces the same collapse
 * ladder without the dependency: the same 60px threshold, the same
 * two-member minimum, and the same "stops clustering once you're zoomed in
 * far enough that nothing overlaps" behaviour.
 */
export function clusterByPixel<T>(
  items: ClusterInput<T>[],
  zoom: number | null,
  enabled = true,
): { clusters: ClusterGroup<T>[]; loose: ClusterInput<T>[] } {
  const placed = items.filter((i): i is ClusterInput<T> & { point: { x: number; y: number } } => i.point != null)
  if (!enabled || (zoom != null && zoom > CLUSTER_MAX_ZOOM)) {
    return { clusters: [], loose: placed }
  }

  const used = new Array(placed.length).fill(false)
  const clusters: ClusterGroup<T>[] = []
  const loose: ClusterInput<T>[] = []

  for (let i = 0; i < placed.length; i++) {
    if (used[i]) continue
    const group: (ClusterInput<T> & { point: { x: number; y: number } })[] = [placed[i]]
    used[i] = true
    for (let j = i + 1; j < placed.length; j++) {
      if (used[j]) continue
      const dx = placed[j].point.x - placed[i].point.x
      const dy = placed[j].point.y - placed[i].point.y
      if (Math.hypot(dx, dy) <= CLUSTER_RADIUS) {
        group.push(placed[j])
        used[j] = true
      }
    }
    if (group.length < CLUSTER_MIN_POINTS) {
      loose.push(group[0])
      continue
    }
    const x = group.reduce((s, g) => s + g.point.x, 0) / group.length
    const y = group.reduce((s, g) => s + g.point.y, 0) / group.length
    const counts: Record<VehicleStatusTone, number> = { success: 0, warning: 0, error: 0, muted: 0 }
    for (const g of group) counts[g.tone] += 1
    clusters.push({
      key: `cluster-${Math.round(x)}-${Math.round(y)}-${group.length}`,
      x,
      y,
      members: group,
      segments: (Object.keys(counts) as VehicleStatusTone[])
        .filter((t) => counts[t] > 0)
        .map((t) => ({ tone: t, count: counts[t], label: TONE_WORD[t] })),
    })
  }

  return { clusters, loose }
}

/** Memoised `clusterByPixel`. */
export function useVehicleClusters<T>(items: ClusterInput<T>[], zoom: number | null, enabled = true) {
  const key = JSON.stringify(items.map((i) => [i.point?.x ?? null, i.point?.y ?? null, i.tone]))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the intentional dep
  return useMemo(() => clusterByPixel(items, zoom, enabled), [key, zoom, enabled])
}
