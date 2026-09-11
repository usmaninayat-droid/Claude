import { useState } from 'react'
import { AlertOctagonIcon } from '@fams/ui-kit'
import type { LiveIncidentDatum } from './live-types'

/**
 * IncidentPin — an incident's map pin on the Live Monitoring map (the
 * Incidents panel's map-side half). A filled circle in the incident's own
 * SEVERITY colour (`uiConfig.map.records.colorBy` — the same legend the
 * incidents hybrid's own map already paints, reused rather than reinvented)
 * carrying an alert-octagon glyph — the same glyph `LiveMapTools`' Incidents
 * tool button uses, so the control and the layer it opens read as one thing.
 *
 * Rides the `pins`/`renderPin` DOM channel (`PoiPin`'s pattern) — explicitly
 * NON-CLUSTERED, so it coexists with the vehicle marker/cluster layer
 * without either interfering with the other.
 */
export interface IncidentPinProps {
  incident: LiveIncidentDatum
  selected?: boolean
  onClick?: () => void
}

export function IncidentPin({ incident, selected, onClick }: IncidentPinProps) {
  const [hovered, setHovered] = useState(false)
  const color = incident.color ?? 'var(--color-destructive)'
  return (
    <button
      type="button"
      data-slot="incident-pin"
      aria-label={`Incident ${incident.label}`}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onClick}
      className="relative flex flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {hovered || selected ? (
        <span
          role="tooltip"
          className="absolute bottom-full mb-1 w-max max-w-56 rounded-xs bg-foreground/90 px-2 py-1 text-start text-caption text-background"
        >
          <span className="block truncate font-medium">{incident.label}</span>
        </span>
      ) : null}
      {incident.pulse ? (
        /* Pulsing halo (Command Center v2): `animate-ping` behind the glyph
           in the pin's own severity colour — `motion-safe:` keeps it inert
           for users who asked for reduced motion. */
        <span
          aria-hidden="true"
          data-slot="incident-pin-pulse"
          className="absolute bottom-0 size-7 rounded-full opacity-60 motion-safe:animate-ping"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span
        aria-hidden="true"
        data-slot="incident-pin-glyph"
        className="grid size-7 shrink-0 place-items-center rounded-full drop-shadow-sm"
        style={{
          backgroundColor: color,
          boxShadow: selected ? '0 0 0 2px var(--color-card), 0 0 0 4px var(--color-ring)' : '0 0 0 2px var(--color-card)',
        }}
      >
        <AlertOctagonIcon className="size-4 text-white" aria-hidden="true" />
      </span>
    </button>
  )
}

IncidentPin.displayName = 'IncidentPin'
