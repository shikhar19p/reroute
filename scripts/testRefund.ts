/**
 * Test Refund Script
 * Usage: npm run test-refund -- <bookingId>
 *
 * Directly calls the Razorpay refund API (bypasses app auth / dashboard).
 * Works in test mode without needing real funds.
 * Requires: serviceAccountKey.json in project root
 */

import * as admin from 'firebase-admin';
import * as https from 'https';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '..', '.env') });

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const KEY_ID = process.env.RAZORPAY_KEY_ID!;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

function razorpayRequest(method: string, path: string, body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    const payload = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: 'api.razorpay.com',
      path,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed?.error?.description || parsed?.error?.code || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const bookingId = process.argv[2];

  if (!bookingId) {
    console.error('Usage: npm run test-refund -- <bookingId>');
    console.error('\nTo find a booking ID, check your Firestore bookings collection.');
    process.exit(1);
  }

  if (!KEY_ID || !KEY_SECRET) {
    console.error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    process.exit(1);
  }

  console.log(`\nFetching booking: ${bookingId}`);
  const bookingSnap = await db.collection('bookings').doc(bookingId).get();

  if (!bookingSnap.exists) {
    console.error('Booking not found.');
    process.exit(1);
  }

  const booking = bookingSnap.data()!;
  console.log(`  Farmhouse : ${booking.farmhouseName}`);
  console.log(`  Status    : ${booking.status}`);
  console.log(`  Payment   : ${booking.paymentStatus}`);
  console.log(`  Amount    : ₹${booking.totalPrice}`);
  console.log(`  TxnID     : ${booking.transactionId || 'N/A'}`);

  const paymentId = booking.transactionId;

  if (!paymentId || !paymentId.startsWith('pay_')) {
    console.error('\nNo valid Razorpay payment ID (pay_xxx) found on this booking.');
    console.error('The booking must have been paid through the app for a refund to work.');
    process.exit(1);
  }

  // Fetch payment from Razorpay to check status
  console.log(`\nFetching payment ${paymentId} from Razorpay...`);
  const payment = await razorpayRequest('GET', `/v1/payments/${paymentId}`);
  console.log(`  Payment status : ${payment.status}`);
  console.log(`  Captured amount: ₹${payment.amount / 100}`);

  if (payment.status === 'failed') {
    console.error('Cannot refund a failed payment.');
    process.exit(1);
  }

  if (payment.status === 'authorized') {
    console.log('\nPayment is only authorized (not captured). Capturing first...');
    await razorpayRequest('POST', `/v1/payments/${paymentId}/capture`, {
      amount: payment.amount,
      currency: payment.currency,
    });
    console.log('  Captured successfully.');
  }

  // Calculate refund amount (50% if >48h before check-in, else full for test purposes)
  const refundAmountRupees = booking.refundAmount ?? booking.totalPrice;
  const refundAmountPaise = Math.round(refundAmountRupees * 100);

  console.log(`\nInitiating refund of ₹${refundAmountRupees} for booking ${bookingId}...`);

  const refund = await razorpayRequest('POST', `/v1/payments/${paymentId}/refund`, {
    amount: refundAmountPaise,
    notes: { bookingId, reason: 'Test refund via script' },
  });

  console.log(`\nRefund created:`);
  console.log(`  Refund ID : ${refund.id}`);
  console.log(`  Status    : ${refund.status}`);
  console.log(`  Amount    : ₹${refund.amount / 100}`);

  // Update booking in Firestore
  const refundStatus = refund.status === 'processed' ? 'completed' : 'processing';
  await db.collection('bookings').doc(bookingId).update({
    refundStatus,
    razorpayRefundId: refund.id,
    refundAmount: refundAmountRupees,
    refundDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Also log to refunds collection
  await db.collection('refunds').add({
    refundId: refund.id,
    paymentId,
    bookingId,
    amount: refundAmountPaise,
    status: refund.status,
    reason: 'Test refund via script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\nFirestore updated — booking refundStatus: ${refundStatus}`);
  console.log('\nDone. Check Razorpay test dashboard → Refunds to confirm.');

  process.exit(0);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
