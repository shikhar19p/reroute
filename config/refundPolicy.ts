/**
 * ============================================================
 *  REFUND POLICY CONFIGURATION
 *  Edit this file to change how refunds are calculated.
 * ============================================================
 *
 * Rules (applied in order):
 *  1. Owner cancels              → always OWNER_REFUND_PERCENTAGE (100%)
 *  2. User cancels, hours-until-checkin > PARTIAL_REFUND_THRESHOLD_HOURS
 *                                → PARTIAL_REFUND_PERCENTAGE (50%)
 *  3. User cancels, hours-until-checkin <= PARTIAL_REFUND_THRESHOLD_HOURS
 *                                → NO_REFUND_PERCENTAGE (0%)
 *
 * All percentages are integers (0–100).
 * ESTIMATED_REFUND_DAYS is shown to users as a display string only.
 * ============================================================
 */

export const REFUND_POLICY = {
  // ── User cancellation thresholds ──────────────────────────
  // If the user cancels MORE than this many hours before check-in,
  // they get PARTIAL_REFUND_PERCENTAGE back.
  // If they cancel WITHIN this window, they get NO_REFUND_PERCENTAGE.
  PARTIAL_REFUND_THRESHOLD_HOURS: 24,   // ← change this to adjust the cutoff

  // ── Refund percentages ────────────────────────────────────
  OWNER_CANCELLATION_PERCENTAGE: 100,   // Owner cancels → full refund
  PARTIAL_REFUND_PERCENTAGE: 50,        // User cancels early → 50% back
  NO_REFUND_PERCENTAGE: 0,              // User cancels too late → nothing

  // ── Processing fee ────────────────────────────────────────
  // Flat fee deducted from the refund amount (in rupees, not percentage).
  // Set to 0 for no fee.
  PROCESSING_FEE_RUPEES: 0,

  // ── Display strings (shown to users) ─────────────────────
  ESTIMATED_REFUND_DAYS: '5–7 business days',
} as const;

/** Human-readable policy summary shown in the app. */
export function getRefundPolicyText(): string {
  const { PARTIAL_REFUND_THRESHOLD_HOURS, PARTIAL_REFUND_PERCENTAGE } = REFUND_POLICY;
  return (
    `• Cancel more than ${PARTIAL_REFUND_THRESHOLD_HOURS} hours before check-in: ` +
    `${PARTIAL_REFUND_PERCENTAGE}% refund\n` +
    `• Cancel within ${PARTIAL_REFUND_THRESHOLD_HOURS} hours of check-in: No refund\n` +
    `• Owner cancels: 100% refund\n` +
    `• Refunds processed in ${REFUND_POLICY.ESTIMATED_REFUND_DAYS}`
  );
}
