import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { extractCoordsFromMapLink, extractPlaceNameFromMapLink } from './geo';
import { geocodeAddress } from './geocodeClient';

// Process-wide cache — survives re-renders, shared across all screens
const sessionGeoCoords: Record<string, [number, number] | null> = {};

let queue: Promise<void> = Promise.resolve();

interface GeocodableFarmhouse {
  id: string;
  mapLink?: string;
  area?: string;
  city?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Resolves a farmhouse's coordinates for distance-based search/sort, in order:
 * 1. `coordinates` cached on the Firestore doc — set server-side (onFarmhouseCreated
 *    in functions/src/index.ts resolves the owner's Google Maps pin, following
 *    shortened share links, so this is normally already accurate and present).
 * 2. Coordinates embedded directly in the mapLink text, as a client-side fallback
 *    for farmhouses created before that server-side resolution existed.
 * 3. In-memory session cache (already geocoded earlier this session).
 * 4. Background resolution for farmhouses that fell through all of the above —
 *    most commonly a shortened share link (maps.app.goo.gl/...) whose coordinates
 *    only appear after following the redirect, which #2 can't do synchronously.
 *    Expands the link the same way the server does. Google's current share links
 *    encode the place as an opaque CID with no lat/lng in the URL at all, so if
 *    that still doesn't yield coordinates, it geocodes the precise place name/
 *    address Google itself resolved the pin to (from the redirect URL's
 *    /maps/place/ segment) via the geocodeAddress Cloud Function (Google
 *    Geocoding API, server-cached). Only if there's no mapLink at all, or none
 *    of the above worked, does it fall back to the owner's own area/city form
 *    text. Either way the result is written back to the Firestore doc — a
 *    one-time cost per farmhouse shared across all users forever, not per search.
 *
 * Returns the best coords available right now (null while #4 is still pending);
 * pass onResolved to be notified when a background geocode completes.
 */
export function getFarmhouseCoords(
  f: GeocodableFarmhouse,
  onResolved?: (id: string, coords: [number, number] | null) => void
): [number, number] | null {
  if (f.coordinates) return [f.coordinates.lat, f.coordinates.lng];

  const fromLink = f.mapLink ? extractCoordsFromMapLink(f.mapLink) : null;
  if (fromLink) return fromLink;

  if (f.id in sessionGeoCoords) return sessionGeoCoords[f.id];

  if (onResolved) {
    sessionGeoCoords[f.id] = null; // mark in-flight so callers don't queue it twice
    queue = queue.then(async () => {
      let coords: [number, number] | null = null;
      let expandedUrl: string | null = null;
      try {
        // Shortened share links carry no coordinates in their own text — the
        // redirect target does. A plain fetch follows it without a geocoding call.
        if (f.mapLink) {
          const res = await fetch(f.mapLink, { redirect: 'follow' });
          expandedUrl = res.url;
          coords = extractCoordsFromMapLink(res.url);
        }
      } catch {
        // fall through below
      }

      // Google's current share links don't embed lat/lng at all (see
      // extractPlaceNameFromMapLink) — geocode the precise place/address text
      // Google itself resolved the pin to, before falling all the way back to
      // the owner's own (often vaguer) area/city form fields.
      if (!coords && expandedUrl) {
        const placeName = extractPlaceNameFromMapLink(expandedUrl);
        if (placeName) coords = await geocodeAddress(placeName);
      }

      if (!coords) {
        const place = [f.area, f.city, f.location].filter(Boolean).join(', ');
        if (place) {
          coords = await geocodeAddress(place);
        }
      }

      sessionGeoCoords[f.id] = coords;
      if (coords) {
        updateDoc(doc(db, 'farmhouses', f.id), { coordinates: { lat: coords[0], lng: coords[1] } }).catch(() => {});
      }
      onResolved(f.id, coords);
    });
  }

  return null;
}
