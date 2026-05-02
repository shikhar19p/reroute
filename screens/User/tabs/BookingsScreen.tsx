import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, Users, CreditCard } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../authContext';
import { useToast } from '../../../components/Toast';
import { useDialog } from '../../../components/CustomDialog';
import { useScrollHandler, useTabBarVisibility } from '../../../context/TabBarVisibilityContext';
import { Booking } from '../../../services/bookingService';
import { cancelBookingWithRefund, calculateRefundAmount } from '../../../services/cancellationService';
import { parseError } from '../../../utils/errorHandler';
import { useFocusEffect } from '@react-navigation/native';

import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

function calcNights(checkIn: string, checkOut: string, bookingType: string): number {
  if (bookingType === 'dayuse') return 1;
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

// Memoized booking card component for better performance
const BookingCard = React.memo(({
  item,
  colors,
  getStatusColor,
  getBookingCategory,
  handleCancelBooking,
  navigation
}: any) => {
  const category = getBookingCategory(item);
  const canCancel = (item.status === 'confirmed' || item.status === 'pending') && category === 'upcoming';
  const isPending = item.status === 'pending' && category === 'upcoming';

  const navigateToContinuePayment = () => {
    navigation.navigate('BookingConfirmation', {
      farmhouseId: item.farmhouseId,
      farmhouseName: item.farmhouseName,
      farmhouseImage: item.farmhouseImage || '',
      location: item.location || '',
      startDate: item.checkInDate,
      endDate: item.checkOutDate,
      guestCount: item.guests,
      totalPrice: item.originalPrice || item.totalPrice,
      numberOfNights: calcNights(item.checkInDate, item.checkOutDate, item.bookingType),
      bookingType: item.bookingType === 'dayuse' ? 'day-use' : 'overnight',
      existingBookingId: item.id,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.bookingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={isPending ? navigateToContinuePayment : () => navigation.navigate('BookingDetails', { booking: item, bookingId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.bookingHeader}>
        <Text style={[styles.farmhouseName, { color: colors.text }]} numberOfLines={1}>
          {item.farmhouseName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
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
          {item.guests} guest{item.guests !== 1 ? 's' : ''} • {item.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}
        </Text>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.priceContainer}>
          <CreditCard size={16} color={colors.buttonBackground} />
          <Text style={[styles.totalAmount, { color: colors.buttonBackground }]}>₹{item.totalPrice}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {isPending ? (
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.statusPending }]}
            onPress={navigateToContinuePayment}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Continue Payment</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.buttonBackground }]}
            onPress={() => navigation.navigate('BookingDetails', { booking: item, bookingId: item.id })}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>View Details</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.error }]}
            onPress={() => handleCancelBooking(item)}
          >
            <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

BookingCard.displayName = 'BookingCard';

export default function BookingsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const scrollHandler = useScrollHandler();
  const { showTabBar } = useTabBarVisibility();

  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));
  
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Set up real-time listener
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookingsData: Booking[] = [];
        snapshot.forEach((doc) => {
          bookingsData.push({
            id: doc.id,
            ...doc.data()
          } as Booking);
        });
        setBookings(bookingsData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error loading bookings:', error);
        showDialog({
          title: 'Couldn\'t load bookings',
          message: 'Pull down to retry.',
          type: 'error'
        });
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.statusConfirmed;
      case 'pending': return colors.statusPending;
      case 'cancelled': return colors.statusCancelled;
      case 'completed': return colors.statusCompleted;
      default: return colors.placeholder;
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!user) return;

    const preview = calculateRefundAmount(booking.totalPrice, booking.checkInDate);
    const refundLine = preview.refundPercentage > 0
      ? `\n\nRefund: ₹${preview.refundAmount.toLocaleString('en-IN')} (${preview.refundPercentage}%) — 5–7 business days.`
      : '\n\nNo refund — cancellation after check-in time.';

    showDialog({
      title: 'Cancel Booking',
      message: `Cancel your booking for ${booking.farmhouseName}?${refundLine}`,
      type: 'warning',
      buttons: [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelBookingWithRefund(
                booking.id,
                user.uid,
                'User requested cancellation'
              );
              const msg = result.refundAmount > 0
                ? `Cancelled. ₹${result.refundAmount} refund initiated.`
                : 'Booking cancelled. No refund applicable.';
              showToast(msg, result.refundAmount > 0 ? 'success' : 'info');
            } catch (error: any) {
              console.error('Error cancelling booking:', error);
              showToast(parseError(error).message, 'error');
            }
          }
        }
      ]
    });
  };

  const getBookingCategory = (booking: Booking): string => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkIn = new Date(booking.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOutDate);
    checkOut.setHours(23, 59, 59, 999);

    if (booking.status === 'cancelled') return 'cancelled';
    if (now < checkIn) return 'upcoming';
    if (now > checkOut) return 'past';
    return 'upcoming';
  };

  // Memoize filtered bookings to prevent unnecessary recalculations
  const filteredBookings = useMemo(() => {
    let filtered: Booking[] = [];

    switch (activeTab) {
      case 'upcoming':
        filtered = bookings.filter(b => {
          const category = getBookingCategory(b);
          return category === 'upcoming' && b.status !== 'cancelled';
        });
        break;
      case 'past':
        filtered = bookings.filter(b => getBookingCategory(b) === 'past' && b.status !== 'cancelled');
        break;
      case 'cancelled':
        filtered = bookings.filter(b => b.status === 'cancelled');
        break;
      default:
        filtered = [...bookings];
        break;
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.checkInDate).getTime();
      const dateB = new Date(b.checkInDate).getTime();
      return dateB - dateA;
    });
  }, [bookings, activeTab]);

  // Memoize render function
  const renderBooking = useCallback(({ item }: { item: Booking }) => {
    return (
      <BookingCard
        item={item}
        colors={colors}
        getStatusColor={getStatusColor}
        getBookingCategory={getBookingCategory}
        handleCancelBooking={handleCancelBooking}
        navigation={navigation}
      />
    );
  }, [colors, handleCancelBooking, navigation]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.placeholder }]}>
            Please login to view your bookings
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bookings</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            {[
              { key: 'upcoming', label: 'Upcoming' },
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
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          onScroll={scrollHandler.onScroll}
          scrollEventThrottle={scrollHandler.scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.buttonBackground]}
              tintColor={colors.buttonBackground}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No {activeTab !== 'all' ? activeTab : ''} bookings found
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => navigation.navigate('Explore')}
              >
                <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>
                  Browse Farmhouses
                </Text>
              </TouchableOpacity>
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
  listContainer: { padding: 20, paddingTop: 0, paddingBottom: 100 },
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
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  viewButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  buttonText: { fontSize: 14, fontWeight: '600' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  browseButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  browseButtonText: { fontSize: 14, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
});