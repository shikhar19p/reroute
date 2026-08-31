/**
 * One-time backfill: resolves `coordinates` on every existing farmhouse doc
 * whose owner pasted a Google Maps link, using the same resolution chain as
 * onFarmhouseCreated in functions/src/index.ts (which only ever runs once,
 * on document *creation* — it never touches docs that already existed before
 * that trigger's logic changed, which is every farmhouse currently in
 * production/staging as of the CID-share-link fix).
 *
 * Chain, in order:
 *   1. Coordinates embedded directly in the link text (@lat,lng or !3d!4d).
 *   2. Follow the link's redirect (shortened maps.app.goo.gl links) and retry #1
 *      on the resolved URL.
 *   3. Google's current Share-sheet links encode the place as an opaque CID with
 *      no lat/lng anywhere in the URL — extract the place name/address from the
 *      resolved URL's /maps/place/ segment instead, and geocode *that* via
 *      Google's Geocoding API (far more precise than the owner's own area/city
 *      form fields).
 *   4. If there's no mapLink at all, or none of the above resolved, fall back to
 *      geocoding the owner's area/city/location text.
 *
 * Re-resolves EVERY farmhouse with a mapLink by default (not just ones missing
 * `coordinates`) — a farmhouse viewed in the app between the earlier text-geocode
 * fallback and this fix may already have a coarse, wrong value cached from that
 * window. Pass --skip-existing to only fill in docs with no coordinates at all
 * (cheaper resume after an interrupted run).
 *
 * Usage:
 *   node scripts/backfill-farmhouse-coordinates.js --project reroute-aventures-dev [--dry-run] [--skip-existing]
 *   node scripts/backfill-farmhouse-coordinates.js --project rustique-6b7c4
 *
 * Requires: firebase CLI logged in (uses application default credentials for
 * Firestore access, and `firebase functions:secrets:access` to read the Maps
 * API key straight from Secret Manager — never printed, never pasted here).
 */
const { execFileSync } = require('child_process');
const path = require('path');
// firebase-admin only lives in functions/node_modules (it's a functions-only
// dependency, not installed at the repo root) — resolve it from there.
const requireFromFunctions = require('module').createRequire(path.join(__dirname, '../functions/package.json'));
const { initializeApp, applicationDefault } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');

const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const projectId = projectIdx !== -1 ? args[projectIdx + 1] : null;
const dryRun = args.includes('--dry-run');
const skipExisting = args.includes('--skip-existing');

if (!projectId) {
  console.error('Usage: node scripts/backfill-farmhouse-coordinates.js --project <reroute-aventures-dev|rustique-6b7c4> [--dry-run] [--skip-existing]');
  process.exit(1);
}

function getApiKey(project) {
  // Shells out to the Firebase CLI's own secret-reading command so the key is
  // read straight from Secret Manager into this process's memory — it's never
  // printed to this script's own output or logged anywhere.
  const out = execFileSync('npx', ['firebase', 'functions:secrets:access', 'GOOGLE_MAPS_API_KEY', '--project', project], {
    encoding: 'utf8',
    shell: true,
  });
  const key = out.trim().split('\n').pop().trim();
  if (!key) throw new Error('Could not read GOOGLE_MAPS_API_KEY from Secret Manager — is it set for this project?');
  return key;
}

function extractCoordsFromExpandedUrl(url) {
  const pin = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pin) return { lat: parseFloat(pin[1]), lng: parseFloat(pin[2]) };
  const at = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  const ll = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (ll) return { lat: parseFloat(ll[1]), lng: parseFloat(ll[2]) };
  return null;
}

function extractPlaceNameFromExpandedUrl(url) {
  const m = url.match(/\/maps\/place\/([^/?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

async function geocodeText(query, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=in&components=country:IN&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  const loc = json?.status === 'OK' ? json.results?.[0]?.geometry?.location : null;
  if (!loc) {
    console.warn(`  geocode miss for "${query}": ${json?.status}`);
    return null;
  }
  return { lat: loc.lat, lng: loc.lng };
}

async function resolveMapLinkCoordinates(mapLink, apiKey) {
  const direct = extractCoordsFromExpandedUrl(mapLink);
  if (direct) return direct;

  let expandedUrl = mapLink;
  try {
    const res = await fetch(mapLink, { redirect: 'follow' });
    expandedUrl = res.url;
  } catch (err) {
    console.warn(`  could not follow redirect for ${mapLink}: ${err.message}`);
    return null;
  }

  const fromUrl = extractCoordsFromExpandedUrl(expandedUrl);
  if (fromUrl) return fromUrl;

  const placeName = extractPlaceNameFromExpandedUrl(expandedUrl);
  if (!placeName) return null;
  return geocodeText(placeName, apiKey);
}

async function main() {
  const apiKey = getApiKey(projectId);
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();

  const snap = await db.collection('farmhouses').get();
  console.log(`${snap.size} farmhouse doc(s) in ${projectId}.`);

  let resolved = 0, unchanged = 0, noLink = 0, failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const mapLink = data.basicDetails?.mapLink || data.mapLink;

    if (skipExisting && data.coordinates) {
      unchanged++;
      continue;
    }

    let coords = null;
    if (mapLink) {
      coords = await resolveMapLinkCoordinates(mapLink, apiKey);
    }
    if (!coords) {
      const area = data.basicDetails?.area || data.area;
      const city = data.basicDetails?.city || data.city;
      const location = data.basicDetails?.locationText || data.location;
      const place = [area, city, location].filter(Boolean).join(', ');
      if (place) coords = await geocodeText(place, apiKey);
    }

    if (!coords) {
      console.log(`${doc.id}: no mapLink and no area/city text — skipped`);
      noLink++;
      continue;
    }

    const name = data.basicDetails?.name || data.name || '(unnamed)';
    console.log(`${doc.id} (${name}): ${coords.lat}, ${coords.lng}`);
    resolved++;

    if (!dryRun) {
      try {
        await doc.ref.update({ coordinates: coords });
      } catch (err) {
        console.error(`  failed to write coordinates for ${doc.id}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('');
  console.log(`Done. resolved=${resolved} unchanged(skipped)=${unchanged} no-location-data=${noLink} write-failed=${failed}${dryRun ? ' [DRY RUN — nothing written]' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
