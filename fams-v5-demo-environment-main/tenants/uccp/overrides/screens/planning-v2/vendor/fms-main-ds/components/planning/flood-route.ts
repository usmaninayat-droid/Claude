import type { LatLng } from '../map';
import type { FloodSiteOption } from './flood-plan-types';

/**
 * flood-route.ts — FM-6353 route optimisation, scoped EXACTLY to the one
 * exception the acceptance criteria carve out: depot → assembly point.
 * No route is ever produced inside the zone or from assembly point to the
 * discharge station (driver navigation is Google Maps).
 *
 * Demo-grade optimiser: a smooth road-like curve between the two sites plus
 * the road-factor distance/ETA a real optimiser would return. Deterministic —
 * the same pair of sites always yields the same line.
 */

export interface OptimizedRoute {
  points: LatLng[];
  /** road distance, km (great-circle × road factor). */
  km: number;
  /** estimated drive time, minutes (urban tanker speed). */
  mins: number;
}

const ROAD_FACTOR = 1.3;
const TANKER_KMH = 42;

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Quadratic-bézier polyline bowed slightly off the straight line, so the
 *  route reads as a road path rather than a ruler line. */
function curve(a: LatLng, b: LatLng, segments = 16): LatLng[] {
  const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // perpendicular offset ~12% of the span, direction fixed by the site pair
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ctrl: LatLng = [mid[0] - dy * 0.24, mid[1] + dx * 0.24];
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1],
    ] as LatLng;
  });
}

/** The depot → assembly optimised route, or null until both sites are chosen. */
export function optimizeDepotAssemblyRoute(
  depot: FloodSiteOption | undefined,
  assembly: FloodSiteOption | undefined,
): OptimizedRoute | null {
  if (!depot || !assembly) return null;
  const km = haversineKm(depot.position, assembly.position) * ROAD_FACTOR;
  return {
    points: curve(depot.position, assembly.position),
    km,
    mins: Math.max(2, Math.round((km / TANKER_KMH) * 60)),
  };
}
