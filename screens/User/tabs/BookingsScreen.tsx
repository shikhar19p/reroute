import React, { useState, useEffect } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../authContext';
import { getUserBookings, cancelBooking, Booking as BookingType } from '../../../services/bookingService';
import { previewCancellationRefund, cancelBookingWithRefund, getCancellationPolicyDescription } from '../../../services/cancellationService';

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, typography, shadows } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getUserBookings(user?.uid || '');
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      case 'draft': return '#9E9E9E';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'checkbox-marked-circle';
      case 'draft': return 'file-document-outline';
      default: return 'information';
    }
  };

  const handleCancelBooking = async (bookingId: string, farmhouseName: string) => {
    try {
      // Show loading
      setLoading(true);

      // Get refund preview
      const preview = await previewCancellationRefund(bookingId);
      setLoading(false);

      // Show cancellation policy and refund details
      const refundMessage = preview.refundAmount > 0
        ? `You will receive a refund of ₹${preview.refundAmount}\n\n${preview.policyDescription}`
        : `${preview.policyDescription}\n\nNo refund will be processed.`;

      Alert.alert(
        'Cancel Booking',
        `Are you sure you want to cancel your booking for ${farmhouseName}?\n\n${refundMessage}`,
        [
          { text: 'Keep Booking', style: 'cancel' },
          {
            text: 'Confirm Cancellation',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                const result = await cancelBookingWithRefund(bookingId, user?.uid || '', 'User requested cancellation');

                setLoading(false);

                if (result.success) {
                  const successMessage = result.refundAmount > 0
                    ? `Booking cancelled successfully!\n\nRefund Amount: ₹${result.refundAmount}\nRefunds will be processed in 5-7 business days.`
                    : 'Booking cancelled successfully!';

                  Alert.alert('Cancellation Confirmed', successMessage);
                  await loadBookings();
                } else {
                  Alert.alert('Error', 'Failed to cancel booking. Please try again.');
                }
              } catch (error: any) {
                setLoading(false);
                console.error('Error cancelling booking:', error);
                Alert.alert('Error', error.message || 'Failed to cancel booking');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      setLoading(false);
      console.error('Error previewing cancellation:', error);
      Alert.alert('Error', 'Failed to load cancellation details. Please try again.');
    }
  };

  const handleContinueBooking = (farmhouseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <TouchableOpacity
      style={[styles.bookingCard, { backgroundColor: colors.cardBackground, ...shadows.md }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        (navigation as any).navigate('FarmhouseDetail', { farmhouseId: item.id });
      }}
      activeOpacity={0.9}
    >
      <View style={styles.bookingHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.farmhouseName, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
            {item.farmhouseName}
          </Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {item.location || 'Location'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <MaterialCommunityIcons name={getStatusIcon(item.status)} size={14} color="white" />
          <Text style={[styles.statusText, { fontFamily: typography.fontFamily.semiBold }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateItem}>
          <MaterialCommunityIcons name="calendar-start" size={18} color={colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.dateLabel, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
              Check-in
            </Text>
            <Text style={[styles.dateText, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
              {new Date(item.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textTertiary} />
        <View style={styles.dateItem}>
          <MaterialCommunityIcons name="calendar-end" size={18} color={colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.dateLabel, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
              Check-out
            </Text>
            <Text style={[styles.dateText, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
              {new Date(item.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {item.guests} guests
          </Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name={item.bookingType === 'dayuse' ? 'weather-sunny' : 'weather-night'} size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {item.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.totalLabel, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
            Total Amount
          </Text>
          <Text style={[styles.totalAmount, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>
            ₹{item.totalPrice}
          </Text>
        </View>
        <View style={[styles.paymentBadge, { backgroundColor: item.paymentStatus === 'paid' ? '#E8F5E9' : colors.border }]}>
          <MaterialCommunityIcons
            name={item.paymentStatus === 'paid' ? 'check-circle' : 'clock-outline'}
            size={14}
            color={item.paymentStatus === 'paid' ? '#4CAF50' : colors.textSecondary}
          />
          <Text style={[styles.paymentText, {
            color: item.paymentStatus === 'paid' ? '#4CAF50' : colors.textSecondary,
            fontFamily: typography.fontFamily.medium
          }]}>
            {item.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: colors.primary, ...shadows.sm }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (navigation as any).navigate('FarmhouseDetail', { farmhouseId: item.id });
          }}
        >
          <MaterialCommunityIcons name="eye" size={16} color="white" />
          <Text style={[styles.buttonText, { fontFamily: typography.fontFamily.semiBold }]}>
            View Details
          </Text>
        </TouchableOpacity>
        {(item.status === 'confirmed' || item.status === 'pending') && getBookingCategory(item) === 'future' && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.errorLight, ...shadows.sm }]}
            onPress={() => handleCancelBooking(item.id, item.farmhouseName)}
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
            <Text style={[styles.cancelButtonText, { color: colors.error, fontFamily: typography.fontFamily.semiBold }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            My Bookings
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
          </Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name="calendar-check" size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollView}>
        <View style={styles.tabContainer}>
          {[
            { key: 'all', label: 'All', icon: 'view-grid' },
            { key: 'current', label: 'Current', icon: 'progress-clock' },
            { key: 'past', label: 'Past', icon: 'history' },
            { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary : colors.cardBackground,
                  ...shadows.sm
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? 'white' : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                {
                  color: activeTab === tab.key ? 'white' : colors.textSecondary,
                  fontFamily: activeTab === tab.key ? typography.fontFamily.semiBold : typography.fontFamily.regular
                }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Loading bookings...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings()}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContainer, filteredBookings().length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
                No bookings found
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Start exploring farmhouses to make your first booking
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.primary, ...shadows.md }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  (navigation as any).navigate('Explore');
                }}
              >
                <MaterialCommunityIcons name="compass" size={20} color="white" />
                <Text style={[styles.browseButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
                  Explore Farmhouses
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabScrollView: { maxHeight: 50, marginBottom: 12 },
  tabContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  tab: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabText: { fontSize: 14 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: { marginTop: 16, fontSize: 16 },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyList: { flex: 1 },
  bookingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  farmhouseName: { fontSize: 18, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 13 },
  statusBadge: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 10 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 12,
  },
  dateItem: { flexDirection: 'row', alignItems: 'center' },
  dateLabel: { fontSize: 11, marginBottom: 2 },
  dateText: { fontSize: 14 },
  infoRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  totalLabel: { fontSize: 12, marginBottom: 4 },
  totalAmount: { fontSize: 22 },
  paymentBadge: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentText: { fontSize: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: 'white', fontSize: 14 },
  cancelButtonText: { fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 16, marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  browseButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  browseButtonText: { color: 'white', fontSize: 16 },
});
