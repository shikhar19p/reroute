/**
 * Pull a [lat, lng] pair out of a Google Maps link, if present. Mirrors
 * extractCoordsFromExpandedUrl in functions/src/index.ts: !3d{lat}!4d{lng} is
 * the actual dropped-pin marker and is preferred over @lat,lng, which is only
 * the viewport center and can drift from the pin after a share.
 */
export function extractCoordsFromMapLink(mapLink: string): [number, number] | null {
  const pin = mapLink.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pin) return [parseFloat(pin[1]), parseFloat(pin[2])];

  const patterns = [
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /\/@(-?\d+\.?\d+),(-?\d+\.?\d+)[,z]/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /place\/[^/]+\/@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /maps\?q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
  ];
  for (const re of patterns) {
    const m = mapLink.match(re);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
}

/**
 * Google's current Share sheet produces links whose redirect target encodes the
 * place as an opaque CID hex pair, with no lat/lng anywhere in the URL —
 * extractCoordsFromMapLink can't find what isn't there. The same URL's
 * /maps/place/ path segment does carry the full place name/address text Google
 * resolved the pin to, though (e.g. "/maps/place/47+Federal+St,+Salem,+MA+01970,
 * +USA/data=..."), which geocodes far more precisely than an owner's own
 * area/city form fields. Mirrors extractPlaceNameFromExpandedUrl in
 * functions/src/index.ts.
 */
export function extractPlaceNameFromMapLink(mapLink: string): string | null {
  const m = mapLink.match(/\/maps\/place\/([^/?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineDistanceKm(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number]
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
