import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { Booking, updateBookingStatus, updatePaymentStatus } from '../../services/bookingService';
import { cancelBookingWithRefund } from '../../services/cancellationService';
import { useDialog } from '../../components/CustomDialog';
import { useAuth } from '../../authContext';
import { getStatusColor } from '../../utils/statusColors';
import { parseError } from '../../utils/errorHandler';

type RootStackParamList = {
  OwnerBookingDetails: { booking: Booking };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerBookingDetails'>;

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

export default function OwnerBookingDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const { user } = useAuth();
  const { booking } = route.params;

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    showDialog({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', style: 'default', onPress: async () => {
          try {
            await action();
            navigation.goBack();
          } catch {
            showDialog({
              title: 'Action failed',
              message: 'Something went wrong. Please try again.',
              type: 'error'
            });
          }
        }}
      ]
    });
  };

  const handleOwnerCancel = async () => {
    if (!user) {
      showDialog({
        title: 'Sign in required',
        message: 'You must be signed in to cancel bookings.',
        type: 'error'
      });
      return;
    }

    showDialog({
      title: 'Cancel booking',
      message: `Cancel this booking? The guest will receive a full refund of ₹${booking.totalPrice}.`,
      type: 'warning',
      buttons: [
        { text: 'No, Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel & Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelBookingWithRefund(
                booking.id,
                user.uid,
                'Cancelled by property owner',
                true
              );

              showDialog({
                title: 'Booking cancelled',
                message: `Refund of ₹${result.refundAmount} (${result.refundPercentage}%) has been initiated.`,
                type: 'success',
                buttons: [{
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }]
              });
            } catch (error: any) {
              showDialog({
                title: 'Cancellation Failed',
                message: parseError(error).message,
                type: 'error'
              });
            }
          }
        }
      ]
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Booking Info */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.title, { color: colors.text }]}>{booking.farmhouseName}</Text>
            <View style={[styles.badge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Text style={styles.badgeText}>{booking.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.subtle, { color: colors.placeholder }]}>
            {booking.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'} · {booking.guests} guests
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Check-in</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{booking.checkInDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Check-out</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{booking.checkOutDate}</Text>
          </View>
        </View>

        {/* Guest Info */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Guest Details</Text>
          <Text style={[styles.detail, { color: colors.text }]}>{booking.userName}</Text>
          <Text style={[styles.subtle, { color: colors.placeholder }]}>{booking.userEmail}</Text>
          {!!booking.userPhone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.userPhone}`)}>
              <Text style={[styles.link, { color: colors.buttonBackground }]}>Call {booking.userPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Details */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Total Price</Text>
            <Text style={[styles.totalValue, { color: colors.buttonBackground }]}>
              ₹{Number(booking.totalPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Payment Status</Text>
            <View style={[styles.paymentBadge, {
              backgroundColor: booking.paymentStatus === 'paid' ? '#10B981' :
                             booking.paymentStatus === 'failed' ? '#EF4444' : '#F59E0B'
            }]}>
              <Text style={styles.paymentBadgeText}>
                {(booking.paymentStatus || 'pending').toUpperCase()}
              </Text>
            </View>
          </View>

          {(booking as any).transactionId && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Transaction ID</Text>
              <Text style={[styles.transactionId, { color: colors.text }]} numberOfLines={1}>
                {(booking as any).transactionId}
              </Text>
            </View>
          )}
        </View>

        {/* Refund Details (for cancelled bookings) */}
        {booking.status === 'cancelled' && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.cancelledHeader, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}>
              <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
            </View>

            {(booking as any).cancelledAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Cancelled On</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTimestamp((booking as any).cancelledAt)}
                </Text>
              </View>
            )}

            {(booking as any).cancellationReason && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Reason</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {(booking as any).cancellationReason}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Refund Information</Text>

            {(booking as any).refundAmount !== undefined && (booking as any).refundAmount > 0 ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Amount</Text>
                  <Text style={[styles.refundAmount, { color: '#10B981' }]}>
                    ₹{Number((booking as any).refundAmount).toLocaleString('en-IN')}
                  </Text>
                </View>

                {(booking as any).refundPercentage !== undefined && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Percentage</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {(booking as any).refundPercentage}%
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Status</Text>
                  <View style={[styles.paymentBadge, {
                    backgroundColor: (booking as any).refundStatus === 'completed' ? '#10B981' :
                                   (booking as any).refundStatus === 'processing' ? '#F59E0B' :
                                   (booking as any).refundStatus === 'failed' ? '#EF4444' : '#6B7280'
                  }]}>
                    <Text style={styles.paymentBadgeText}>
                      {((booking as any).refundStatus || 'Pending').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {(booking as any).refundDate && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Date</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatTimestamp((booking as any).refundDate)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.noRefundBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}>
                <Text style={[styles.noRefundText, { color: colors.text }]}>
                  No refund applicable (cancelled within 24 hours of check-in)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {booking.status === 'pending' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.buttonBackground }]} onPress={() => confirmAction('Confirm booking', 'Mark as confirmed?', () => updateBookingStatus(booking.id, 'confirmed'))}>
              <Text style={[styles.actionText, { color: colors.buttonText }]}>Confirm</Text>
            </TouchableOpacity>
          )}
          {booking.status === 'confirmed' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.buttonBackground }]} onPress={() => confirmAction('Complete booking', 'Mark as completed?', () => updateBookingStatus(booking.id, 'completed'))}>
              <Text style={[styles.actionText, { color: colors.buttonText }]}>Complete</Text>
            </TouchableOpacity>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={handleOwnerCancel}>
              <Text style={[styles.actionText, { color: '#fff' }]}>Cancel & Refund</Text>
            </TouchableOpacity>
          )}
          {booking.paymentStatus !== 'paid' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }]} onPress={() => confirmAction('Mark paid', 'Update payment to paid?', () => updatePaymentStatus(booking.id, 'paid'))}>
              <Text style={[styles.actionText, { color: colors.text }]}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  subtle: { fontSize: 13, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  subsectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  detail: { fontSize: 15, marginTop: 4 },
  link: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  divider: { height: 1, marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  totalValue: { fontSize: 18, fontWeight: 'bold' },
  transactionId: { fontSize: 12, fontWeight: '500', flex: 1, textAlign: 'right', fontFamily: 'monospace' },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paymentBadgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  refundAmount: { fontSize: 16, fontWeight: 'bold' },
  cancelledHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  cancelledTitle: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  noRefundBox: {
    padding: 12,
    borderRadius: 8,
  },
  noRefundText: { fontSize: 13, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  actionText: { fontWeight: '800', fontSize: 14 },
});
