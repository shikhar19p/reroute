import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, limit as fsLimit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const CACHE_KEY = 'rr_ratings_v2';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Process-wide cache — survives re-renders, shared across all screens
export const sessionRatings: Record<string, number> = {};

export interface RatableItem {
  id: string;
  rating: number;
}

/**
 * Resolves ratings for a list of items using the same 4-step strategy as ExploreScreen:
 * 1. Firestore rating field (live, always wins)
 * 2. Session cache
 * 3. AsyncStorage cache (1hr TTL)
 * 4. Background-fetch from reviews subcollection
 *
 * Calls onUpdate whenever new ratings become available.
 */
export function resolveRatings(
  items: RatableItem[],
  onUpdate: (ratings: Record<string, number>) => void
): void {
  if (items.length === 0) return;

  // Step 1+2: Firestore field wins, then session cache
  const initial: Record<string, number> = {};
  items.forEach(f => {
    if (f.rating > 0) {
      initial[f.id] = f.rating;
      sessionRatings[f.id] = f.rating;
    } else if (sessionRatings[f.id]) {
      initial[f.id] = sessionRatings[f.id];
    }
  });
  if (Object.keys(initial).length > 0) onUpdate(initial);

  // Step 3+4: AsyncStorage then network
  const needFetch = items.filter(f => !sessionRatings[f.id]);
  if (needFetch.length === 0) return;

  AsyncStorage.getItem(CACHE_KEY).then(async (raw) => {
    let cached: { data: Record<string, number>; ts: number } = { data: {}, ts: 0 };
    try { if (raw) cached = JSON.parse(raw); } catch {}

    const fromStorage: Record<string, number> = {};
    needFetch.forEach(f => {
      if (cached.data[f.id]) {
        fromStorage[f.id] = cached.data[f.id];
        sessionRatings[f.id] = cached.data[f.id];
      }
    });
    if (Object.keys(fromStorage).length > 0) onUpdate(fromStorage);

    if (Date.now() - cached.ts < CACHE_TTL) return;

    const toFetch = needFetch.filter(f => !cached.data[f.id]);
    if (toFetch.length === 0) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: cached.data, ts: Date.now() })).catch(() => {});
      return;
    }

    const results = await Promise.all(
      toFetch.map(async (f) => {
        try {
          const snap = await getDocs(query(collection(db, 'farmhouses', f.id, 'reviews'), fsLimit(200)));
          if (!snap.empty) {
            let total = 0;
            snap.forEach(d => { total += d.data().rating || 0; });
            return [f.id, total / snap.size] as [string, number];
          }
        } catch {}
        return null;
      })
    );

    const fresh: Record<string, number> = {};
    results.forEach(r => { if (r) { fresh[r[0]] = r[1]; sessionRatings[r[0]] = r[1]; } });
    if (Object.keys(fresh).length > 0) onUpdate(fresh);

    const merged = { ...cached.data, ...fresh };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() })).catch(() => {});
  }).catch(() => {});
}
