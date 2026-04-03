/**
 * Utility functions for parsing and displaying user-friendly error messages
 */

export interface ParsedError {
  title: string;
  message: string;
  isCancellation: boolean;
}

/**
 * Parse error object into user-friendly title and message
 */
export function parseError(error: any): ParsedError {
  const rawError = error?.message || error?.description || error?.toString() || '';

  let title = 'Error';
  let message = 'Something went wrong. Please try again.';
  let isCancellation = false;

  // Handle Razorpay payment errors (comes as JSON string in .description or .message)
  const jsonCandidate = error?.description || (rawError.trimStart().startsWith('{') ? rawError : null);
  if (jsonCandidate) {
    try {
      const parsedError = typeof jsonCandidate === 'string'
        ? JSON.parse(jsonCandidate)
        : jsonCandidate;

      if (parsedError?.error) {
        const razorpayError = parsedError.error;

        switch (razorpayError.code) {
          case 'BAD_REQUEST_ERROR':
            if (razorpayError.reason === 'payment_error' || razorpayError.step === 'payment_authentication') {
              title = 'Payment Cancelled';
              message = 'Your payment was cancelled or failed during authentication.';
              isCancellation = true;
            } else if (razorpayError.description && razorpayError.description !== 'undefined') {
              title = 'Payment Error';
              message = razorpayError.description;
            } else {
              title = 'Payment Failed';
              message = 'Payment could not be processed. Please try again.';
            }
            break;

          case 'GATEWAY_ERROR':
            title = 'Payment Gateway Error';
            message = 'Payment gateway is experiencing issues. Please try again in a few moments.';
            break;

          case 'SERVER_ERROR':
            title = 'Server Error';
            message = 'Payment server error. Please try again later.';
            break;

          default:
            title = 'Payment Failed';
            message = razorpayError.description && razorpayError.description !== 'undefined'
              ? razorpayError.description
              : 'Payment failed. Please try again.';
        }
        return { title, message, isCancellation };
      }
    } catch (parseErr) {
      // JSON parsing failed, continue to text-based parsing
    }
  }

  // Text-based error parsing
  const lowerError = rawError.toLowerCase();

  if (lowerError.includes('cancel')) {
    title = 'Cancelled';
    message = 'The operation was cancelled.';
    isCancellation = true;
  } else if (lowerError.includes('network') || lowerError.includes('internet')) {
    title = 'Connection Error';
    message = 'Please check your internet connection and try again.';
  } else if (lowerError.includes('timeout') || lowerError.includes('deadline')) {
    title = 'Timeout';
    message = 'The operation took too long. Please check your internet and try again.';
  } else if (lowerError.includes('insufficient') || lowerError.includes('limit')) {
    title = 'Payment Declined';
    message = 'Your payment was declined. Please check your payment method or try a different one.';
  } else if (lowerError.includes('invalid') || lowerError.includes('authentication')) {
    title = 'Authentication Failed';
    message = 'Authentication failed. Please verify your details and try again.';
  } else if (lowerError.includes('not found')) {
    title = 'Not Found';
    message = 'The requested resource was not found.';
  } else if (lowerError.includes('permission') || lowerError.includes('unauthorized')) {
    title = 'Permission Denied';
    message = 'You do not have permission to perform this action.';
  } else if (lowerError.includes('verification')) {
    title = 'Verification Failed';
    message = 'Payment verification failed. Please contact support with your transaction ID.';
  } else if (rawError.length > 0 && !rawError.includes('[') && !rawError.includes('{') && !rawError.includes('Error:')) {
    // Use the error message if it's clean (not a JSON/object string)
    title = 'Error';
    message = rawError;
  }

  return { title, message, isCancellation };
}

/**
 * Get user-friendly payment error message
 */
export function getPaymentErrorMessage(error: any): string {
  const parsed = parseError(error);
  return parsed.message;
}

/**
 * Check if error is a user cancellation
 */
export function isUserCancellation(error: any): boolean {
  const parsed = parseError(error);
  return parsed.isCancellation;
}
