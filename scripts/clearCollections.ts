// Run from project root: npx tsx --tsconfig scripts/tsconfig.json scripts/clearCollections.ts
// Requires: serviceAccountKey.json in project root (Firebase Console > Project Settings > Service Accounts)
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const COLLECTIONS_TO_CLEAR = [
  'bookings',
  'notifications',
  'payment_orders',
  'refunds',
  'reviews',
  'coupons',
  'couponUsage',
  'payments',
  'favorites',
  'audit_logs',
];

async function deleteCollection(collectionName: string): Promise<number> {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) {
    console.log(`  [${collectionName}] — empty, skipping`);
    return 0;
  }
  // Firestore batch delete (max 500 per batch)
  const chunks: admin.firestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < snap.docs.length; i += 500) {
    chunks.push(snap.docs.slice(i, i + 500));
  }
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`  [${collectionName}] — deleted ${snap.size} documents`);
  return snap.size;
}

async function clearFarmhouseReviews(): Promise<number> {
  const farmhousesSnap = await db.collection('farmhouses').get();
  let total = 0;
  for (const farmDoc of farmhousesSnap.docs) {
    const reviewsSnap = await db
      .collection('farmhouses')
      .doc(farmDoc.id)
      .collection('reviews')
      .get();
    if (reviewsSnap.empty) continue;
    const batch = db.batch();
    reviewsSnap.docs.forEach(r => batch.delete(r.ref));
    await batch.commit();
    console.log(`  [farmhouses/${farmDoc.id}/reviews] — deleted ${reviewsSnap.size} documents`);
    total += reviewsSnap.size;
  }
  return total;
}

async function main() {
  console.log('Starting collection cleanup...\n');
  console.log('Keeping: users, farmhouses\n');

  let total = 0;

  for (const col of COLLECTIONS_TO_CLEAR) {
    total += await deleteCollection(col);
  }

  console.log('\nClearing farmhouses subcollection reviews...');
  total += await clearFarmhouseReviews();

  console.log(`\nDone. Total documents deleted: ${total}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
