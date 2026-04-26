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

import { logger } from 'firebase-functions';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env: prefer functions/.env (deployed with functions), fall back to root .env for local dev
const functionsEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: functionsEnvPath });
dotenv.config({ path: rootEnvPath }); // no-op if already set by the above

admin.initializeApp();
const db = admin.firestore();

// ─── Razorpay (lazy) ─────────────────────────────────────────────────────────
// Initialized on first use so module-level errors don't crash unrelated functions
// (e.g. notifyBookingCancellation doesn't use Razorpay at all).
let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id) {
      throw new HttpsError('internal', 'Payment gateway not configured — set RAZORPAY_KEY_ID');
    }
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
}

// ─── Nodemailer transporter ───────────────────────────────────────────────────
// Set these in Firebase Functions config or .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@reroute.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
// Bank details update notifications go to this address
const BANK_UPDATE_EMAIL = process.env.BANK_UPDATE_EMAIL || 'rustiquebyranareddy@gmail.com';

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  const smtpUser = process.env.SMTP_USER;
  if (!smtpUser) {
    logger.warn('Email skipped — SMTP_USER not configured. Set SMTP_USER env var.', { subject });
    return;
  }
  try {
    await smtpTransporter.sendMail({
      from: `"Reroute" <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info('Email sent:', { to, subject });
  } catch (err) {
    // Never let email failure crash payment/booking flows
    logger.error('Email send failed (non-fatal):', { to, subject, err });
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
    <h2 style="color:#4CAF50;margin-top:0;">Booking Confirmed</h2>
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
    <p style="margin-bottom:0;">We hope you enjoy your stay.</p>
  `);
}

function bookingConfirmationOwnerEmail(b: any): string {
  return baseLayout(`
    <h2 style="color:#4CAF50;margin-top:0;">New Booking Received</h2>
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
    <h2 style="color:#1565C0;margin-top:0;">New Booking — Admin Notice</h2>
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
      ${b.transactionId ? `<tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Payment ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.transactionId}</td></tr>` : ''}
      <tr style="background:${hasRefund ? '#E8F5E9' : '#FFF3E0'};"><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund Amount</td><td style="padding:12px 16px;font-weight:bold;color:${hasRefund ? '#2E7D32' : '#E65100'};">${hasRefund ? `₹${refundAmount} (${refundPercentage}%)` : 'No refund applicable'}</td></tr>
      ${b.razorpayRefundId ? `<tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.razorpayRefundId}</td></tr>` : ''}
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

function cancellationOwnerEmail(b: any, reason: string, isOwnerCancellation: boolean, refundAmount: number, refundPercentage: number): string {
  return baseLayout(`
    <h2 style="color:#F44336;margin-top:0;">Booking Cancellation Notice</h2>
    <p>${isOwnerCancellation ? 'You cancelled the following booking.' : 'A guest has cancelled their booking at your property.'}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Guest</td><td style="padding:12px 16px;">${b.userName} (${b.userEmail})</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-in</td><td style="padding:12px 16px;">${b.checkInDate}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Check-out</td><td style="padding:12px 16px;">${b.checkOutDate}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Reason</td><td style="padding:12px 16px;">${reason}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount Paid</td><td style="padding:12px 16px;">₹${b.totalPrice}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund to Guest</td><td style="padding:12px 16px;font-weight:bold;color:#2E7D32;">${refundAmount > 0 ? `₹${refundAmount} (${refundPercentage}%)` : 'No refund'}</td></tr>
    </table>

    <p style="color:#555;">The cancelled dates have been unblocked and are now available for new bookings.</p>
  `);
}

function cancellationAdminEmail(b: any, refundAmount: number, refundPercentage: number, reason: string, isOwnerCancellation: boolean): string {
  return baseLayout(`
    <h2 style="color:#F44336;margin-top:0;">Booking Cancelled — Admin Notice</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Booking ID</td><td style="padding:12px 16px;font-family:monospace;">${b.id || b.bookingId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property</td><td style="padding:12px 16px;">${b.farmhouseName}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Customer</td><td style="padding:12px 16px;">${b.userName} (${b.userEmail})</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Cancelled By</td><td style="padding:12px 16px;">${isOwnerCancellation ? 'Property Owner' : 'Customer'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Reason</td><td style="padding:12px 16px;">${reason}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Amount Paid</td><td style="padding:12px 16px;">₹${b.totalPrice}</td></tr>
      ${b.transactionId ? `<tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Payment ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.transactionId}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund Amount</td><td style="padding:12px 16px;font-weight:bold;color:${refundAmount > 0 ? '#2E7D32' : '#888'};">${refundAmount > 0 ? `₹${refundAmount} (${refundPercentage}%)` : 'No refund'}</td></tr>
      ${b.razorpayRefundId ? `<tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Refund ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${b.razorpayRefundId}</td></tr>` : ''}
    </table>
  `);
}

function refundStatusEmail(b: any, refundAmount: number, refundId: string | null, status: 'processed' | 'failed'): string {
  const isSuccess = status === 'processed';
  return baseLayout(`
    <h2 style="color:${isSuccess ? '#4CAF50' : '#F44336'};margin-top:0;">
      ${isSuccess ? 'Refund Processed' : 'Refund Failed'}
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

    // Parallelise farmhouse + owner email fetches — was 3 sequential round-trips, now 1
    const [farmhouseDoc, ownerEmail] = await Promise.all([
      b.farmhouseId ? db.collection('farmhouses').doc(b.farmhouseId).get() : Promise.resolve(null),
      getOwnerEmail(b.farmhouseId),
    ]);

    // Firestore notification for owner (in-app)
    if (farmhouseDoc?.exists) {
      const ownerId = farmhouseDoc.data()?.ownerId;
      if (ownerId) {
        await db.collection('notifications').add({
          userId: ownerId,
          type: 'new_booking',
          title: 'New Booking Received',
          message: `${b.userName || 'A guest'} booked ${b.farmhouseName} from ${b.checkInDate} to ${b.checkOutDate}`,
          bookingId,
          farmhouseId: b.farmhouseId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const recipients: string[] = [];
    if (ownerEmail) recipients.push(ownerEmail);
    if (ADMIN_EMAIL) recipients.push(ADMIN_EMAIL);

    // Customer confirmation
    if (b.userEmail) {
      await sendEmail(
        b.userEmail,
        `[Booking] Confirmed — ${b.farmhouseName} | Reroute`,
        bookingConfirmationUserEmail({ ...b, transactionId })
      );
    }

    // Owner notification
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `[Booking] New Booking Received — ${b.farmhouseName} | Reroute`,
        bookingConfirmationOwnerEmail(b)
      );
    }

    // Admin notification
    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `[Booking] New — ${b.farmhouseName}`,
        bookingConfirmationAdminEmail({ ...b, transactionId })
      );
    }
  } catch (err) {
    logger.error('Error sending booking confirmation emails:', err);
  }
}

// ─── createOrder ──────────────────────────────────────────────────────────────
// minInstances=1 eliminates cold-start latency on the payment-critical path
export const createOrder = onCall({ minInstances: 1 }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to create an order');
    }

    const { amount, currency = 'INR', bookingId, userId } = request.data;

    if (!amount || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Invalid amount provided');
    }
    if (!bookingId || !userId) {
      throw new HttpsError('invalid-argument', 'Booking ID and User ID are required');
    }
    if (request.auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'User can only create orders for their own bookings');
    }

    // For real bookings (not registration fees), validate the amount server-side
    // against what is stored in Firestore to prevent price manipulation.
    const isRegistrationFee = typeof bookingId === 'string' && bookingId.startsWith('registration-');
    if (!isRegistrationFee) {
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) {
        throw new HttpsError('not-found', 'Booking not found');
      }
      const bookingData = bookingDoc.data()!;
      if (bookingData.userId !== request.auth.uid && bookingData.user_id !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Booking does not belong to this user');
      }
      const expectedAmount = bookingData.totalPrice ?? bookingData.total_amount;
      if (typeof expectedAmount === 'number' && Math.abs(expectedAmount - amount) > 1) {
        logger.error('Amount mismatch in createOrder', { provided: amount, expected: expectedAmount, bookingId });
        throw new HttpsError('invalid-argument', 'Payment amount does not match booking total');
      }
    }

    const amountInPaise = Math.round(amount * 100);

    const rzp = getRazorpay();
    const orderOptions: Parameters<typeof rzp.orders.create>[0] = {
      amount: amountInPaise,
      currency,
      payment_capture: true, // Auto-capture on checkout — required for refunds to work
      receipt: `booking_${bookingId}`,
      notes: { bookingId, userId },
    };
    const order = await rzp.orders.create(orderOptions);

    logger.info('Razorpay order created:', { orderId: order.id, bookingId, amount: amountInPaise });

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
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error: any) {
    const rzpDetail = error?.error?.description || error?.error?.code || error?.message || JSON.stringify(error);
    logger.error('Error creating Razorpay order:', { rzpDetail, error });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to create payment order', rzpDetail);
  }
});

// ─── verifyPayment ────────────────────────────────────────────────────────────
export const verifyPayment = onCall({ minInstances: 1 }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to verify payment');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = request.data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new HttpsError('invalid-argument', 'Missing required payment verification parameters');
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = generatedSignature === razorpay_signature;

    logger.info('Payment verification:', { orderId: razorpay_order_id, paymentId: razorpay_payment_id, verified: isValid });

    if (!isValid) {
      return { success: true, verified: false, paymentId: razorpay_payment_id };
    }

    // HMAC is valid — now confirm the actual payment status in Razorpay.
    // A valid signature only proves the response came from Razorpay; it does NOT
    // mean money was collected. The payment could be 'failed' or 'created' (e.g.
    // UPI dismissed, bank timeout). We must reject those cases.
    const rzpPayment = await getRazorpay().payments.fetch(razorpay_payment_id);
    const paymentStatus = rzpPayment.status;
    logger.info('Razorpay payment status:', { paymentId: razorpay_payment_id, status: paymentStatus });

    if (paymentStatus === 'failed') {
      throw new HttpsError('failed-precondition', 'Payment was not successful — transaction declined or cancelled');
    }

    if (paymentStatus === 'authorized') {
      // Capture the authorized payment (order was created with payment_capture:true
      // but some payment methods land in authorized first)
      await getRazorpay().payments.capture(razorpay_payment_id, rzpPayment.amount, rzpPayment.currency);
      logger.info('Payment captured:', { paymentId: razorpay_payment_id });
    } else if (paymentStatus === 'created') {
      // UPI/QR payments can briefly show 'created' right after the user pays,
      // before Razorpay auto-captures. HMAC is valid so the payment is genuine —
      // confirm the booking optimistically. Razorpay will capture async.
      logger.warn('Payment still in created state after HMAC verification — proceeding for UPI/QR.', { paymentId: razorpay_payment_id });
    } else if (paymentStatus !== 'captured') {
      // 'refunded', or any other unexpected state
      throw new HttpsError(
        'failed-precondition',
        `Payment is in an unexpected state: ${paymentStatus}. Cannot confirm booking.`
      );
    }

    // Run payment_orders write + booking read in parallel (independent operations)
    const orderWritePromise = db.collection('payment_orders').doc(razorpay_order_id).set({
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      status: 'verified',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (bookingId && !bookingId.startsWith('registration-')) {
      const [, bookingDoc] = await Promise.all([
        orderWritePromise,
        db.collection('bookings').doc(bookingId).get(),
      ]);

      if (!bookingDoc.exists) {
        throw new HttpsError('not-found', 'Booking not found');
      }
      const bookingData = bookingDoc.data()!;
      if (bookingData.userId !== request.auth.uid && bookingData.user_id !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Booking does not belong to this user');
      }

      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'paid',
        status: 'confirmed',
        transactionId: razorpay_payment_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('Booking confirmed:', { bookingId, paymentId: razorpay_payment_id });

      // Send confirmation emails (non-blocking)
      sendBookingConfirmationEmails(bookingId, razorpay_payment_id).catch(() => {});
    } else {
      await orderWritePromise;
    }

    return { success: true, verified: true, paymentId: razorpay_payment_id };
  } catch (error: any) {
    logger.error('Error verifying payment:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to verify payment', error.message);
  }
});

// ─── processRefund ────────────────────────────────────────────────────────────
export const processRefund = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to process refund');
    }

    const { paymentId, amount, bookingId, reason = 'Booking cancellation' } = request.data;

    if (!paymentId || !amount || !bookingId) {
      throw new HttpsError('invalid-argument', 'Payment ID, amount, and booking ID are required');
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError('not-found', 'Booking not found');
    }

    const booking = bookingDoc.data();

    const isBookingUser = booking?.userId === request.auth.uid;
    let isFarmhouseOwner = false;
    if (!isBookingUser && booking?.farmhouseId) {
      const farmhouseDoc = await db.collection('farmhouses').doc(booking.farmhouseId).get();
      isFarmhouseOwner = farmhouseDoc.data()?.ownerId === request.auth.uid;
    }

    if (!isBookingUser && !isFarmhouseOwner) {
      throw new HttpsError('permission-denied', 'Unauthorized to process this refund');
    }

    // Validate the payment ID exists in Razorpay before attempting refund
    if (!paymentId.startsWith('pay_')) {
      throw new HttpsError('invalid-argument', `Invalid Razorpay payment ID: ${paymentId}`);
    }

    // Cap refund at booking total to prevent over-refunds
    const bookingTotal = booking?.totalPrice ?? booking?.total_amount ?? amount;
    const safeAmount = Math.min(amount, bookingTotal);
    if (safeAmount <= 0) {
      throw new HttpsError('invalid-argument', 'Refund amount must be greater than zero');
    }

    const requestedPaise = Math.round(safeAmount * 100);

    logger.info('Processing refund:', { paymentId, bookingId, requestedPaise, reason });

    // Fetch payment to verify status and get actual captured amount
    let payment: any;
    try {
      payment = await getRazorpay().payments.fetch(paymentId);
    } catch (fetchErr: any) {
      logger.error('Could not fetch payment details:', { fetchErr, paymentId });
      throw new HttpsError('not-found', `Payment not found: ${paymentId}`);
    }

    logger.info('Payment status before refund:', { status: payment.status, amount: payment.amount, amountRefunded: payment.amount_refunded, paymentId });

    // If payment is only authorized (not captured), capture it first
    if (payment.status === 'authorized') {
      try {
        await getRazorpay().payments.capture(paymentId, payment.amount, payment.currency);
        logger.info('Payment captured before refund:', { paymentId });
        // Re-fetch to get updated amount fields
        payment = await getRazorpay().payments.fetch(paymentId);
      } catch (captureErr: any) {
        // Authorization expired — no money was ever collected, so no refund is needed
        logger.info('Payment authorization expired — no charge was made, skipping refund:', { paymentId, bookingId });
        await db.collection('bookings').doc(bookingId).update({
          refundStatus: 'not_applicable',
          refundNote: 'Payment authorization expired — no charge was made to your account',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, refundId: null, status: 'not_applicable', amount: 0 };
      }
    }

    if (payment.status === 'failed') {
      throw new HttpsError('failed-precondition', 'Cannot refund a failed payment');
    }

    // Cap by the actual refundable amount from Razorpay:
    // payment.amount = total captured paise
    // payment.amount_refunded = paise already refunded (for partial prior refunds)
    const alreadyRefundedPaise = payment.amount_refunded || 0;
    const maxRefundablePaise = payment.amount - alreadyRefundedPaise;
    const amountInPaise = Math.min(requestedPaise, maxRefundablePaise);

    if (amountInPaise <= 0) {
      throw new HttpsError('invalid-argument', 'No refundable amount remaining for this payment');
    }

    logger.info('Refund amount resolved:', { requestedPaise, maxRefundablePaise, amountInPaise });

    let refund: any;
    try {
      refund = await getRazorpay().payments.refund(paymentId, {
        amount: amountInPaise,
        notes: { bookingId, reason },
      });
    } catch (razorpayErr: any) {
      // Extract the most useful message from the Razorpay SDK error structure
      const rzpMsg =
        razorpayErr?.error?.description ||
        razorpayErr?.error?.code ||
        (() => {
          try { return JSON.parse(razorpayErr?.message || '{}')?.error?.description; } catch { return null; }
        })() ||
        razorpayErr?.message ||
        'Refund request rejected by payment gateway';

      logger.error('Razorpay refund API error:', {
        description: rzpMsg,
        statusCode: razorpayErr?.statusCode,
        errorCode: razorpayErr?.error?.code,
        reason: razorpayErr?.error?.reason,
        paymentId,
        bookingId,
      });
      throw new HttpsError('internal', rzpMsg);
    }

    // Use actual confirmed paise from Razorpay response as source of truth
    const actualRefundPaise: number = refund.amount ?? amountInPaise;
    const actualRefundRupees = actualRefundPaise / 100;

    logger.info('Refund processed:', { refundId: refund.id, paymentId, bookingId, requestedPaise: amountInPaise, actualPaise: actualRefundPaise });

    await db.collection('refunds').add({
      refundId: refund.id,
      paymentId,
      bookingId,
      userId: request.auth.uid,
      amount: actualRefundPaise,
      status: refund.status,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const refundStatus = refund.status === 'processed' ? 'completed' : 'processing';
    await db.collection('bookings').doc(bookingId).update({
      refundStatus,
      razorpayRefundId: refund.id,
      refundAmount: actualRefundRupees, // overwrite with Razorpay-confirmed amount
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
              ? `[Refund] Processed — ₹${actualRefundRupees} | Reroute`
              : `[Refund] Initiated — ₹${actualRefundRupees} | Reroute`,
            refundStatusEmail(bData, actualRefundRupees, refund.id, 'processed')
          );
        }
        if (ADMIN_EMAIL) {
          await sendEmail(
            ADMIN_EMAIL,
            `[Refund] ${refundStatus} — Booking ${bookingId}`,
            refundStatusEmail(bData, actualRefundRupees, refund.id, 'processed')
          );
        }
      } catch (emailErr) {
        logger.error('Refund email error (non-fatal):', emailErr);
      }
    })();

    return { success: true, refundId: refund.id, status: refund.status, amount: actualRefundRupees };
  } catch (error: any) {
    logger.error('Error processing refund:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to process refund', error.message);
  }
});

// ─── notifyBookingCancellation ────────────────────────────────────────────────
// Call this from the client after a successful cancelBookingWithRefund()
// to send cancellation emails to user, owner, and admin.
export const notifyBookingCancellation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { bookingId, refundAmount = 0, refundPercentage = 0, reason = 'Booking cancelled', isOwnerCancellation = false } = request.data;

  if (!bookingId) {
    throw new HttpsError('invalid-argument', 'bookingId is required');
  }

  const bookingDoc = await db.collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new HttpsError('not-found', 'Booking not found');
  }

  const b: any = { id: bookingId, ...bookingDoc.data() };

  // Auth check: caller must be the booking user OR farmhouse owner
  const isBookingUser = b.userId === request.auth.uid;
  let isFarmhouseOwner = false;
  if (!isBookingUser && b.farmhouseId) {
    const fhDoc = await db.collection('farmhouses').doc(b.farmhouseId).get();
    isFarmhouseOwner = fhDoc.data()?.ownerId === request.auth.uid;
  }
  if (!isBookingUser && !isFarmhouseOwner) {
    throw new HttpsError('permission-denied', 'Unauthorized');
  }

  try {
    const ownerEmail = await getOwnerEmail(b.farmhouseId);

    if (b.userEmail) {
      await sendEmail(
        b.userEmail,
        `[Cancellation] Booking Cancelled — ${b.farmhouseName} | Reroute`,
        cancellationUserEmail(b, refundAmount, refundPercentage, reason)
      );
    }

    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `[Cancellation] Booking Cancelled — ${b.farmhouseName} | Reroute`,
        cancellationOwnerEmail(b, reason, isOwnerCancellation, refundAmount, refundPercentage)
      );
    }

    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `[Cancellation] Booking Cancelled — ${b.farmhouseName}`,
        cancellationAdminEmail(b, refundAmount, refundPercentage, reason, isOwnerCancellation)
      );
    }

    // If refund failed, notify admin separately
    if (refundAmount > 0 && b.refundStatus === 'failed') {
      if (ADMIN_EMAIL) {
        await sendEmail(
          ADMIN_EMAIL,
          `[Refund] URGENT — Refund Failed for Booking ${bookingId}`,
          refundStatusEmail(b, refundAmount, null, 'failed')
        );
      }
      if (b.userEmail) {
        await sendEmail(
          b.userEmail,
          '[Refund] Processing Issue — Reroute',
          refundStatusEmail(b, refundAmount, null, 'failed')
        );
      }
    }

    logger.info('Cancellation emails sent for booking:', bookingId);
    return { success: true };
  } catch (err) {
    logger.error('Error sending cancellation emails:', err);
    return { success: false };
  }
});

// ─── razorpayWebhook ──────────────────────────────────────────────────────────
export const razorpayWebhook = onRequest(async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret === 'whsec_placeholder_update_after_webhook_setup') {
      logger.error('Webhook secret not configured — rejecting request');
      res.status(500).send('Webhook not configured');
      return;
    } else if (!webhookSignature) {
      res.status(400).send('Missing webhook signature');
      return;
    } else {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (webhookSignature !== expectedSignature) {
        logger.error('Webhook signature mismatch');
        res.status(400).send('Invalid signature');
        return;
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;
    logger.info('Razorpay webhook:', { event });

    switch (event) {
      case 'payment.captured':
        await handlePaymentSuccess(payload.payment.entity);
        break;
      case 'payment.authorized':
        // Do not confirm booking on authorized — wait for captured (actual debit).
        // With auto-capture (payment_capture:true), captured fires immediately after.
        logger.info('payment.authorized received — waiting for payment.captured to confirm booking');
        break;
      case 'payment.failed':
        await handlePaymentFailure(payload.payment.entity);
        break;
      case 'refund.created':
      case 'refund.processed':
        await handleRefundUpdate(payload.refund.entity);
        break;
      default:
        logger.info('Unhandled webhook event:', event);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// ─── Webhook helpers ──────────────────────────────────────────────────────────

async function handlePaymentSuccess(payment: any) {
  const orderId = payment.order_id;
  const paymentId = payment.id;

  // Only confirm when money is actually captured — never on authorized alone
  if (payment.status !== 'captured') {
    logger.warn('handlePaymentSuccess called with non-captured payment, skipping booking confirmation', {
      paymentId,
      status: payment.status,
    });
    return;
  }

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
    logger.info('Booking confirmed via webhook:', { bookingId, paymentId });
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
    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    const booking = bookingSnap.data();

    await db.collection('bookings').doc(bookingId).update({
      paymentStatus: 'failed',
      status: 'cancelled',
      cancellationReason: 'Payment failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Unblock dates on the farmhouse so they can be booked by others
    if (booking?.farmhouseId && booking?.checkInDate && booking?.checkOutDate) {
      try {
        const farmhouseRef = db.collection('farmhouses').doc(booking.farmhouseId);
        const farmhouseSnap = await farmhouseRef.get();
        const bookedDates: string[] = farmhouseSnap.data()?.bookedDates || [];

        const start = new Date(booking.checkInDate);
        const end = new Date(booking.checkOutDate);
        const datesToRemove = new Set<string>();
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          datesToRemove.add(d.toISOString().split('T')[0]);
        }

        await farmhouseRef.update({
          bookedDates: bookedDates.filter((d: string) => !datesToRemove.has(d)),
        });
        logger.info('Dates unblocked after payment failure:', { bookingId, farmhouseId: booking.farmhouseId });
      } catch (dateErr: any) {
        logger.error('Failed to unblock dates after payment failure:', { bookingId, error: dateErr?.message });
      }
    }

    logger.info('Payment failed via webhook:', { bookingId, error: payment.error_description });
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
      logger.info('Refund status updated via webhook:', { bookingId, refundId, status });

      // Send refund processed email
      if (status === 'processed') {
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (bookingDoc.exists) {
          const b: any = { id: bookingId, ...bookingDoc.data() };
          if (b.userEmail) {
            sendEmail(
              b.userEmail,
              `[Refund] Processed — ₹${refundAmount} | Reroute`,
              refundStatusEmail(b, refundAmount, refundId, 'processed')
            ).catch(() => {});
          }
        }
      }
    }
  }
}

// ─── Email templates: registration & approval ────────────────────────────────

function newListingAdminEmail(farmhouseName: string, ownerName: string, city: string, area: string, propertyType: string, farmhouseId: string): string {
  return baseLayout(`
    <h2 style="color:#1565C0;margin-top:0;">[New Listing] Farmhouse Registration Submitted</h2>
    <p>A new ${propertyType || 'farmhouse'} has been registered and is awaiting approval.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Property Name</td><td style="padding:12px 16px;">${farmhouseName}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Property Type</td><td style="padding:12px 16px;text-transform:capitalize;">${propertyType || 'farmhouse'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Location</td><td style="padding:12px 16px;">${area}, ${city}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Owner</td><td style="padding:12px 16px;">${ownerName || 'Unknown'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Farmhouse ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${farmhouseId}</td></tr>
    </table>

    <div style="background:#E3F2FD;border-left:4px solid #1565C0;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#1565C0;">Please review the KYC documents and approve or reject the listing in the admin panel.</p>
    </div>
  `);
}

function newListingOwnerEmail(farmhouseName: string, ownerName: string): string {
  return baseLayout(`
    <h2 style="color:#4CAF50;margin-top:0;">Registration Submitted Successfully</h2>
    <p>Hi <strong>${ownerName || 'there'}</strong>,</p>
    <p>Thank you for registering <strong>${farmhouseName}</strong> on Reroute. Your property has been submitted for review.</p>

    <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#2E7D32;">
        Our team will review your KYC documents and listing details. You will receive an email once your property is approved and goes live on the platform.
      </p>
    </div>

    <p style="color:#555;">For any queries, reach out to us at <a href="mailto:support@reroute.app" style="color:#4CAF50;">support@reroute.app</a>.</p>
  `);
}

function approvalStatusEmail(farmhouseName: string, ownerName: string, newStatus: string, rejectionReason?: string): string {
  const isApproved = newStatus === 'approved';
  const isRejected = newStatus === 'rejected';
  const accentColor = isApproved ? '#4CAF50' : isRejected ? '#F44336' : '#FF9800';
  const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Under Review';

  return baseLayout(`
    <h2 style="color:${accentColor};margin-top:0;">Listing Status Update: ${statusLabel}</h2>
    <p>Hi <strong>${ownerName || 'there'}</strong>,</p>
    <p>The status of your property <strong>${farmhouseName}</strong> has been updated.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Property</td><td style="padding:12px 16px;">${farmhouseName}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">New Status</td><td style="padding:12px 16px;font-weight:bold;color:${accentColor};text-transform:capitalize;">${statusLabel}</td></tr>
      ${rejectionReason ? `<tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Reason</td><td style="padding:12px 16px;">${rejectionReason}</td></tr>` : ''}
    </table>

    ${isApproved ? `
    <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#2E7D32;">
        Congratulations! Your property is now live on Reroute and guests can start booking.
      </p>
    </div>` : ''}

    ${isRejected ? `
    <div style="background:#FFEBEE;border-left:4px solid #F44336;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#C62828;">
        If you believe this is a mistake or need clarification, please contact <a href="mailto:support@reroute.app" style="color:#F44336;">support@reroute.app</a>.
      </p>
    </div>` : ''}

    <p style="color:#555;">Log in to the Reroute app to view your listing details.</p>
  `);
}

function bankDetailsUpdateEmail(farmhouseName: string, farmhouseId: string, ownerId: string): string {
  return baseLayout(`
    <h2 style="color:#FF9800;margin-top:0;">[Bank Update] Bank Details Changed</h2>
    <p>The bank account details for a farmhouse have been updated. Please verify before processing any payouts.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;width:45%;color:#555;">Farmhouse</td><td style="padding:12px 16px;">${farmhouseName}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Farmhouse ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${farmhouseId}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:12px 16px;font-weight:bold;color:#555;">Owner ID</td><td style="padding:12px 16px;font-family:monospace;font-size:13px;">${ownerId}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:bold;color:#555;">Updated At</td><td style="padding:12px 16px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
    </table>

    <div style="background:#FFF3E0;border-left:4px solid #FF9800;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#E65100;">
        Action required: Please log in to the admin panel and verify the new bank details before approving any pending payouts for this property.
      </p>
    </div>
  `);
}

// ─── Firestore trigger: new farmhouse registered ──────────────────────────────
export const onFarmhouseCreated = onDocumentCreated('farmhouses/{farmhouseId}', async (event) => {
    const farmhouseId = event.params.farmhouseId;
    const data = event.data!.data();

    const farmhouseName = data.basicDetails?.name || 'Unnamed Property';
    const city = data.basicDetails?.city || '';
    const area = data.basicDetails?.area || '';
    const propertyType = data.propertyType || 'farmhouse';
    const ownerId = data.ownerId;

    // Get owner info
    let ownerName = 'Unknown';
    let ownerEmail: string | null = null;
    if (ownerId) {
      try {
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        ownerName = ownerDoc.data()?.displayName || ownerDoc.data()?.name || 'Unknown';
        ownerEmail = ownerDoc.data()?.email || null;
      } catch (err) {
        logger.warn('Could not fetch owner details for new listing email:', { ownerId, err });
      }
    }

    // Notify admin
    if (ADMIN_EMAIL) {
      await sendEmail(
        ADMIN_EMAIL,
        `[New Listing] ${farmhouseName} — ${area}, ${city}`,
        newListingAdminEmail(farmhouseName, ownerName, city, area, propertyType, farmhouseId)
      );
    }

    // Notify owner
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        `[Registration] Submitted — ${farmhouseName} | Reroute`,
        newListingOwnerEmail(farmhouseName, ownerName)
      );
    }

    logger.info('New listing emails sent:', { farmhouseId, farmhouseName });
  });

// ─── Firestore trigger: approval status changed ───────────────────────────────
export const onFarmhouseApprovalChanged = onDocumentUpdated('farmhouses/{farmhouseId}', async (event) => {
    const before = event.data!.before.data();
    const after = event.data!.after.data();

    // Only fire when status field actually changes
    if (before.status === after.status) return;

    const farmhouseId = event.params.farmhouseId;
    const farmhouseName = after.basicDetails?.name || 'Unnamed Property';
    const newStatus: string = after.status;
    const ownerId = after.ownerId;

    let ownerEmail: string | null = null;
    let ownerName = 'there';
    if (ownerId) {
      try {
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        ownerEmail = ownerDoc.data()?.email || null;
        ownerName = ownerDoc.data()?.displayName || ownerDoc.data()?.name || 'there';
      } catch (err) {
        logger.warn('Could not fetch owner email for approval notification:', { ownerId, err });
      }
    }

    if (!ownerEmail) {
      logger.warn('No owner email found for approval notification:', { farmhouseId, newStatus });
      return;
    }

    const statusLabel = newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Updated';

    await sendEmail(
      ownerEmail,
      `[Approval] ${farmhouseName} — ${statusLabel} | Reroute`,
      approvalStatusEmail(farmhouseName, ownerName, newStatus, after.rejectionReason)
    );

    logger.info('Approval status email sent:', { farmhouseId, newStatus, ownerEmail });
  });

// ─── notifyBankDetailsUpdate ──────────────────────────────────────────────────
export const notifyBankDetailsUpdate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { farmhouseId, farmhouseName } = request.data;
  if (!farmhouseId) {
    throw new HttpsError('invalid-argument', 'farmhouseId is required');
  }

  // Verify caller is the owner of the farmhouse
  const farmDoc = await db.collection('farmhouses').doc(farmhouseId).get();
  if (!farmDoc.exists) {
    throw new HttpsError('not-found', 'Farmhouse not found');
  }
  if (farmDoc.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Not authorized');
  }

  await sendEmail(
    BANK_UPDATE_EMAIL,
    `[Bank Update] Bank Details Changed — ${farmhouseName || farmhouseId}`,
    bankDetailsUpdateEmail(farmhouseName || 'Unknown Property', farmhouseId, request.auth.uid)
  );

  logger.info('Bank details update email sent:', { farmhouseId, to: BANK_UPDATE_EMAIL });
  return { success: true };
});

// ─── ingestLogs ───────────────────────────────────────────────────────────────
// Client-side log ingestion. React Native / web app batches log entries and
// POSTs them here. Function writes each entry to Google Cloud Logging using
// functions.logger so all app logs appear in Log Explorer alongside server logs.
//
// View in GCP Console → Logging → Log Explorer
// Filter: jsonPayload.source="client"  OR  jsonPayload.userId="xyz"
//         OR jsonPayload.level="error"  OR  jsonPayload.category="payment"
//
// Auth: simple shared secret in Authorization header.
// Set with: firebase functions:config:set logging.ingest_key="your-secret-here"
// Same key goes into LOG_INGEST_KEY in your app's .env / constants.
export const ingestLogs = onRequest(async (req, res) => {
  // CORS headers — needed for web app
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  // Verify shared secret
  const ingestKey = process.env.LOG_INGEST_KEY;
  if (ingestKey) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== ingestKey) {
      res.status(401).send('Unauthorized');
      return;
    }
  }

  const entries: any[] = Array.isArray(req.body) ? req.body : [];
  if (!entries.length) { res.status(200).send({ ok: true, written: 0 }); return; }

  for (const entry of entries) {
    const { level = 'info', message = '', ...rest } = entry;
    const payload = { source: 'client', ...rest };

    switch (level) {
      case 'error': logger.error(message, payload); break;
      case 'warn':  logger.warn(message, payload);  break;
      case 'debug': logger.debug(message, payload); break;
      default:      logger.info(message, payload);  break;
    }
  }

  res.status(200).send({ ok: true, written: entries.length });
});

// ─── Server-side AES-256 helpers ─────────────────────────────────────────────
// Key = SHA-256(userId + ENCRYPTION_SECRET). Same derivation as the former
// client-side CryptoJS code so existing ciphertext can still be decrypted.

function getServerEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpsError('internal', 'ENCRYPTION_SECRET not configured on server');
  }
  return secret;
}

function serverDeriveKey(userId: string, secret: string): Buffer {
  // SHA-256 hex → 32-byte Buffer (matches CryptoJS hex-parsed key)
  const keyHex = crypto.createHash('sha256').update(userId + secret).digest('hex');
  return Buffer.from(keyHex, 'hex');
}

function serverEncrypt(plainText: string, userId: string, secret: string): string {
  const key = serverDeriveKey(userId, secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc_v2_${iv.toString('hex')}:${encrypted}`;
}

// Legacy key used in older app builds before ENCRYPTION_SECRET was configured
const LEGACY_FALLBACK_KEY = 'reroute-encryption-key-2024-CHANGE-IN-PRODUCTION';

function serverDecryptWithKey(encryptedText: string, key: Buffer): string {
  if (encryptedText.startsWith('enc_v2_')) {
    const payload = encryptedText.slice('enc_v2_'.length);
    const colonIdx = payload.indexOf(':');
    const iv = Buffer.from(payload.slice(0, colonIdx), 'hex');
    const ciphertext = payload.slice(colonIdx + 1);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  if (encryptedText.startsWith('enc_v1_')) {
    // Legacy passphrase-based AES — key is used as hex string passphrase
    const keyHex = key.toString('hex');
    const ciphertext = encryptedText.slice('enc_v1_'.length);
    // CryptoJS passphrase AES: decrypt using the hex key as passphrase
    const CryptoJS = require('crypto-js');
    const decrypted = CryptoJS.AES.decrypt(ciphertext, keyHex);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    if (plainText) return plainText;
    throw new Error('enc_v1_ decryption produced empty output');
  }
  throw new Error('Unknown encryption format');
}

function serverDecrypt(encryptedText: string, userId: string, secret: string): string {
  return serverDecryptWithKey(encryptedText, serverDeriveKey(userId, secret));
}

function serverDecryptAnyKey(encryptedText: string, userId: string, primarySecret: string): string {
  // Try primary secret first
  try {
    return serverDecrypt(encryptedText, userId, primarySecret);
  } catch (_) {}
  // Fall back to legacy key (older app builds)
  try {
    return serverDecryptWithKey(encryptedText, serverDeriveKey(userId, LEGACY_FALLBACK_KEY));
  } catch (_) {}
  throw new Error('Decryption failed with all known keys');
}

// ─── encryptBankDetails ───────────────────────────────────────────────────────
// Called by the client before saving KYC data. Encrypts bank details
// server-side so ENCRYPTION_SECRET never needs to live in the client bundle.
export const encryptBankDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }
  const { accountNumber, ifscCode } = request.data;
  if (!accountNumber || !ifscCode) {
    throw new HttpsError('invalid-argument', 'accountNumber and ifscCode are required');
  }
  const secret = getServerEncryptionSecret();
  return {
    encryptedAccountNumber: serverEncrypt(String(accountNumber).trim(), request.auth.uid, secret),
    encryptedIFSC: serverEncrypt(String(ifscCode).trim().toUpperCase(), request.auth.uid, secret),
  };
});

// ─── getBankDetails ───────────────────────────────────────────────────────────
// Returns decrypted bank details only to the farmhouse owner.
export const getBankDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }
  const { farmhouseId } = request.data;
  if (!farmhouseId) {
    throw new HttpsError('invalid-argument', 'farmhouseId is required');
  }
  const farmDoc = await db.collection('farmhouses').doc(farmhouseId).get();
  if (!farmDoc.exists) {
    throw new HttpsError('not-found', 'Farmhouse not found');
  }
  const farmData = farmDoc.data()!;
  const farmOwnerId = farmData.ownerId || farmData.owner_id;
  if (farmOwnerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Not authorized');
  }
  const bankDetails = farmData.kyc?.bankDetails;
  if (!bankDetails) {
    return { bankDetails: null };
  }
  if (!bankDetails.encrypted) {
    // Stored plain (legacy) — return as-is
    return { bankDetails };
  }
  const secret = getServerEncryptionSecret();
  try {
    return {
      bankDetails: {
        ...bankDetails,
        accountNumber: serverDecryptAnyKey(bankDetails.accountNumber, request.auth.uid, secret),
        ifscCode: serverDecryptAnyKey(bankDetails.ifscCode, request.auth.uid, secret),
        encrypted: false,
      },
    };
  } catch (err) {
    logger.error('getBankDetails decryption failed:', { farmhouseId, err });
    throw new HttpsError('internal', 'Failed to decrypt bank details');
  }
});
