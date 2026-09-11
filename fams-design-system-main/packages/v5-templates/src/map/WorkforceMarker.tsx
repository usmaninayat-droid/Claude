import { cn } from '../lib/cn'
import { LIVE_WORKFORCE_STATUS_LABEL, resolveWorkforceArtStatus, type LiveWorkforceStatus } from './live-types'
import { WORKFORCE_MARKER_ART, WORKFORCE_MARKER_ART_H, WORKFORCE_MARKER_ART_W } from './workforce-icon-art'

/**
 * WorkforceMarker — the on-map workforce-member pin (task requirement §3,
 * pixel reference: FAMS Workforce Management App, Figma
 * 6Twj2L7KPGP5y8unBP9KS6, nodes 3439:4860/6849/9590). Sits on the SAME
 * `MapPanel` marker channel `VehicleMarker` rides (`LiveMapView.tsx`'s
 * `renderMarker`, mounted `anchor="bottom"`) — reusing the existing marker
 * machinery per the task's scope call, not a new map layer.
 *
 * Unlike `VehicleMarker`, the ring/tint colour per duty status is BAKED INTO
 * the vendored art (`workforce-icon-art.ts`) rather than composed from the
 * shared `VehicleStatusTone` badge system — see that file's docblock for why
 * (no "info"/blue member in the shared 4-tone vocabulary). The art already
 * includes the pointer tail at its own bottom edge, so the plain `<img>`
 * needs no extra leader-line chrome to land correctly on `anchor="bottom"`.
 */
export interface WorkforceMarkerProps {
  /** Full name — the accessible name's subject. */
  name: string
  status: LiveWorkforceStatus
  /** Job title / designation — decides field (green) vs office (blue) coin
   *  when `status` is `clocked-in`, see `resolveWorkforceArtStatus`. */
  designation?: string
  /** Selected treatment — slightly enlarged + drop shadow (keeps the tint,
   *  same "already carries the info" reasoning `VehicleMarker` selected uses
   *  — the popup/card opening on top repeats the status). */
  selected?: boolean
  /** De-emphasize — a sibling marker is selected and this one is not
   *  (mirrors `VehicleMarker.dimmed`, UX G.35). */
  dimmed?: boolean
  onClick?: () => void
}

const MARKER_DISPLAY_W = 32
const MARKER_DISPLAY_H = Math.round((MARKER_DISPLAY_W / WORKFORCE_MARKER_ART_W) * WORKFORCE_MARKER_ART_H)

export function WorkforceMarker({
  name,
  status,
  designation,
  selected = false,
  dimmed = false,
  onClick,
}: WorkforceMarkerProps) {
  return (
    <button
      type="button"
      data-slot="workforce-marker"
      aria-label={`${name} — ${LIVE_WORKFORCE_STATUS_LABEL[status]}`}
      onClick={onClick}
      className={cn(
        'relative flex items-end justify-center bg-transparent p-0 outline-none transition-[opacity,transform]',
        'focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'z-10 scale-110 drop-shadow-md' : 'scale-100',
        dimmed ? 'opacity-40' : 'opacity-100',
      )}
      style={{ width: MARKER_DISPLAY_W, height: MARKER_DISPLAY_H }}
    >
      <img
        src={WORKFORCE_MARKER_ART[resolveWorkforceArtStatus(status, designation)]}
        width={MARKER_DISPLAY_W}
        height={MARKER_DISPLAY_H}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="block"
      />
    </button>
  )
}

WorkforceMarker.displayName = 'WorkforceMarker'
