/**
 * Centralized app logger → Google Cloud Logging.
 *
 * Logs flow: client → ingestLogs Cloud Function → Google Cloud Logging (Log Explorer)
 *
 * All users, all sessions, all platforms land in one place.
 * View: GCP Console → Logging → Log Explorer (https://console.cloud.google.com/logs)
 *
 * Useful filters in Log Explorer:
 *   jsonPayload.source="client"
 *   jsonPayload.level="error"
 *   jsonPayload.userId="abc123"
 *   jsonPayload.category="payment"
 *   jsonPayload.sessionId="xyz"
 *   timestamp >= "2026-04-19T00:00:00Z" AND timestamp < "2026-04-20T00:00:00Z"
 *
 * Setup:
 *   1. Deploy the ingestLogs Cloud Function (already in functions/src/index.ts)
 *   2. Optionally set a secret:
 *        firebase functions:config:set logging.ingest_key="your-secret"
 *      Then add the same value as LOG_INGEST_KEY in your .env
 *   3. That's it — no external accounts needed.
 *
 * Fallback: errors also written to Firestore `app_errors` collection.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';

// ─── Config ───────────────────────────────────────────────────────────────────
const PROJECT_ID = 'rustique-6b7c4';
const INGEST_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/ingestLogs`;

// Optional shared secret — set LOG_INGEST_KEY in your .env (leave blank to skip auth)
// Must match: firebase functions:config:set logging.ingest_key="your-secret"
const LOG_INGEST_KEY = ''; // TODO: set your ingest key here

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'auth'
  | 'navigation'
  | 'payment'
  | 'booking'
  | 'farmhouse'
  | 'api_call'
  | 'storage'
  | 'ui'
  | 'validation'
  | 'notification'
  | 'draft'
  | 'general';

// ─── Session metadata ─────────────────────────────────────────────────────────
// Groups all logs from a single app launch — searchable in Log Explorer
const SESSION_ID = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const PLATFORM = Platform.OS;

// ─── Buffer + flush ───────────────────────────────────────────────────────────
interface LogPayload {
  dt: string;
  level: LogLevel;
  message: string;
  category: LogCategory;
  event: string;
  sessionId: string;
  platform: string;
  userId?: string;
  data?: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
}

let buffer: LogPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  if (!buffer.length) return;
  const batch = buffer.splice(0);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (LOG_INGEST_KEY) headers['Authorization'] = `Bearer ${LOG_INGEST_KEY}`;

    await fetch(INGEST_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
  } catch {
    // Network failure — never throw from logger
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 3000);
}

// ─── Core write ───────────────────────────────────────────────────────────────
async function writeLog(
  level: LogLevel,
  category: LogCategory,
  event: string,
  message: string,
  data?: Record<string, any>,
  error?: unknown,
  userId?: string,
): Promise<void> {
  try {
    // Dev console
    if (__DEV__) {
      const tag = `[${level.toUpperCase()}][${category}/${event}]`;
      if (level === 'error') console.error(tag, message, data ?? '', error ?? '');
      else if (level === 'warn') console.warn(tag, message, data ?? '');
      else console.log(tag, message, data ?? '');
    }

    // Skip debug in production to reduce writes
    if (!__DEV__ && level === 'debug') return;

    const payload: LogPayload = {
      dt: new Date().toISOString(),
      level,
      category,
      event,
      message,
      sessionId: SESSION_ID,
      platform: PLATFORM,
    };

    if (userId) payload.userId = userId;
    if (data && Object.keys(data).length) payload.data = data;

    if (error) {
      payload.errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.stack) {
        payload.errorStack = error.stack.slice(0, 1200);
      }
    }

    buffer.push(payload);
    scheduleFlush();

    // Errors also written to Firestore as offline-safe backup
    if (level === 'error') {
      addDoc(collection(db, 'app_errors'), {
        ...payload,
        timestamp: serverTimestamp(),
      }).catch(() => {});
    }
  } catch {
    // Never throw
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const appLog = {
  debug: (category: LogCategory, event: string, message: string, data?: Record<string, any>, userId?: string) =>
    writeLog('debug', category, event, message, data, undefined, userId),

  info: (category: LogCategory, event: string, message: string, data?: Record<string, any>, userId?: string) =>
    writeLog('info', category, event, message, data, undefined, userId),

  warn: (category: LogCategory, event: string, message: string, data?: Record<string, any>, userId?: string) =>
    writeLog('warn', category, event, message, data, undefined, userId),

  error: (category: LogCategory, event: string, message: string, error?: unknown, data?: Record<string, any>, userId?: string) =>
    writeLog('error', category, event, message, data, error, userId),
};

// ─── Convenience helpers ──────────────────────────────────────────────────────
export const logPaymentStep = (step: string, data: Record<string, any>, userId?: string) =>
  appLog.info('payment', step, `Payment: ${step}`, data, userId);

export const logPaymentError = (step: string, error: unknown, data?: Record<string, any>, userId?: string) =>
  appLog.error('payment', step, `Payment error at: ${step}`, error, data, userId);

export const logBookingStep = (step: string, data: Record<string, any>, userId?: string) =>
  appLog.info('booking', step, `Booking: ${step}`, data, userId);

export const logAuthEvent = (event: string, data?: Record<string, any>, userId?: string) =>
  appLog.info('auth', event, `Auth: ${event}`, data, userId);

export const logNavigation = (from: string, to: string, userId?: string) =>
  appLog.debug('navigation', 'screen_change', `${from} → ${to}`, { from, to }, userId);

export const logApiCall = (endpoint: string, status: number, durationMs: number, userId?: string) =>
  appLog.info('api_call', endpoint, `API ${endpoint} → ${status} (${durationMs}ms)`, { endpoint, status, durationMs }, userId);

export const logError = (category: LogCategory, event: string, error: unknown, data?: Record<string, any>, userId?: string) =>
  appLog.error(category, event, `Error: ${event}`, error, data, userId);
