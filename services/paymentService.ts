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
    console.log('📝 Creating Razorpay order:', { amount, currency, bookingId, userId });

    const createOrderFn = httpsCallable(functions, 'createOrder', {
      timeout: 30000, // 30 seconds — accounts for cold starts + Razorpay API latency
    });

    const result = await createOrderFn({
      amount,
      currency,
      bookingId,
      userId,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Order created in ${duration}ms`);

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
    const duration = Date.now() - startTime;
    console.error(`❌ Error creating order after ${duration}ms:`, error);
    console.error('❌ Function error details:', error?.details, '| code:', error?.code);

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

/**
 * Initialize Razorpay payment
 * @param paymentDetails Payment configuration
 * @returns Payment response with transaction details
 */
export async function initiatePayment(paymentDetails: PaymentDetails): Promise<PaymentResponse> {
  try {
    const options = {
      description: paymentDetails.description,
      image: 'https://your-app-logo-url.com/logo.png', // Replace with your app logo
      currency: paymentDetails.currency,
      key: RAZORPAY_KEY_ID,
      amount: paymentDetails.amount,
      name: 'Reroute',
      order_id: paymentDetails.orderId,
      prefill: {
        email: paymentDetails.customerEmail,
        contact: paymentDetails.customerPhone,
        name: paymentDetails.customerName,
      },
      theme: {
        color: '#4CAF50', // Your app's primary color
      },
    };

    console.log('🔐 Initiating Razorpay payment with options:', options);

    if (!RazorpayCheckout) {
      throw new Error('Payments are not supported on web. Please use the mobile app.');
    }

    // Open Razorpay checkout
    const rawData = await RazorpayCheckout.open(options);

    // react-native-razorpay sometimes returns a stringified JSON
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    console.log('✅ Payment successful:', data);
    return data as PaymentResponse;
  } catch (error: any) {
    console.error('❌ Payment failed:', error);

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
    console.log('💾 Payment record saved with ID:', docRef.id);
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
    console.log('✅ Payment status updated:', paymentId, status);
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
    console.log('🔄 Processing refund:', {
      razorpayPaymentId,
      refundAmount,
      bookingId,
      reason,
    });

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

    console.log('✅ Refund processed successfully:', data.refundId);

    return {
      refundId: data.refundId,
      status: data.status,
    };
  } catch (error: any) {
    console.error('❌ Error processing refund:', error);
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
  bookingId: string,
  skipVerification: boolean = false
): Promise<boolean> {
  try {
    console.log('🔍 Verifying payment signature:', { orderId, paymentId, bookingId });

    // For registration payments, verification is optional
    if (skipVerification) {
      console.log('⚠️ Skipping server-side verification (registration payment)');
      return true;
    }

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

    console.log('✅ Payment verified successfully:', data.verified);
    return data.verified;
  } catch (error: any) {
    console.error('❌ Error verifying payment:', error);

    // If verification function is not available, log warning but don't fail
    // (Payment was already successful in Razorpay)
    if (error.code === 'not-found' || error.code === 'unavailable') {
      console.warn('⚠️ Verification function unavailable, payment accepted (already confirmed by Razorpay)');
      return true;
    }

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
  description: string,
  skipVerification: boolean = false
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

    // Step 3: Verify payment signature (optional for registration)
    const verified = await verifyPaymentSignature(
      paymentResponse.razorpay_order_id,
      paymentResponse.razorpay_payment_id,
      paymentResponse.razorpay_signature,
      bookingId,
      skipVerification
    );

    if (!verified) {
      throw new Error('Payment verification failed');
    }

    return paymentResponse;
  } catch (error: any) {
    console.error('❌ Payment flow failed:', error);
    throw error;
  }
}
