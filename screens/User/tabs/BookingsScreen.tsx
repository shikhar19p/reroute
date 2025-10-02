import React, { useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';

interface Booking {
  id: string;
  farmhouseName: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'draft';
  totalAmount: number;
  advancePaid: number;
  category: 'future' | 'past' | 'present' | 'draft';
}

const SAMPLE_BOOKINGS: Booking[] = [
  { id: '1', farmhouseName: 'Green Valley Farmhouse', location: 'Bangalore Rural', startDate: '2025-10-15', endDate: '2025-10-17', status: 'confirmed', totalAmount: 15000, advancePaid: 5000, category: 'future' },
  { id: '2', farmhouseName: 'Sunset Hills Resort', location: 'Mysore Outskirts', startDate: '2025-09-20', endDate: '2025-09-22', status: 'completed', totalAmount: 18000, advancePaid: 6000, category: 'past' },
  { id: '3', farmhouseName: 'Palm Grove Retreat', location: 'Coorg Valley', startDate: '2025-09-28', endDate: '2025-09-30', status: 'confirmed', totalAmount: 12400, advancePaid: 4000, category: 'present' },
  { id: '4', farmhouseName: 'Mountain View Villa', location: 'Ooty Hills', startDate: '2025-10-25', endDate: '2025-10-28', status: 'cancelled', totalAmount: 20000, advancePaid: 7000, category: 'future' },
  { id: '5', farmhouseName: 'Lakeside Cottage', location: 'Wayanad', startDate: '2025-11-05', endDate: '2025-11-07', status: 'draft', totalAmount: 16000, advancePaid: 0, category: 'draft' }
];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings] = useState<Booking[]>(SAMPLE_BOOKINGS);
  const { colors } = useTheme();
  const navigation = useNavigation();

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

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => console.log('Booking cancelled:', bookingId) }
    ]);
  };

  const handleContinueBooking = (farmhouseId: string) => {
    (navigation as any).navigate('FarmhouseDetail', { farmhouseId });
  };

  const filteredBookings = () => {
    switch (activeTab) {
      case 'current': return bookings.filter(b => b.category === 'present');
      case 'past': return bookings.filter(b => b.category === 'past');
      case 'cancelled': return bookings.filter(b => b.status === 'cancelled');
      case 'draft': return bookings.filter(b => b.status === 'draft');
      default: return bookings.filter(b => b.status !== 'draft');
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <View style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.bookingHeader}>
        <Text style={[styles.farmhouseName, { color: colors.text }]}>{item.farmhouseName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.location, { color: colors.placeholder }]}>📍 {item.location}</Text>
      <View style={styles.dateRow}>
        <Text style={[styles.dateText, { color: colors.text }]}>{item.startDate} to {item.endDate}</Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.totalAmount, { color: colors.buttonBackground }]}>Total: ₹{item.totalAmount}</Text>
        <Text style={[styles.advanceAmount, { color: colors.placeholder }]}>Paid: ₹{item.advancePaid}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => (navigation as any).navigate('FarmhouseDetail', { farmhouseId: item.id })}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>View Details</Text>
        </TouchableOpacity>
        {item.status === 'draft' && (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleContinueBooking(item.id)}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Continue</Text>
          </TouchableOpacity>
        )}
        {item.status === 'confirmed' && item.category === 'future' && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleCancelBooking(item.id)}
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
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  detailsButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  continueButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
