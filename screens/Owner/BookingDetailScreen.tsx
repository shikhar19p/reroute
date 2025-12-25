import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { Booking, updateBookingStatus, updatePaymentStatus } from '../../services/bookingService';
import { cancelBookingWithRefund } from '../../services/cancellationService';
import { useDialog } from '../../components/CustomDialog';
import { useAuth } from '../../authContext';

type RootStackParamList = {
  OwnerBookingDetails: { booking: Booking };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerBookingDetails'>;

export default function OwnerBookingDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { showDialog } = useDialog();
  const { user } = useAuth();
  const { booking } = route.params;

  const statusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return colors.placeholder;
    }
  };

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
              title: 'Error',
              message: 'Action failed',
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
        title: 'Error',
        message: 'You must be logged in to cancel bookings',
        type: 'error'
      });
      return;
    }

    showDialog({
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel this booking?\n\n⚠️ Guest will receive 100% refund (₹${booking.totalPrice}) as per owner cancellation policy.`,
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
                true // isOwnerCancellation = true (100% refund)
              );

              showDialog({
                title: 'Booking Cancelled',
                message: `Booking cancelled successfully.\n\nRefund: ₹${result.refundAmount} (${result.refundPercentage}%)\n${result.message}`,
                type: 'success',
                buttons: [{
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }]
              });
            } catch (error: any) {
              showDialog({
                title: 'Cancellation Failed',
                message: error.message || 'Failed to cancel booking. Please try again.',
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
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: colors.text }]}>{booking.farmhouseName}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(booking.status) }]}>
            <Text style={styles.badgeText}>{booking.status}</Text>
          </View>
        </View>
        <Text style={[styles.subtle, { color: colors.placeholder }]}>
          {booking.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'} • {booking.guests} guests
        </Text>
        <Text style={[styles.detail, { color: colors.text }]}>Check-in: {booking.checkInDate}</Text>
        <Text style={[styles.detail, { color: colors.text }]}>Check-out: {booking.checkOutDate}</Text>
        <Text style={[styles.detail, { color: colors.text }]}>Total Price: ₹{booking.totalPrice}</Text>
        <Text style={[styles.detail, { color: colors.text }]}>Payment Status: {booking.paymentStatus}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Guest</Text>
        <Text style={[styles.detail, { color: colors.text }]}>{booking.userName}</Text>
        <Text style={[styles.subtle, { color: colors.placeholder }]}>{booking.userEmail}</Text>
        {!!booking.userPhone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.userPhone}`)}>
            <Text style={[styles.link, { color: colors.buttonBackground }]}>Call {booking.userPhone}</Text>
          </TouchableOpacity>
        )}
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  subtle: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  detail: { fontSize: 14, marginTop: 6 },
  link: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  actionText: { fontWeight: '800' },
});

