/** Real geodesic (haversine) distance math. Distances are computed from
 *  coordinates — not hand-tuned numbers. */
const EARTH_RADIUS_MI = 3958.8;
const DEG = Math.PI / 180;

export function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Straight-line (great-circle) miles are always shorter than a real road route.
 * We multiply by a fixed, clearly-labelled road factor so the number is a sane
 * estimate, not a true road distance. Replace with OSRM/Valhalla route length
 * when a routing host is wired.
 */
export const ROAD_FACTOR = 1.25;

export function roadMilesMi(straightMiles: number): number {
  return Math.round(straightMiles * ROAD_FACTOR);
}

export function coordDistanceMi(
  a?: { lat: number; lng: number } | null,
  b?: { lat: number; lng: number } | null,
): number | null {
  if (!a || !b) return null;
  const straight = haversineMi(a.lat, a.lng, b.lat, b.lng);
  return Math.round(straight * ROAD_FACTOR);
}
