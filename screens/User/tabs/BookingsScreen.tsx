import React, { useState, useEffect } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../authContext';
import { getUserBookings, cancelBooking, Booking as BookingType } from '../../../services/bookingService';

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserBookings(user.uid);
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      case 'draft': return '#9E9E9E';
      default: return colors.placeholder;
    }
  };

  const handleCancelBooking = async (bookingId: string, farmhouseName: string) => {
    Alert.alert('Cancel Booking', `Are you sure you want to cancel booking for ${farmhouseName}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
            Alert.alert('Success', 'Booking cancelled successfully');
            loadBookings(); // Reload bookings
          } catch (error) {
            console.error('Error cancelling booking:', error);
            Alert.alert('Error', 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  const handleContinueBooking = (farmhouseId: string) => {
    (navigation as any).navigate('FarmhouseDetail', { farmhouseId });
  };

  const getBookingCategory = (booking: BookingType): string => {
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);

    if (booking.status === 'cancelled') return 'cancelled';
    if (now < checkIn) return 'future';
    if (now > checkOut) return 'past';
    return 'present';
  };

  const filteredBookings = () => {
    switch (activeTab) {
      case 'current':
        return bookings.filter(b => getBookingCategory(b) === 'present');
      case 'past':
        return bookings.filter(b => getBookingCategory(b) === 'past');
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const renderBooking = ({ item }: { item: BookingType }) => (
    <View style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.bookingHeader}>
        <Text style={[styles.farmhouseName, { color: colors.text }]}>{item.farmhouseName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.dateRow}>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {new Date(item.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to {new Date(item.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.guestInfo, { color: colors.placeholder }]}>👥 {item.guests} guests • {item.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}</Text>
      <View style={styles.amountRow}>
        <Text style={[styles.totalAmount, { color: colors.buttonBackground }]}>Total: ₹{item.totalPrice}</Text>
        <Text style={[styles.paymentStatus, { color: item.paymentStatus === 'paid' ? '#4CAF50' : colors.placeholder }]}>
          {item.paymentStatus === 'paid' ? '✓ Paid' : 'Payment Pending'}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => (navigation as any).navigate('FarmhouseDetail', { farmhouseId: item.id })}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>View Details</Text>
        </TouchableOpacity>
        {(item.status === 'confirmed' || item.status === 'pending') && getBookingCategory(item) === 'future' && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleCancelBooking(item.id, item.farmhouseName)}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bookings</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            {[
              { key: 'all', label: 'All' },
              { key: 'current', label: 'Current' },
              { key: 'past', label: 'Past' },
              { key: 'cancelled', label: 'Cancelled' },
              { key: 'draft', label: 'Continue Booking' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.buttonBackground }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.buttonText : colors.placeholder }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
          <Text style={[styles.loadingText, { color: colors.placeholder }]}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings()}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No bookings found in this category
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  tabContainer: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '500' },
  listContainer: { padding: 20, paddingTop: 0 },
  bookingCard: { borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  farmhouseName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  location: { fontSize: 14, marginBottom: 8 },
  dateRow: { marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: '500' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalAmount: { fontSize: 16, fontWeight: 'bold' },
  advanceAmount: { fontSize: 14 },
  guestInfo: { fontSize: 14, marginBottom: 10 },
  paymentStatus: { fontSize: 14, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  detailsButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  continueButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
});
