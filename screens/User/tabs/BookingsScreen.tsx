import React, { useState, useEffect } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, Users, CreditCard } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../authContext';
import { getUserBookings, cancelBooking, Booking as BookingType } from '../../../services/bookingService';

export default function BookingsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { user } = useAuth();

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
      default: return colors.placeholder;
    }
  };

  const handleCancelBooking = async (bookingId: string, farmhouseName: string) => {
    Alert.alert('Cancel Booking', `Cancel booking for ${farmhouseName}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
            Alert.alert('Success', 'Booking cancelled successfully');
            loadBookings();
          } catch (error) {
            console.error('Error cancelling booking:', error);
            Alert.alert('Error', 'Failed to cancel booking');
          }
        }
      }
    ]);
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
    <View style={[styles.bookingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.bookingHeader}>
        <Text style={[styles.farmhouseName, { color: colors.text }]} numberOfLines={1}>
          {item.farmhouseName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MapPin size={14} color={colors.placeholder} />
        <Text style={[styles.infoText, { color: colors.placeholder }]}>Location info</Text>
      </View>

      <View style={styles.infoRow}>
        <Calendar size={14} color={colors.placeholder} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {new Date(item.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(item.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Users size={14} color={colors.placeholder} />
        <Text style={[styles.infoText, { color: colors.placeholder }]}>
          {item.guests} guests • {item.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}
        </Text>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.priceContainer}>
          <CreditCard size={16} color={colors.buttonBackground} />
          <Text style={[styles.totalAmount, { color: colors.buttonBackground }]}>₹{item.totalPrice}</Text>
        </View>
        <View style={[styles.paymentBadge, { backgroundColor: item.paymentStatus === 'paid' ? '#E8F5E9' : '#FFF3E0' }]}>
          <Text style={[styles.paymentText, { color: item.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800' }]}>
            {item.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => navigation.navigate('FarmhouseDetail', { farmhouseId: item.id })}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>View Details</Text>
        </TouchableOpacity>
        {(item.status === 'confirmed' || item.status === 'pending') && getBookingCategory(item) === 'future' && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: '#F44336' }]}
            onPress={() => handleCancelBooking(item.id, item.farmhouseName)}
          >
            <Text style={[styles.cancelButtonText, { color: '#F44336' }]}>Cancel</Text>
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
              { key: 'cancelled', label: 'Cancelled' }
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
                No bookings found
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
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  tabText: { fontSize: 14, fontWeight: '500' },
  listContainer: { padding: 20, paddingTop: 0 },
  bookingCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  farmhouseName: { fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 14 },
  dateText: { fontSize: 14, fontWeight: '500' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalAmount: { fontSize: 18, fontWeight: 'bold' },
  paymentBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  paymentText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  viewButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  buttonText: { fontSize: 14, fontWeight: '600' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
});