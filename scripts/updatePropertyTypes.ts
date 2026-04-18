/**
 * updatePropertyTypes.ts
 *
 * Uses the Firebase Admin SDK (bypasses Firestore security rules).
 *
 * Prerequisites:
 *   1. Download your service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as  serviceAccountKey.json  in the project root (next to package.json).
 *
 * Run:
 *   npx tsx scripts/updatePropertyTypes.ts
 *
 * What it does:
 *   1. Patches every existing farmhouse document that has no propertyType → sets "farmhouse"
 *   2. Inserts 3 resort sample entries using the new basicDetails structure
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

// ── Resort sample data ────────────────────────────────────────────────────────
const resortEntries = [
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'The Grand Rustique Resort',
      contactPhone1: '9876543210',
      contactPhone2: null,
      city: 'Hyderabad',
      area: 'Shamirpet',
      locationText: 'Shamirpet Lake Road, Near Botanical Gardens',
      mapLink: 'https://maps.google.com/?q=17.5940,78.5080',
      bedrooms: 12,
      capacity: 60,
      description:
        'A premium resort spread across 5 acres with luxury villas, an infinity pool, spa, and banquet facilities. Perfect for destination weddings, corporate retreats, and large-scale events.',
    },
    pricing: {
      weeklyDay: 25000,
      weeklyNight: 35000,
      weekendDay: 30000,
      weekendNight: 45000,
      occasionalDay: 28000,
      occasionalNight: 40000,
      customPricing: [],
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=800',
    ],
    amenities: {
      tv: 12,
      geyser: 12,
      bonfire: 3,
      pool: true,
      chess: 4,
      carroms: 4,
      volleyball: 2,
      decorService: true,
      restaurant: true,
      foodPrepOnDemand: true,
      djMusicSystem: true,
      projector: true,
      customAmenities: 'Spa, Steam Room, Infinity Pool, Banquet Hall, Outdoor Amphitheatre',
    },
    rules: {
      unmarriedNotAllowed: false,
      petsNotAllowed: true,
      quietHours: '11 PM – 6 AM',
      customRules:
        'No outside food or beverages. Formal dress code for dinner. Prior approval required for events.',
    },
    ownerId: 'demo_owner_resort_1',
    status: 'approved',
    rating: 4.8,
    reviews: 42,
    bookedDates: [],
    blockedDates: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Serenity Springs Resort',
      contactPhone1: '9988776655',
      contactPhone2: '9988776644',
      city: 'Hyderabad',
      area: 'Vikarabad',
      locationText: 'Ananthagiri Hills Road, Vikarabad',
      mapLink: 'https://maps.google.com/?q=17.3350,77.9020',
      bedrooms: 8,
      capacity: 40,
      description:
        'Nestled in the Ananthagiri Hills, this eco-resort offers breathtaking valley views, natural spring water, trekking trails, and forest cottages.',
    },
    pricing: {
      weeklyDay: 18000,
      weeklyNight: 24000,
      weekendDay: 22000,
      weekendNight: 30000,
      occasionalDay: 20000,
      occasionalNight: 27000,
      customPricing: [],
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
      'https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=800',
      'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?w=800',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
    ],
    amenities: {
      tv: 8,
      geyser: 8,
      bonfire: 4,
      pool: true,
      chess: 3,
      carroms: 3,
      volleyball: 2,
      decorService: false,
      restaurant: true,
      foodPrepOnDemand: true,
      djMusicSystem: false,
      projector: true,
      customAmenities: 'Nature Walks, Trekking Trails, Bird Watching Deck, Organic Garden',
    },
    rules: {
      unmarriedNotAllowed: false,
      petsNotAllowed: false,
      quietHours: '10 PM – 6 AM',
      customRules:
        'Plastic-free property. Respect the natural surroundings. No loud music after quiet hours.',
    },
    ownerId: 'demo_owner_resort_2',
    status: 'approved',
    rating: 4.7,
    reviews: 28,
    bookedDates: [],
    blockedDates: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Rajwada Heritage Resort',
      contactPhone1: '9123456789',
      contactPhone2: null,
      city: 'Hyderabad',
      area: 'Chevella',
      locationText: 'ORR Exit 14, Chevella Road',
      mapLink: 'https://maps.google.com/?q=17.2550,78.1240',
      bedrooms: 16,
      capacity: 80,
      description:
        'A regal heritage-themed resort with Rajasthani architecture, indoor & outdoor event spaces, a rooftop terrace, and a multi-cuisine restaurant. Ideal for lavish celebrations and corporate off-sites.',
    },
    pricing: {
      weeklyDay: 32000,
      weeklyNight: 48000,
      weekendDay: 40000,
      weekendNight: 60000,
      occasionalDay: 35000,
      occasionalNight: 52000,
      customPricing: [],
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    ],
    amenities: {
      tv: 16,
      geyser: 16,
      bonfire: 5,
      pool: true,
      chess: 6,
      carroms: 6,
      volleyball: 3,
      decorService: true,
      restaurant: true,
      foodPrepOnDemand: true,
      djMusicSystem: true,
      projector: true,
      customAmenities:
        'Heritage Décor, Rooftop Terrace, Dance Floor, Live Music Stage, Outdoor Cinema, Catering for 500+',
    },
    rules: {
      unmarriedNotAllowed: false,
      petsNotAllowed: true,
      quietHours: '12 AM – 6 AM',
      customRules:
        'Advance booking of at least 7 days required. Event-specific permissions needed. No self-catering for events above 50 guests.',
    },
    ownerId: 'demo_owner_resort_3',
    status: 'approved',
    rating: 4.9,
    reviews: 61,
    bookedDates: [],
    blockedDates: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function run() {
  console.log('🔄  Starting property-type data update...\n');

  // ── Step 1: Patch existing documents missing propertyType ─────────────────
  console.log('📝  Step 1: Patching existing farmhouses without propertyType...');
  const snapshot = await db.collection('farmhouses').get();
  let patched = 0;

  const batch = db.batch();
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data.propertyType) {
      batch.update(docSnap.ref, { propertyType: 'farmhouse' });
      console.log(`  ✓ Will patch: ${data.basicDetails?.name || data.name || docSnap.id}`);
      patched++;
    }
  }
  if (patched > 0) {
    await batch.commit();
    console.log(`  → Patched ${patched} document(s).`);
  } else {
    console.log('  → All documents already have propertyType. Nothing to patch.');
  }
  console.log(`  Skipped ${snapshot.size - patched} (already had propertyType).\n`);

  // ── Step 2: Insert resort entries ─────────────────────────────────────────
  console.log('🏨  Step 2: Inserting resort sample entries...');
  for (const resort of resortEntries) {
    const ref = await db.collection('farmhouses').add(resort);
    console.log(`  ✓ Added: ${resort.basicDetails.name}  (ID: ${ref.id})`);
  }

  console.log('\n✅  Done! Firestore is up to date.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Error:', err);
  process.exit(1);
});
