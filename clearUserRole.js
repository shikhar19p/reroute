// Quick script to clear user role from Firestore
// Run this with: node clearUserRole.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to download service account key from Firebase Console)
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearUserRole(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      role: admin.firestore.FieldValue.delete()
    });
    console.log('✅ Role deleted for user:', userId);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Your user ID from logs: goNVEfhNE2PnXzkHIRkwLzG7Flt1
clearUserRole('goNVEfhNE2PnXzkHIRkwLzG7Flt1')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
