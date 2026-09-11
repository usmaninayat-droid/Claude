/**
 * DISCHARGE_STATIONS — mock tanker discharge points for the Plan Monitoring
 * map scene. Coordinates adapted from the old flood-management demo's
 * `DispatchOverlay.tsx` `dischargeStations` fixture (MM-flood-management-main),
 * spread across the QATAR MME service area so every plan has a plausible
 * nearest station.
 */
export interface DischargeStation {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export const DISCHARGE_STATIONS: DischargeStation[] = [
  { id: 'DS-04', label: 'DS-04 · Al Wakrah', lat: 25.295, lng: 51.455 },
  { id: 'DS-02', label: 'DS-02 · Industrial Area', lat: 25.275, lng: 51.435 },
  { id: 'DS-07', label: 'DS-07 · West Bay', lat: 25.31, lng: 51.522 },
  { id: 'DS-01', label: 'DS-01 · Lusail', lat: 25.428, lng: 51.489 },
  { id: 'DS-09', label: 'DS-09 · Al Shahaniya', lat: 25.411, lng: 51.185 },
];

/** Nearest station to a lat/lng point (flat-earth distance — fine at this
 *  scale/zoom). Accepts an explicit station list (default `DISCHARGE_STATIONS`)
 *  so callers building scenes for tests/mocks aren't tied to the module-level
 *  fixture. */
export function nearestDischargeStation(
  lat: number,
  lng: number,
  stations: DischargeStation[] = DISCHARGE_STATIONS,
): DischargeStation {
  let best = stations[0];
  let bestD = Infinity;
  for (const s of stations) {
    const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
