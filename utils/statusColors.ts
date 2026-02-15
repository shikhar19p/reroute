/**
 * Shared status color and text utilities.
 * Used across Owner and User screens for consistent status display.
 */

export const STATUS_COLORS: Record<string, string> = {
  // Farmhouse statuses
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  // Booking statuses
  confirmed: '#10b981',
  completed: '#3b82f6',
  cancelled: '#ef4444',
};

export const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#E8F5E9', text: '#4CAF50' },
  pending: { bg: '#FFF3E0', text: '#FF9800' },
  refunded: { bg: '#E3F2FD', text: '#2196F3' },
  failed: { bg: '#FFEBEE', text: '#F44336' },
};

export function getStatusColor(status: string, fallback: string = '#9CA3AF'): string {
  return STATUS_COLORS[status] ?? fallback;
}

export function getStatusText(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
