import { getFunctions, httpsCallable } from 'firebase/functions';

// In-memory session cache on top of the server-side Firestore cache in the
// geocodeAddress Cloud Function — avoids a function round-trip entirely for a
// query already resolved earlier this session (e.g. typing then re-typing
// the same location filter text).
const sessionCache: Record<string, [number, number] | null> = {};

let geocodeFn: ReturnType<typeof httpsCallable<{ query: string }, { lat: number | null; lng: number | null }>> | null = null;

/** Resolves free-text (place name, area, city) to [lat, lng] via the server-side geocodeAddress Cloud Function (Google Geocoding API). */
export async function geocodeAddress(query: string): Promise<[number, number] | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (key in sessionCache) return sessionCache[key];

  if (!geocodeFn) {
    geocodeFn = httpsCallable(getFunctions(), 'geocodeAddress');
  }

  try {
    const res = await geocodeFn({ query });
    const coords: [number, number] | null =
      res.data?.lat != null && res.data?.lng != null ? [res.data.lat, res.data.lng] : null;
    sessionCache[key] = coords;
    return coords;
  } catch {
    // Don't cache the failure — a network hiccup shouldn't permanently blank this query for the session.
    return null;
  }
}
