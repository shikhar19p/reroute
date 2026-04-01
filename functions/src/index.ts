/**
 * Firebase Cloud Functions for Razorpay Payment Integration + Email Notifications
 *
 * Functions:
 * - createOrder            — create a Razorpay order (server-side)
 * - verifyPayment          — verify HMAC signature + confirm booking + send confirmation emails
 * - processRefund          — process Razorpay refund + send refund emails
 * - notifyBookingCancellation — send cancellation emails (called after client-side cancel)
 * - razorpayWebhook        — handle Razorpay webhook events
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

admin.initializeApp();
const db = admin.firestore();

// ─── Razorpay ────────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id,
  key_secret: process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret,
});

// ─── Nodemailer transporter ───────────────────────────────────────────────────
// Set these in Firebase Functions config or .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || functions.config().smtp?.host || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || functions.config().smtp?.port || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER || functions.config().smtp?.user,
    pass: process.env.SMTP_PASS || functions.config().smtp?.pass,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || functions.config().smtp?.from || 'noreply@reroute.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || functions.config().smtp?.admin_email || '';

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  try {
    await smtpTransporter.sendMail({
      from: `"Reroute" <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    functions.logger.info('📧 Email sent:', { to, subject });
  } catch (err) {
    // Never let email failure crash payment/booking flows
    functions.logger.error('📧 Email send failed (non-fatal):', { to, subject, err });
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reroute</title>
</head>
<body style="margin:0;padding:0;background:#F9F8EF;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F8EF;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr style="background:#4CAF50;">
          <td style="padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:1px;">Reroute</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Your Farmhouse Booking Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr style="background:#f5f5f5;">
          <td style="padding:20px 32px;text-align:center;color:#888;font-size:12px;">
            <p style="margin:0;">© ${new Date().getFullYear()} Reroute. All rights reserved.</p>
            <p style="margin:4px 0 0;">If you did not make this booking, please contact <a href="mailto:support@reroute.app" style="color:#4CAF50;">support@reroute.app</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function bookingConfirmationUserEmail(b: any): string {
  return baseLayout(`
    <h2 style="color:#4CAF50;margin-top:0;">Booking Confirmed! 🎉</h2>
    <p>Hi <strong>${b.userName}</strong>,</p>
    <p>Your booking has been confirmed and payment received. Here are your booking details:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Guests</td><td style="padding:12px 16px;">${b.guests}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Booking Type</td><td style="padding:12px 16px;">${b.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount Paid</td><td style="padding:12px 16px;font-weight:bold;color:#4CAF50;">₹${b.totalPrice}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Payment ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.transactionId || '—'}</td></tr>
    </table>

    <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#2E7D32;"><strong>Check-in Time:</strong> 11:00 AM &nbsp;|&nbsp; <strong>Check-out Time:</strong> 11:00 AM</p>
    </div>

    <p style="color:#555;">For any queries, contact the property owner or reach out to us at <a href="mailto:support@reroute.app" style="color:#4CAF50;">support@reroute.app</a>.</p>
    <p style="margin-bottom:0;">Happy staying! 🏡</p>
  `);
}

function bookingConfirmationOwnerEmail(b: any): string {
  return baseLayout(`
    <h2 style="color:#4CAF50;margin-top:0;">New Booking Received! 💼</h2>
    <p>A new booking has been confirmed for <strong>${b.farmhouseName}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Guest Name</td><td style="padding:12px 16px;">${b.userName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Guest Email</td><td style="padding:12px 16px;">${b.userEmail}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Guest Phone</td><td style="padding:12px 16px;">${b.userPhone || '—'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Guests</td><td style="padding:12px 16px;">${b.guests}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount</td><td style="padding:12px 16px;font-weight:bold;color:#4CAF50;">₹${b.totalPrice}</td></tr>
    </table>

    <p style="color:#555;">Please ensure the property is ready for check-in. Log in to the Reroute owner dashboard to manage your bookings.</p>
  `);
}

function bookingConfirmationAdminEmail(b: any): string {
  return baseLayout(`
    <h2 style="color:#1565C0;margin-top:0;">📋 New Booking — Admin Notice</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Customer</td><td style="padding:12px 16px;">${b.userName} (${b.userEmail})</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Guests</td><td style="padding:12px 16px;">${b.guests}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount</td><td style="padding:12px 16px;font-weight:bold;">₹${b.totalPrice}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Payment ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.transactionId || '—'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Coupon</td><td style="padding:12px 16px;">${b.couponCode || 'None'}</td></tr>
    </table>
  `);
}

function cancellationUserEmail(b: any, refundAmount: number, refundPercentage: number, reason: string): string {
  const hasRefund = refundAmount > 0;
  return baseLayout(`
    <h2 style="color:#F44336;margin-top:0;">Booking Cancelled</h2>
    <p>Hi <strong>${b.userName}</strong>,</p>
    <p>Your booking for <strong>${b.farmhouseName}</strong> has been cancelled.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Cancellation Reason</td><td style="padding:12px 16px;">${reason}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount Paid</td><td style="padding:12px 16px;">₹${b.totalPrice}</td></tr>
      <tr style="background:${hasRefund ? '#E8F5E9' : '#FFF3E0'};"><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund Amount</td><td style="padding:12px 16px;font-weight:bold;color:${hasRefund ? '#2E7D32' : '#E65100'};">${hasRefund ? `₹${refundAmount} (${refundPercentage}%)` : 'No refund applicable'}</td></tr>
    </table>

    ${hasRefund ? `
    <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#2E7D32;"><strong>Refund of ₹${refundAmount}</strong> will be credited to your original payment method within <strong>5–7 business days</strong>.</p>
    </div>` : `
    <div style="background:#FFF3E0;border-left:4px solid #FF9800;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#E65100;">${reason}</p>
    </div>`}

    <p style="color:#555;">If you have any questions, contact us at <a href="mailto:support@reroute.app" style="color:#4CAF50;">support@reroute.app</a>.</p>
  `);
}

function cancellationOwnerEmail(b: any, reason: string, isOwnerCancellation: boolean): string {
  return baseLayout(`
    <h2 style="color:#F44336;margin-top:0;">Booking Cancellation Notice</h2>
    <p>${isOwnerCancellation ? 'You cancelled the following booking:' : 'A guest has cancelled their booking at your property.'}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Guest</td><td style="padding:12px 16px;">${b.userName} (${b.userEmail})</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Reason</td><td style="padding:12px 16px;">${reason}</td></tr>
    </table>

    <p style="color:#555;">The dates have been unblocked and are available for new bookings.</p>
  `);
}

function cancellationAdminEmail(b: any, refundAmount: number, reason: string, isOwnerCancellation: boolean): string {
  return baseLayout(`
    <h2 style="color:#F44336;margin-top:0;">📋 Booking Cancelled — Admin Notice</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Customer</td><td style="padding:12px 16px;">${b.userName} (${b.userEmail})</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Cancelled By</td><td style="padding:12px 16px;">${isOwnerCancellation ? 'Property Owner' : 'Customer'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Reason</td><td style="padding:12px 16px;">${reason}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount Paid</td><td style="padding:12px 16px;">₹${b.totalPrice}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund Amount</td><td style="padding:12px 16px;font-weight:bold;">₹${refundAmount}</td></tr>
    </table>
  `);
}

function refundStatusEmail(b: any, refundAmount: number, refundId: string | null, status: 'processed' | 'failed'): string {
  const isSuccess = status === 'processed';
  return baseLayout(`
    <h2 style="color:${isSuccess ? '#4CAF50' : '#F44336'};margin-top:0;">
      ${isSuccess ? '✅ Refund Processed' : '❌ Refund Failed'}
    </h2>
    <p>Hi <strong>${b.userName}</strong>,</p>

    ${isSuccess ? `
    <p>Your refund of <strong>₹${refundAmount}</strong> for the cancelled booking at <strong>${b.farmhouseName}</strong> has been processed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund Amount</td><td style="padding:12px 16px;font-weight:bold;color:#4CAF50;">₹${refundAmount}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Razorpay Refund ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${refundId || '—'}</td></tr>
    </table>
    <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#2E7D32;">The refund will reflect in your account within <strong>5–7 business days</strong> depending on your bank.</p>
    </div>` : `
    <p>We were unable to process your refund of <strong>₹${refundAmount}</strong> for the cancelled booking at <strong>${b.farmhouseName}</strong>.</p>
    <div style="background:#FFEBEE;border-left:4px solid #F44336;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#C62828;">Our team has been notified and will process your refund manually. Please contact <a href="mailto:support@reroute.app" style="color:#F44336;">support@reroute.app</a> with your Booking ID for faster resolution.</p>
    </div>`}

    <p style="color:#555;">Booking ID: <code>${b.id || b.bookingId}</code></p>
  `);
}

// ─── Helper: get farmhouse owner email ───────────────────────────────────────
async function getOwnerEmail(farmhouseId: string): Promise<string | null> {
  try {
    const farmhouseDoc = await db.collection('farmhouses').doc(farmhouseId).get();
    if (!farmhouseDoc.exists) return null;
    const ownerId = farmhouseDoc.data()?.ownerId;
    if (!ownerId) return null;
    const ownerDoc = await db.collection('users').doc(ownerId).get();
    return ownerDoc.data()?.email || null;
  } catch {
    return null;
  }
}

// ─── Helper: send all booking confirmation emails ─────────────────────────────
async function sendBookingConfirmationEmails(bookingId: string, transactionId: string): Promise<void> {
  try {
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) return;
    const b: any = { bookingId, ...bookingDoc.data() };

    const ownerEmail = await getOwnerEmail(b.farmhouseId);
    const recipients: string[] = [];
    if (ownerEmail) recipients.push(ownerEmail);
    if (ADMIN_EMAIL) recipients.push(ADMIN_EMAIL);

    // Customer confirmation
    if (b.userEmail) {
      await sendEmail(
        b.userEmail,
        `Booking Confirmed — ${b.farmhouseName} | Reroute`,
        bookingConfirmationUserEmail({ ...b, transactionId })
      );
    }

    // Owner notification
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `New Booking Received — ${b.farmhouseName} | Reroute`,
        bookingConfirmationOwnerEmail(b)
      );
    }

    // Admin notification
    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `[Admin] New Booking — ${b.farmhouseName}`,
        bookingConfirmationAdminEmail({ ...b, transactionId })
      );
    }
  } catch (err) {
    functions.logger.error('Error sending booking confirmation emails:', err);
  }
}

// ─── createOrder ──────────────────────────────────────────────────────────────
export const createOrder = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to create an order');
    }

    const { amount, currency = 'INR', bookingId, userId } = data;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid amount provided');
    }
    if (!bookingId || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Booking ID and User ID are required');
    }
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'User can only create orders for their own bookings');
    }

    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `booking_${bookingId}`,
      notes: { bookingId, userId },
    });

    functions.logger.info('Razorpay order created:', { orderId: order.id, bookingId, amount: amountInPaise });

    await db.collection('payment_orders').doc(order.id).set({
      orderId: order.id,
      bookingId,
      userId,
      amount: amountInPaise,
      currency,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id,
    };
  } catch (error: any) {
    functions.logger.error('Error creating Razorpay order:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to create payment order', error.message);
  }
});

// ─── verifyPayment ────────────────────────────────────────────────────────────
export const verifyPayment = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to verify payment');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required payment verification parameters');
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = generatedSignature === razorpay_signature;

    functions.logger.info('Payment verification:', { orderId: razorpay_order_id, paymentId: razorpay_payment_id, verified: isValid });

    if (isValid) {
      await db.collection('payment_orders').doc(razorpay_order_id).update({
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'verified',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (bookingId) {
        await db.collection('bookings').doc(bookingId).update({
          paymentStatus: 'paid',
          status: 'confirmed',
          transactionId: razorpay_payment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Booking confirmed:', { bookingId, paymentId: razorpay_payment_id });

        // Send confirmation emails (non-blocking)
        sendBookingConfirmationEmails(bookingId, razorpay_payment_id).catch(() => {});
      }
    }

    return { success: true, verified: isValid, paymentId: razorpay_payment_id };
  } catch (error: any) {
    functions.logger.error('Error verifying payment:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to verify payment', error.message);
  }
});

// ─── processRefund ────────────────────────────────────────────────────────────
export const processRefund = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to process refund');
    }

    const { paymentId, amount, bookingId, reason = 'Booking cancellation' } = data;

    if (!paymentId || !amount || !bookingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Payment ID, amount, and booking ID are required');
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found');
    }

    const booking = bookingDoc.data();

    const isBookingUser = booking?.userId === context.auth.uid;
    let isFarmhouseOwner = false;
    if (!isBookingUser && booking?.farmhouseId) {
      const farmhouseDoc = await db.collection('farmhouses').doc(booking.farmhouseId).get();
      isFarmhouseOwner = farmhouseDoc.data()?.ownerId === context.auth.uid;
    }

    if (!isBookingUser && !isFarmhouseOwner) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized to process this refund');
    }

    // Validate the payment ID exists in Razorpay before attempting refund
    if (!paymentId.startsWith('pay_')) {
      throw new functions.https.HttpsError('invalid-argument', `Invalid Razorpay payment ID: ${paymentId}`);
    }

    const amountInPaise = Math.round(amount * 100);

    functions.logger.info('Processing refund:', { paymentId, bookingId, amountInPaise, reason });

    let refund: any;
    try {
      refund = await razorpay.payments.refund(paymentId, {
        amount: amountInPaise,
        notes: { bookingId, reason },
      });
    } catch (razorpayErr: any) {
      // Log the actual Razorpay error details for debugging
      functions.logger.error('Razorpay refund API error:', {
        error: razorpayErr?.error || razorpayErr,
        message: razorpayErr?.message,
        description: razorpayErr?.error?.description,
        code: razorpayErr?.statusCode,
        paymentId,
        bookingId,
      });
      throw new functions.https.HttpsError(
        'internal',
        razorpayErr?.error?.description || razorpayErr?.message || 'Failed to process refund',
        razorpayErr?.message
      );
    }

    functions.logger.info('Refund processed:', { refundId: refund.id, paymentId, bookingId, amount: amountInPaise });

    await db.collection('refunds').add({
      refundId: refund.id,
      paymentId,
      bookingId,
      userId: context.auth.uid,
      amount: amountInPaise,
      status: refund.status,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const refundStatus = refund.status === 'processed' ? 'completed' : 'processing';
    await db.collection('bookings').doc(bookingId).update({
      refundStatus,
      razorpayRefundId: refund.id,
      refundDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send refund notification email (non-blocking)
    ;(async () => {
      try {
        const bData: any = { id: bookingId, ...booking };
        if (bData.userEmail) {
          await sendEmail(
            bData.userEmail,
            refundStatus === 'completed'
              ? `Refund Processed — ₹${amount} | Reroute`
              : `Refund Initiated — ₹${amount} | Reroute`,
            refundStatusEmail(bData, amount, refund.id, 'processed')
          );
        }
        if (ADMIN_EMAIL) {
          await sendEmail(
            ADMIN_EMAIL,
            `[Admin] Refund ${refundStatus} — Booking ${bookingId}`,
            refundStatusEmail(bData, amount, refund.id, 'processed')
          );
        }
      } catch (emailErr) {
        functions.logger.error('Refund email error (non-fatal):', emailErr);
      }
    })();

    return { success: true, refundId: refund.id, status: refund.status, amount };
  } catch (error: any) {
    functions.logger.error('Error processing refund:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to process refund', error.message);
  }
});

// ─── notifyBookingCancellation ────────────────────────────────────────────────
// Call this from the client after a successful cancelBookingWithRefund()
// to send cancellation emails to user, owner, and admin.
export const notifyBookingCancellation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { bookingId, refundAmount = 0, refundPercentage = 0, reason = 'Booking cancelled', isOwnerCancellation = false } = data;

  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId is required');
  }

  const bookingDoc = await db.collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const b: any = { id: bookingId, ...bookingDoc.data() };

  // Auth check: caller must be the booking user OR farmhouse owner
  const isBookingUser = b.userId === context.auth.uid;
  let isFarmhouseOwner = false;
  if (!isBookingUser && b.farmhouseId) {
    const fhDoc = await db.collection('farmhouses').doc(b.farmhouseId).get();
    isFarmhouseOwner = fhDoc.data()?.ownerId === context.auth.uid;
  }
  if (!isBookingUser && !isFarmhouseOwner) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  try {
    const ownerEmail = await getOwnerEmail(b.farmhouseId);

    if (b.userEmail) {
      await sendEmail(
        b.userEmail,
        `Booking Cancelled — ${b.farmhouseName} | Reroute`,
        cancellationUserEmail(b, refundAmount, refundPercentage, reason)
      );
    }

    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `Booking Cancellation — ${b.farmhouseName} | Reroute`,
        cancellationOwnerEmail(b, reason, isOwnerCancellation)
      );
    }

    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `[Admin] Booking Cancelled — ${b.farmhouseName}`,
        cancellationAdminEmail(b, refundAmount, reason, isOwnerCancellation)
      );
    }

    // If refund failed, notify admin separately
    if (refundAmount > 0 && b.refundStatus === 'failed') {
      if (ADMIN_EMAIL) {
        await sendEmail(
          ADMIN_EMAIL,
          `[URGENT] Refund Failed — Booking ${bookingId}`,
          refundStatusEmail(b, refundAmount, null, 'failed')
        );
      }
      if (b.userEmail) {
        await sendEmail(
          b.userEmail,
          'Refund Processing Issue — Reroute',
          refundStatusEmail(b, refundAmount, null, 'failed')
        );
      }
    }

    functions.logger.info('Cancellation emails sent for booking:', bookingId);
    return { success: true };
  } catch (err) {
    functions.logger.error('Error sending cancellation emails:', err);
    return { success: false };
  }
});

// ─── razorpayWebhook ──────────────────────────────────────────────────────────
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || functions.config().razorpay?.webhook_secret;

    if (!webhookSecret || webhookSecret === 'whsec_placeholder_update_after_webhook_setup') {
      functions.logger.warn('⚠️ Webhook secret not configured — skipping signature check (testing mode)');
    } else if (!webhookSignature) {
      res.status(400).send('Missing webhook signature');
      return;
    } else {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (webhookSignature !== expectedSignature) {
        functions.logger.error('Webhook signature mismatch');
        res.status(400).send('Invalid signature');
        return;
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;
    functions.logger.info('Razorpay webhook:', { event });

    switch (event) {
      case 'payment.authorized':
      case 'payment.captured':
        await handlePaymentSuccess(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailure(payload.payment.entity);
        break;
      case 'refund.created':
      case 'refund.processed':
        await handleRefundUpdate(payload.refund.entity);
        break;
      default:
        functions.logger.info('Unhandled webhook event:', event);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    functions.logger.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// ─── Webhook helpers ──────────────────────────────────────────────────────────

async function handlePaymentSuccess(payment: any) {
  const orderId = payment.order_id;
  const paymentId = payment.id;

  await db.collection('payment_orders').doc(orderId).update({
    paymentId,
    status: 'captured',
    capturedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const orderDoc = await db.collection('payment_orders').doc(orderId).get();
  const bookingId = orderDoc.data()?.bookingId;

  if (bookingId) {
    await db.collection('bookings').doc(bookingId).update({
      paymentStatus: 'paid',
      status: 'confirmed',
      transactionId: paymentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info('Booking confirmed via webhook:', { bookingId, paymentId });
    sendBookingConfirmationEmails(bookingId, paymentId).catch(() => {});
  }
}

async function handlePaymentFailure(payment: any) {
  const orderId = payment.order_id;
  const paymentId = payment.id;

  await db.collection('payment_orders').doc(orderId).update({
    paymentId,
    status: 'failed',
    errorDescription: payment.error_description,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const orderDoc = await db.collection('payment_orders').doc(orderId).get();
  const bookingId = orderDoc.data()?.bookingId;

  if (bookingId) {
    await db.collection('bookings').doc(bookingId).update({
      paymentStatus: 'failed',
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info('Payment failed via webhook:', { bookingId, error: payment.error_description });
  }
}

async function handleRefundUpdate(refund: any) {
  const refundId = refund.id;
  const paymentId = refund.payment_id;
  const status = refund.status;

  const refundsSnapshot = await db.collection('refunds').where('paymentId', '==', paymentId).limit(1).get();

  if (!refundsSnapshot.empty) {
    const refundDoc = refundsSnapshot.docs[0];
    await refundDoc.ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    const bookingId = refundDoc.data().bookingId;
    const refundAmount = (refundDoc.data().amount || 0) / 100; // paise → rupees

    if (bookingId) {
      const refundStatus = status === 'processed' ? 'completed' : 'processing';
      await db.collection('bookings').doc(bookingId).update({
        refundStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      functions.logger.info('Refund status updated via webhook:', { bookingId, refundId, status });

      // Send refund processed email
      if (status === 'processed') {
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (bookingDoc.exists) {
          const b: any = { id: bookingId, ...bookingDoc.data() };
          if (b.userEmail) {
            sendEmail(
              b.userEmail,
              `Refund Processed — ₹${refundAmount} | Reroute`,
              refundStatusEmail(b, refundAmount, refundId, 'processed')
            ).catch(() => {});
          }
        }
      }
    }
  }
}
