import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { getFarmhousesByOwner } from '../../services/farmhouseService';
import { Booking, getFarmhouseBookings, updateBookingStatus, updatePaymentStatus } from '../../services/bookingService';
import { cancelBookingWithRefund } from '../../services/cancellationService';
import { useDialog } from '../../components/CustomDialog';
import { getStatusColor } from '../../utils/statusColors';
import { parseError } from '../../utils/errorHandler';

type RootStackParamList = {
  OwnerBookings: { farmhouseId?: string } | undefined;
  OwnerBookingDetails: { booking: Booking };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerBookings'>;

const STATUS_FILTERS: Array<Booking['status'] | 'all'> = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingsListScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | Booking['status']>('all');

  const farmhouseId = route.params?.farmhouseId;

  useEffect(() => {
    loadBookings();
  }, [farmhouseId]);

  const loadBookings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      let results: Booking[] = [];
      if (farmhouseId) {
        results = await getFarmhouseBookings(farmhouseId);
      } else {
        const farms = await getFarmhousesByOwner(user.uid);
        for (const farm of farms) {
          const b = await getFarmhouseBookings(farm.id);
          results.push(...b);
        }
      }
      // sort by check-in date descending
      results.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
      setBookings(results);
    } catch (e) {
      console.error('Error loading bookings', e);
      showDialog({
        title: 'Error',
        message: 'Failed to load bookings',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  }, [bookings, filter]);

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    showDialog({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', style: 'default', onPress: async () => {
          try { await action(); await loadBookings(); } catch (e) {
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

  const handleOwnerCancel = async (booking: Booking) => {
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
                true // isOwnerCancellation = true (100% refund)
              );

              showDialog({
                title: 'Booking Cancelled',
                message: `Booking cancelled successfully.\n\nRefund: ₹${result.refundAmount} (${result.refundPercentage}%)\n${result.message}`,
                type: 'success',
                buttons: [{
                  text: 'OK',
                  onPress: () => loadBookings()
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

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('OwnerBookingDetails', { booking: item })}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.farmhouseName}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.subtle, { color: colors.placeholder }]}>
        {item.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'} • {item.guests} guests
      </Text>
      <Text style={[styles.detail, { color: colors.text }]}>
        {item.checkInDate} → {item.checkOutDate}
      </Text>
      <View style={styles.rowBetween}>
        <Text style={[styles.price, { color: colors.buttonBackground }]}>₹{item.totalPrice}</Text>
        <Text style={[styles.subtle, { color: colors.placeholder }]}>Payment: {item.paymentStatus}</Text>
      </View>
      <View style={[styles.userRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.userText, { color: colors.text }]}>{item.userName}</Text>
          <Text style={[styles.subtle, { color: colors.placeholder }]}>{item.userEmail}</Text>
        </View>
        <TouchableOpacity onPress={() => handleCall(item.userPhone)}>
          <Text style={[styles.callLink, { color: colors.buttonBackground }]}>Call {item.userPhone || ''}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => confirmAction('Confirm booking', 'Mark this booking as confirmed?', () => updateBookingStatus(item.id, 'confirmed'))}>
            <Text style={[styles.actionText, { color: colors.text }]}>Confirm</Text>
          </TouchableOpacity>
        )}
        {item.status === 'confirmed' && (
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => confirmAction('Complete booking', 'Mark this booking as completed?', () => updateBookingStatus(item.id, 'completed'))}>
            <Text style={[styles.actionText, { color: colors.text }]}>Complete</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'pending' || item.status === 'confirmed') && (
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => handleOwnerCancel(item)}>
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Cancel & Refund</Text>
          </TouchableOpacity>
        )}
        {item.paymentStatus !== 'paid' && (
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => confirmAction('Mark as paid', 'Update payment status to paid?', () => updatePaymentStatus(item.id, 'paid'))}>
            <Text style={[styles.actionText, { color: colors.buttonBackground }]}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bookings</Text>
        <Text style={[styles.headerSub, { color: colors.placeholder }]}>{bookings.length} total</Text>
      </View>
      <View style={styles.filtersRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s} style={[styles.filterChip, { backgroundColor: (filter === s ? colors.buttonBackground : 'transparent'), borderColor: colors.border }]} onPress={() => setFilter(s as any)}>
            <Text style={[styles.filterText, { color: filter === s ? colors.buttonText : colors.text }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.buttonBackground} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}> 
          <Text style={[styles.emptyText, { color: colors.placeholder }]}>No bookings found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { marginTop: 2 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 100 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  subtle: { fontSize: 12 },
  detail: { marginTop: 4, fontSize: 14, fontWeight: '500' },
  price: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 8, borderTopWidth: 1 },
  userText: { fontSize: 14, fontWeight: '600' },
  callLink: { fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { fontWeight: '700' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16 },
});

