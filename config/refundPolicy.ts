/**
 * ============================================================
 *  REFUND POLICY CONFIGURATION
 *  Edit this file to change how refunds are calculated.
 * ============================================================
 *
 * Rules (applied in order):
 *  1. Owner cancels                                  → 100% refund (of the refundable amount)
 *  2. User cancels > 24 hours before check-in        → 50% refund
 *  3. User cancels within 24 hours of check-in        → No refund
 *  4. User cancels after check-in                    → No refund
 *
 * The platform fee (PLATFORM_FEE_PERCENTAGE in config/constants.ts) is
 * NEVER refunded, regardless of who cancels or when — it is deducted from
 * the refund base before any percentage above is applied.
 *
 * All percentages are integers (0–100).
 * ESTIMATED_REFUND_DAYS is shown to users as a display string only.
 * ============================================================
 */

export const REFUND_POLICY = {
  // ── User cancellation thresholds ──────────────────────────
  // Cancel MORE than this many hours before check-in → FULL_REFUND_PERCENTAGE
  // Cancel WITHIN this window (but before check-in)  → PARTIAL_REFUND_PERCENTAGE
  // Cancel after check-in                            → NO_REFUND_PERCENTAGE
  FULL_REFUND_THRESHOLD_HOURS: 24,

  // kept for backward compatibility
  PARTIAL_REFUND_THRESHOLD_HOURS: 24,

  // ── Refund percentages (applied to the amount minus platform fee) ──
  OWNER_CANCELLATION_PERCENTAGE: 100,   // Owner cancels → full refund
  FULL_REFUND_PERCENTAGE: 50,           // User cancels >24h before → 50% back
  PARTIAL_REFUND_PERCENTAGE: 0,         // User cancels <24h before → 0% back
  NO_REFUND_PERCENTAGE: 0,              // User cancels after check-in → nothing

  // ── Processing fee ────────────────────────────────────────
  PROCESSING_FEE_RUPEES: 0,

  // ── Display strings (shown to users) ─────────────────────
  ESTIMATED_REFUND_DAYS: '5–7 business days',
} as const;

/** Human-readable policy summary shown in the app. */
export function getRefundPolicyText(): string {
  return (
    `• Cancel more than 24 hours before check-in: 50% refund\n` +
    `• Cancel within 24 hours of check-in: No refund\n` +
    `• Owner cancels: 100% refund\n` +
    `• Platform fee is non-refundable in all cases\n` +
    `• Refunds processed in ${REFUND_POLICY.ESTIMATED_REFUND_DAYS}`
  );
}
