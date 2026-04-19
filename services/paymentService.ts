import { Platform } from 'react-native';

let RazorpayCheckout: any = null;
if (Platform.OS !== 'web') {
  RazorpayCheckout = require('react-native-razorpay').default;
}
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebaseConfig';
import Constants from 'expo-constants';

// Initialize Firebase Functions
const functions = getFunctions();

// Payment configuration
// NOTE: Razorpay keys are now managed securely in Firebase Functions
// Client only needs the key ID for checkout UI
let RAZORPAY_KEY_ID = Constants.expoConfig?.extra?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';

export interface PaymentDetails {
  orderId: string;
  amount: number; // in paise (₹1 = 100 paise)
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  bookingId?: string;
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  errorMessage?: string;
  createdAt: any;
  updatedAt?: any;
}

/**
 * Create Razorpay Order
 * Calls Firebase Cloud Function to securely create an order
 */
export async function createOrder(
  amount: number,
  currency: string,
  bookingId: string,
  userId: string
): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
  const startTime = Date.now();

  try {
    const createOrderFn = httpsCallable(functions, 'createOrder', {
      timeout: 30000, // 30 seconds — accounts for cold starts + Razorpay API latency
    });

    const result = await createOrderFn({
      amount,
      currency,
      bookingId,
      userId,
    });

    const data = result.data as any;

    if (!data.success) {
      throw new Error(data.error || 'Failed to create order');
    }

    // Update RAZORPAY_KEY_ID from server response
    RAZORPAY_KEY_ID = data.keyId;

    return {
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      keyId: data.keyId,
    };
  } catch (error: any) {
    console.error('Error creating order:', error);

    // Firebase callable timeout: code is 'functions/deadline-exceeded', message is 'deadline-exceeded'
    if (
      error.code === 'deadline-exceeded' ||
      error.code === 'functions/deadline-exceeded' ||
      error.message?.includes('deadline') ||
      error.message?.includes('timeout')
    ) {
      throw new Error('Payment gateway is taking too long to respond. Please check your internet connection and try again.');
    }

    // Clean error message
    const errorMsg = error?.message || error?.description || 'Failed to create payment order. Please try again.';
    throw new Error(errorMsg);
  }
}

// ---------------------------------------------------------------------------
// Web: Load Razorpay checkout.js and open modal via browser SDK
// ---------------------------------------------------------------------------

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.head.appendChild(script);
  });
}

async function initiatePaymentWeb(paymentDetails: PaymentDetails): Promise<PaymentResponse> {
  await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      name: 'ReRoute Aventures',
      description: paymentDetails.description,
      order_id: paymentDetails.orderId,
      prefill: {
        name: paymentDetails.customerName,
        email: paymentDetails.customerEmail,
        contact: paymentDetails.customerPhone,
      },
      theme: { color: '#C5A565' },
      handler(response: any) {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error('Payment was cancelled by user'));
        },
      },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (res: any) => {
      reject(new Error(res?.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}

/**
 * Initialize Razorpay payment
 * @param paymentDetails Payment configuration
 * @returns Payment response with transaction details
 */
export async function initiatePayment(paymentDetails: PaymentDetails): Promise<PaymentResponse> {
  // Web: use browser-based Razorpay checkout
  if (Platform.OS === 'web') {
    return initiatePaymentWeb(paymentDetails);
  }

  // Native: use react-native-razorpay
  try {
    const options = {
      description: paymentDetails.description,
      currency: paymentDetails.currency,
      key: RAZORPAY_KEY_ID,
      amount: paymentDetails.amount,
      name: 'ReRoute Aventures',
      order_id: paymentDetails.orderId,
      prefill: {
        email: paymentDetails.customerEmail,
        contact: paymentDetails.customerPhone,
        name: paymentDetails.customerName,
      },
      theme: { color: '#C5A565' },
    };

    if (!RazorpayCheckout) {
      throw new Error('Payment module not available');
    }

    // Open Razorpay checkout
    const rawData = await RazorpayCheckout.open(options);

    // react-native-razorpay sometimes returns a stringified JSON
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    return data as PaymentResponse;
  } catch (error: any) {
    console.error('Payment failed:', error);

    // IMPORTANT: Check for post-payment parsing error BEFORE PAYMENT_CANCELLED.
    // Razorpay uses code=0 for both user cancellation AND parsing errors.
    // The description field distinguishes them. If we don't check first,
    // parsing errors are misidentified as cancellations and the booking is
    // incorrectly cleaned up even though the payment may have succeeded.
    const desc: string = error?.description || '';
    if (desc.includes('Post payment parsing error') || desc.toLowerCase().includes('parsing error')) {
      const parseErr = new Error('Post payment parsing error');
      (parseErr as any).isPostPaymentParseError = true;
      throw parseErr;
    }

    // Handle user cancellation vs actual error
    if (RazorpayCheckout && error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
      throw new Error('Payment was cancelled by user');
    }

    // Preserve .description so BookingConfirmationScreen can parse Razorpay JSON errors
    const richErr: any = new Error(error?.description || error?.message || 'Payment failed. Please try again.');
    if (error?.description) richErr.description = error.description;
    if (error?.code !== undefined) richErr.code = error.code;
    throw richErr;
  }
}

/**
 * Save payment record to Firestore
 */
export async function savePaymentRecord(
  bookingId: string,
  userId: string,
  amount: number,
  currency: string,
  paymentResponse?: PaymentResponse
): Promise<string> {
  try {
    const paymentData: Omit<PaymentRecord, 'id'> = {
      bookingId,
      userId,
      amount,
      currency,
      status: paymentResponse ? 'success' : 'pending',
      paymentMethod: 'razorpay',
      razorpayPaymentId: paymentResponse?.razorpay_payment_id,
      razorpayOrderId: paymentResponse?.razorpay_order_id,
      razorpaySignature: paymentResponse?.razorpay_signature,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'payments'), paymentData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving payment record:', error);
    throw error;
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentRecord['status'],
  errorMessage?: string
): Promise<void> {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status,
      errorMessage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

/**
 * Process refund (for cancellations)
 * Calls Firebase Cloud Function to process refund via Razorpay API
 */
export async function processRefund(
  razorpayPaymentId: string,
  refundAmount: number,
  bookingId: string,
  reason?: string
): Promise<{ refundId: string; status: string }> {
  try {
    const processRefundFn = httpsCallable(functions, 'processRefund');
    const result = await processRefundFn({
      paymentId: razorpayPaymentId,
      amount: refundAmount,
      bookingId,
      reason: reason || 'Booking cancellation',
    });

    const data = result.data as any;

    if (!data.success) {
      throw new Error(data.error || 'Refund processing failed');
    }

    return {
      refundId: data.refundId,
      status: data.status,
    };
  } catch (error: any) {
    console.error('Error processing refund:', error);
    throw new Error(error.message || 'Failed to process refund. Please contact support.');
  }
}

/**
 * Verify payment signature (Secure backend verification)
 * Calls Firebase Cloud Function to verify payment authenticity
 */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  bookingId: string
): Promise<boolean> {
  try {
    const verifyPaymentFn = httpsCallable(functions, 'verifyPayment', {
      timeout: 20000, // 20 second timeout
    });

    const result = await verifyPaymentFn({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      bookingId,
    });

    const data = result.data as any;

    if (!data.success) {
      throw new Error(data.error || 'Payment verification failed');
    }

    return data.verified;
  } catch (error: any) {
    console.error('Error verifying payment:', error);

    throw new Error('Payment verification failed. Please contact support with your transaction ID.');
  }
}

/**
 * Complete payment flow - Creates order, initiates payment, and verifies
 */
export async function completePaymentFlow(
  amount: number,
  currency: string,
  bookingId: string,
  userId: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  description: string
): Promise<PaymentResponse> {
  try {
    // Step 1: Create order on backend
    const orderData = await createOrder(amount, currency, bookingId, userId);

    // Step 2: Initiate payment with Razorpay
    const paymentResponse = await initiatePayment({
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      customerName,
      customerEmail,
      customerPhone,
      description,
      bookingId,
    });

    // Step 3: Verify payment signature server-side
    const verified = await verifyPaymentSignature(
      paymentResponse.razorpay_order_id,
      paymentResponse.razorpay_payment_id,
      paymentResponse.razorpay_signature,
      bookingId
    );

    if (!verified) {
      throw new Error('Payment verification failed');
    }

    return paymentResponse;
  } catch (error: any) {
    throw error;
  }
}
