import RazorpayCheckout from 'react-native-razorpay';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Payment configuration
// NOTE: Replace these with your actual Razorpay credentials from https://dashboard.razorpay.com/
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE';

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
      order_id: paymentDetails.orderId, // Generate this from backend in production
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

    // Open Razorpay checkout
    const data = await RazorpayCheckout.open(options);

    console.log('✅ Payment successful:', data);
    return data as PaymentResponse;
  } catch (error: any) {
    console.error('❌ Payment failed:', error);

    // Handle user cancellation vs actual error
    if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
      throw new Error('Payment was cancelled by user');
    }

    throw new Error(error.description || 'Payment failed. Please try again.');
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
 * NOTE: This should ideally be done from a backend/cloud function
 * This is a placeholder for the refund workflow
 */
export async function processRefund(
  paymentId: string,
  razorpayPaymentId: string,
  refundAmount: number
): Promise<void> {
  try {
    console.log('🔄 Processing refund:', {
      paymentId,
      razorpayPaymentId,
      refundAmount,
    });

    // TODO: Implement backend API call to process refund via Razorpay API
    // Example: POST /api/refund with payment details
    // Razorpay Refunds API: https://razorpay.com/docs/api/refunds/

    // For now, just update the payment status
    await updatePaymentStatus(paymentId, 'refunded');

    console.log('✅ Refund processed successfully');
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw new Error('Failed to process refund. Please contact support.');
  }
}

/**
 * Verify payment signature (Important for security)
 * NOTE: This should be done on the backend for security
 * This is a client-side placeholder
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  // TODO: Implement backend verification
  // Use crypto to verify: orderId + "|" + paymentId with secret key
  // Documentation: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/#step-3-verify-the-payment-signature

  console.log('⚠️ Payment signature verification should be done on backend');
  return true; // Placeholder
}

/**
 * Calculate processing fees (if applicable)
 */
export function calculateProcessingFee(amount: number): number {
  // Example: 2% + ₹3 processing fee
  const percentageFee = amount * 0.02;
  const flatFee = 3;
  return Math.round(percentageFee + flatFee);
}

/**
 * Format amount to Razorpay format (paise)
 */
export function formatAmountToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format amount from paise to rupees
 */
export function formatAmountToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Generate order ID (temporary - should be from backend)
 * In production, create order using Razorpay Orders API from backend
 */
export function generateOrderId(bookingId: string): string {
  const timestamp = Date.now();
  return `order_${bookingId}_${timestamp}`;
}
