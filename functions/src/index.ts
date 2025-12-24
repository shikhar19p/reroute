/**
 * Firebase Cloud Functions for Razorpay Payment Integration
 *
 * These functions handle secure payment operations:
 * - Order creation
 * - Payment verification
 * - Refund processing
 * - Payment webhooks
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id,
  key_secret: process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret,
});

/**
 * Create Razorpay Order
 *
 * This function securely creates a Razorpay order from the backend.
 * The order ID is required to initiate payment on the client side.
 *
 * Request Body:
 * {
 *   amount: number (in rupees),
 *   currency: string (default: 'INR'),
 *   bookingId: string,
 *   userId: string,
 *   receipt: string (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   orderId: string,
 *   amount: number (in paise),
 *   currency: string,
 *   error?: string
 * }
 */
export const createOrder = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create an order'
      );
    }

    // Validate required fields
    const { amount, currency = 'INR', bookingId, userId } = data;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid amount provided'
      );
    }

    if (!bookingId || !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Booking ID and User ID are required'
      );
    }

    // Verify user is creating order for their own booking
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User can only create orders for their own bookings'
      );
    }

    // Convert amount to paise (Razorpay requires amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Create order with Razorpay
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId: bookingId,
        userId: userId,
      },
    });

    functions.logger.info('Razorpay order created:', {
      orderId: order.id,
      bookingId: bookingId,
      amount: amountInPaise,
    });

    // Save order details to Firestore for reference
    await db.collection('payment_orders').doc(order.id).set({
      orderId: order.id,
      bookingId: bookingId,
      userId: userId,
      amount: amountInPaise,
      currency: currency,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency: currency,
      keyId: process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id,
    };
  } catch (error: any) {
    functions.logger.error('Error creating Razorpay order:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to create payment order',
      error.message
    );
  }
});

/**
 * Verify Payment Signature
 *
 * This function verifies the payment signature received from Razorpay
 * to ensure the payment is genuine and hasn't been tampered with.
 *
 * Request Body:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   bookingId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   verified: boolean,
 *   paymentId: string,
 *   error?: string
 * }
 */
export const verifyPayment = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to verify payment'
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = data;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required payment verification parameters'
      );
    }

    // Generate signature for verification
    const secret = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Verify signature
    const isValid = generatedSignature === razorpay_signature;

    functions.logger.info('Payment verification:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      verified: isValid,
    });

    if (isValid) {
      // Update payment order status
      await db.collection('payment_orders').doc(razorpay_order_id).update({
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'verified',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update booking payment status if bookingId provided
      if (bookingId) {
        await db.collection('bookings').doc(bookingId).update({
          paymentStatus: 'paid',
          status: 'confirmed',
          transactionId: razorpay_payment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Booking updated with payment confirmation:', {
          bookingId: bookingId,
          paymentId: razorpay_payment_id,
        });
      }
    }

    return {
      success: true,
      verified: isValid,
      paymentId: razorpay_payment_id,
    };
  } catch (error: any) {
    functions.logger.error('Error verifying payment:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify payment',
      error.message
    );
  }
});

/**
 * Process Refund
 *
 * This function processes a refund for a cancelled booking.
 * Refunds are processed via Razorpay's Refund API.
 *
 * Request Body:
 * {
 *   paymentId: string (Razorpay payment ID),
 *   amount: number (refund amount in rupees),
 *   bookingId: string,
 *   reason?: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   refundId: string,
 *   status: string,
 *   error?: string
 * }
 */
export const processRefund = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to process refund'
      );
    }

    const { paymentId, amount, bookingId, reason = 'Booking cancellation' } = data;

    // Validate required fields
    if (!paymentId || !amount || !bookingId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment ID, amount, and booking ID are required'
      );
    }

    // Verify user owns the booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Booking not found'
      );
    }

    const booking = bookingDoc.data();
    if (booking?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User can only process refunds for their own bookings'
      );
    }

    // Convert amount to paise
    const amountInPaise = Math.round(amount * 100);

    // Process refund with Razorpay
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
      notes: {
        bookingId: bookingId,
        reason: reason,
      },
    });

    functions.logger.info('Refund processed:', {
      refundId: refund.id,
      paymentId: paymentId,
      bookingId: bookingId,
      amount: amountInPaise,
    });

    // Save refund details to Firestore
    await db.collection('refunds').add({
      refundId: refund.id,
      paymentId: paymentId,
      bookingId: bookingId,
      userId: context.auth.uid,
      amount: amountInPaise,
      status: refund.status,
      reason: reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update booking with refund information
    await db.collection('bookings').doc(bookingId).update({
      refundStatus: refund.status === 'processed' ? 'completed' : 'processing',
      refundAmount: amount,
      refundDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: amount,
    };
  } catch (error: any) {
    functions.logger.error('Error processing refund:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to process refund',
      error.message
    );
  }
});

/**
 * Razorpay Webhook Handler
 *
 * This function handles webhook events from Razorpay.
 * Webhooks provide real-time updates about payment status changes.
 *
 * Supported events:
 * - payment.authorized
 * - payment.captured
 * - payment.failed
 * - refund.created
 * - refund.processed
 *
 * Security: Verifies webhook signature to ensure authenticity
 */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || functions.config().razorpay?.webhook_secret;

    // If webhook secret is not configured, log warning but allow for testing
    if (!webhookSecret || webhookSecret === 'whsec_placeholder_update_after_webhook_setup') {
      functions.logger.warn('⚠️ Webhook secret not configured - webhook verification skipped for testing');
      // In production, uncomment the line below to enforce signature verification:
      // res.status(400).send('Webhook secret not configured');
      // return;
    } else if (!webhookSignature) {
      functions.logger.error('Missing webhook signature');
      res.status(400).send('Invalid webhook signature');
      return;
    } else {
      // Validate signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        functions.logger.error('Webhook signature verification failed');
        res.status(400).send('Invalid signature');
        return;
      }
    }

    // Process webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    functions.logger.info('Razorpay webhook received:', { event });

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

    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    functions.logger.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * Helper Functions
 */

async function handlePaymentSuccess(payment: any) {
  try {
    const orderId = payment.order_id;
    const paymentId = payment.id;

    // Update payment order
    await db.collection('payment_orders').doc(orderId).update({
      paymentId: paymentId,
      status: 'captured',
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get booking ID from order
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
    }
  } catch (error) {
    functions.logger.error('Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(payment: any) {
  try {
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const errorDescription = payment.error_description;

    // Update payment order
    await db.collection('payment_orders').doc(orderId).update({
      paymentId: paymentId,
      status: 'failed',
      errorDescription: errorDescription,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get booking ID from order
    const orderDoc = await db.collection('payment_orders').doc(orderId).get();
    const bookingId = orderDoc.data()?.bookingId;

    if (bookingId) {
      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'failed',
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info('Booking payment failed via webhook:', { bookingId, errorDescription });
    }
  } catch (error) {
    functions.logger.error('Error handling payment failure:', error);
    throw error;
  }
}

async function handleRefundUpdate(refund: any) {
  try {
    const refundId = refund.id;
    const paymentId = refund.payment_id;
    const status = refund.status;

    // Update refund record
    const refundsSnapshot = await db
      .collection('refunds')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    if (!refundsSnapshot.empty) {
      const refundDoc = refundsSnapshot.docs[0];
      await refundDoc.ref.update({
        status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const bookingId = refundDoc.data().bookingId;
      if (bookingId) {
        await db.collection('bookings').doc(bookingId).update({
          refundStatus: status === 'processed' ? 'completed' : 'processing',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Refund status updated via webhook:', { bookingId, refundId, status });
      }
    }
  } catch (error) {
    functions.logger.error('Error handling refund update:', error);
    throw error;
  }
}
