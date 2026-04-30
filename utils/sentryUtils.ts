/**
 * Sentry utilities for enhanced error tracking and monitoring
 */

import * as Sentry from '@sentry/react-native';

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Add a breadcrumb for user actions, API calls, or state changes
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track API call with automatic error handling
 */
export function trackApiCall(
  endpoint: string,
  method: string = 'GET',
  options?: { retries?: number; timeout?: number }
) {
  addBreadcrumb(`API ${method} ${endpoint}`, {
    method,
    endpoint,
    retries: options?.retries || 0,
    timeout: options?.timeout || 0,
  }, 'info');

  return {
    success: (statusCode: number, responseTime: number) => {
      addBreadcrumb(`API success: ${statusCode} in ${responseTime}ms`, {
        endpoint,
        statusCode,
        responseTime,
      }, 'info');
    },
    error: (error: Error, statusCode?: number, attempt?: number) => {
      addBreadcrumb(`API error: ${statusCode || 'unknown'} on attempt ${attempt || 1}`, {
        endpoint,
        error: error.message,
        statusCode,
        attempt,
      }, 'warning');
    },
  };
}

/**
 * Track user actions (navigation, form submission, button clicks)
 */
export function trackUserAction(
  action: string,
  details?: Record<string, any>
) {
  addBreadcrumb(`User action: ${action}`, details, 'info');
}

/**
 * Track navigation events
 */
export function trackNavigation(
  fromScreen: string,
  toScreen: string,
  params?: Record<string, any>
) {
  addBreadcrumb(`Navigation: ${fromScreen} → ${toScreen}`, params, 'info');

  Sentry.setTag('current_screen', toScreen);
  Sentry.setContext('navigation', {
    from: fromScreen,
    to: toScreen,
    params: params || {},
  });
}

/**
 * Set user context for error reporting
 */
export function setUserContext(
  userId: string,
  userEmail?: string,
  userName?: string
) {
  Sentry.setUser({
    id: userId,
    email: userEmail,
    username: userName,
  });

  Sentry.setContext('user', {
    userId,
    userEmail,
    userName,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
  Sentry.setContext('user', {});
}

/**
 * Track data fetching operations
 */
export function trackDataFetch(
  operation: string,
  details?: { count?: number; duration?: number; error?: string }
) {
  const level = details?.error ? 'warning' : 'info';
  addBreadcrumb(`Data fetch: ${operation}`, details, level);
}

/**
 * Track payment operations
 */
export function trackPaymentOperation(
  operation: 'initiated' | 'completed' | 'failed' | 'refunded',
  details?: { bookingId?: string; amount?: number; orderId?: string; error?: string }
) {
  const level = operation === 'failed' ? 'error' : 'info';
  addBreadcrumb(`Payment ${operation}`, details, level);

  Sentry.setContext('payment', {
    operation,
    ...details,
  });
}

/**
 * Track authentication events
 */
export function trackAuthEvent(
  event: 'login' | 'logout' | 'signup' | 'failed_login',
  details?: Record<string, any>
) {
  const level = event === 'failed_login' ? 'warning' : 'info';
  addBreadcrumb(`Auth: ${event}`, details, level);

  if (event === 'logout') {
    clearUserContext();
  }
}

/**
 * Track network status changes
 */
export function trackNetworkStatus(
  status: 'online' | 'offline',
  details?: { duration?: number; wasOffline?: boolean; offlineDuration?: number }
) {
  const level = status === 'offline' ? 'warning' : 'info';
  const message = status === 'offline'
    ? 'Network: offline'
    : `Network: back online after ${details?.offlineDuration || 0}ms`;

  addBreadcrumb(message, details, level);

  Sentry.setContext('network', {
    status,
    timestamp: new Date().toISOString(),
    offlineDurationMs: details?.offlineDuration || 0,
    ...details,
  });

  Sentry.setTag('network_status', status);
}

/**
 * Capture an exception with enhanced context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    context?: Record<string, any>;
    level?: SeverityLevel;
    operation?: string;
  }
) {
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: {
      'error_source': context?.operation || 'unknown',
      ...context?.tags,
    },
    contexts: {
      error: {
        operation: context?.operation,
        ...context?.context,
      },
    },
  });

  if (__DEV__) {
    console.error('Captured exception:', {
      message: error.message,
      operation: context?.operation,
      context: context?.context,
    });
  }
}

/**
 * Capture a message (non-error)
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, level);
  addBreadcrumb(message, context, level);
}

/**
 * Initialize Sentry with app context
 */
export function initializeSentry(
  dsn: string,
  environment: 'development' | 'staging' | 'production',
  appVersion: string
) {
  Sentry.init({
    dsn,
    environment,
    integrations: (integrations) => {
      return integrations.filter((integration) => {
        return integration.name !== 'Breadcrumbs';
      });
    },
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out certain errors in production
      if (environment === 'production') {
        const errorMessage = event.exception?.[0]?.value || '';

        // Skip benign errors
        if (
          errorMessage.includes('Non-Error promise rejection detected') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('timeout')
        ) {
          return null;
        }
      }

      return event;
    },
    release: appVersion,
  });

  // Set default tags
  Sentry.setTag('app_version', appVersion);
  Sentry.setTag('environment', environment);
}

export default {
  addBreadcrumb,
  trackApiCall,
  trackUserAction,
  trackNavigation,
  setUserContext,
  clearUserContext,
  trackDataFetch,
  trackPaymentOperation,
  trackAuthEvent,
  trackNetworkStatus,
  captureException,
  captureMessage,
  initializeSentry,
};
