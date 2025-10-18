import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image,
  ActivityIndicator, RefreshControl, Dimensions, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Users, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Phone, Home, Navigation } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { RootStackScreenProps } from '../../types/navigation';
import { 
  doc, getDoc, updateDoc, addDoc, collection, deleteDoc,
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { removeBookedDatesFromFarmhouse } from '../../services/farmhouseService';
import { useGlobalData } from '../../GlobalDataContext';

const { width } = Dimensions.get('window');

type Props = RootStackScreenProps<'BookingDetails'>;

type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking';
type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';
type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'draft';

interface BookingDetails {
  id: string;
  farmhouse_id: string;
  farmhouseName: string;
  farmhouseImage: string;
  location: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  numberOfNights: number;
  bookingType: 'overnight' | 'day-use';
  status: BookingStatus;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  bookingDate: string;
  checkInTime: string;
  checkOutTime: string;
  upiId?: string;
  cardLast4?: string;
  bankName?: string;
  cancellationDate?: string | null;
  refundAmount?: number;
  refundStatus?: RefundStatus | null;
  refundDate?: string | null;
  selectedDates?: { start: string; end: string } | null;
  draftGuestCount?: number | null;
  expiresAt?: number | null;
  category: 'future' | 'past' | 'present' | 'draft';
  base_price?: number;
  extra_guest_charge?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  farmhouseDescription?: string;
  farmhousePhotos?: string[];
  farmhouseRules?: any;
  farmhouseMapLink?: string;
  farmhouseCoordinates?: { latitude: number; longitude: number };
  farmhouseContactPhone1?: string;
  farmhouseContactPhone2?: string;
  capacity?: number;
  rooms?: number;
}

export default function BookingDetailsScreen({ route, navigation }: Props) {
  const { booking: initialBooking } = route.params;
  const { colors, isDark } = useTheme();
  const { getFarmhouseById } = useGlobalData();

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchBookingDetails();
  }, [initialBooking.id]);

  useEffect(() => {
    if (!bookingDetails) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', initialBooking.id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          updateBookingDetailsFromFirestore(data);
        }
      },
      (error) => console.error('Error listening to booking updates:', error)
    );

    return () => unsubscribe();
  }, [bookingDetails?.id]);

  useEffect(() => {
    if (bookingDetails?.status === 'draft' && bookingDetails.expiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, bookingDetails.expiresAt! - Date.now());
        setTimeRemaining(remaining);
        if (remaining === 0) {
          clearInterval(interval);
          handleDraftExpiration();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [bookingDetails?.status, bookingDetails?.expiresAt]);

  const fetchBookingDetails = async () => {
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', initialBooking.id));
      if (!bookingDoc.exists()) {
        Alert.alert('Error', 'Booking not found');
        navigation.goBack();
        return;
      }
      const data = bookingDoc.data();
      await updateBookingDetailsFromFirestore(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookingDetails();
    setRefreshing(false);
  };

  const updateBookingDetailsFromFirestore = async (data: any) => {
    let category: 'future' | 'past' | 'present' | 'draft' = 'future';
    const now = new Date();
    const startDate = new Date(data.checkInDate || data.start_date);
    const endDate = new Date(data.checkOutDate || data.end_date);

    if (data.status === 'draft') category = 'draft';
    else if (data.status === 'completed' || now > endDate) category = 'past';
    else if (now >= startDate && now <= endDate) category = 'present';

    // Fetch farmhouse details from GlobalDataContext or Firestore
    let farmhouseData: any = {};
    try {
      // First try to get from GlobalDataContext
      const cachedFarmhouse = getFarmhouseById(data.farmhouseId || data.farmhouse_id);
      if (cachedFarmhouse) {
        farmhouseData = cachedFarmhouse;
      } else {
        // Fallback to direct Firestore fetch
        const farmhouseDoc = await getDoc(doc(db, 'farmhouses', data.farmhouseId || data.farmhouse_id));
        if (farmhouseDoc.exists()) {
          farmhouseData = farmhouseDoc.data();
        }
      }
    } catch (error) {
      console.error('Error fetching farmhouse details:', error);
    }

    // Calculate number of nights
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const details: BookingDetails = {
      id: initialBooking.id,
      farmhouse_id: data.farmhouseId || data.farmhouse_id,
      farmhouseName: data.farmhouseName || farmhouseData.name || farmhouseData.basicDetails?.name || 'Unknown Farmhouse',
      farmhouseImage: farmhouseData.photos?.[0] || farmhouseData.photoUrls?.[0] || data.farmhouseImage || data.farmhouse_image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      location: data.location || farmhouseData.location || farmhouseData.basicDetails?.locationText || 'Location not available',
      startDate: data.checkInDate || data.start_date,
      endDate: data.checkOutDate || data.end_date,
      guestCount: data.guests || data.guest_count || 0,
      numberOfNights: nights || data.number_of_nights || 0,
      bookingType: (data.bookingType === 'dayuse' || data.booking_type === 'day-use') ? 'day-use' : 'overnight',
      status: data.status,
      totalAmount: data.totalPrice || data.final_amount || data.total_amount || data.subtotal || 0,
      paidAmount: data.totalPrice || data.paid_amount || data.final_amount || data.total_amount || 0,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id || `TXN${data.createdAt?.seconds || Date.now()}`,
      bookingDate: data.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || new Date(data.createdAt).toLocaleDateString('en-IN') || new Date().toLocaleDateString('en-IN'),
      checkInTime: (data.bookingType === 'dayuse' || data.booking_type === 'day-use') ? '10:00 AM' : '2:00 PM',
      checkOutTime: (data.bookingType === 'dayuse' || data.booking_type === 'day-use') ? '11:00 PM' : '12:00 PM',
      upiId: data.upi_id,
      cardLast4: data.card_last_4,
      bankName: data.bank_name,
      cancellationDate: data.cancellation_date,
      refundAmount: data.refund_amount,
      refundStatus: data.refund_status,
      refundDate: data.refund_date,
      expiresAt: data.expires_at,
      category,
      base_price: data.originalPrice || data.base_price,
      extra_guest_charge: data.extra_guest_charge,
      discount_amount: data.discountApplied || data.discount_amount || 0,
      coupon_code: data.couponCode || data.coupon_code,
      farmhouseDescription: farmhouseData.description || farmhouseData.basicDetails?.description,
      farmhousePhotos: farmhouseData.photos || farmhouseData.photoUrls || [data.farmhouseImage || data.farmhouse_image],
      farmhouseRules: farmhouseData.rules,
      farmhouseMapLink: farmhouseData.mapLink || farmhouseData.basicDetails?.mapLink,
      farmhouseCoordinates: farmhouseData.coordinates,
      farmhouseContactPhone1: farmhouseData.contactPhone1 || farmhouseData.basicDetails?.contactPhone1,
      farmhouseContactPhone2: farmhouseData.contactPhone2 || farmhouseData.basicDetails?.contactPhone2,
      capacity: farmhouseData.capacity || farmhouseData.basicDetails?.capacity,
      rooms: farmhouseData.bedrooms || farmhouseData.basicDetails?.bedrooms,
    };

    setBookingDetails(details);
  };

  const handleDraftExpiration = async () => {
    try {
      await deleteDoc(doc(db, 'bookings', initialBooking.id));
      Alert.alert('Reservation Expired', 'Your temporary reservation has expired. The dates are now available for others to book.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Error deleting expired draft:', error);
      navigation.goBack();
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleContinueBooking = () => {
    if (!bookingDetails) return;
    navigation.navigate('FarmhouseDetail', {
      farmhouse: { id: bookingDetails.farmhouse_id, name: bookingDetails.farmhouseName, location: bookingDetails.location } as any,
      draftData: { bookingId: bookingDetails.id, selectedDates: { start: bookingDetails.startDate, end: bookingDetails.endDate }, guestCount: bookingDetails.guestCount }
    });
  };

  const handleCancelBooking = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking? You will receive 80% refund of the total amount paid.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: processCancellation }
    ]);
  };

  const processCancellation = async () => {
    if (!bookingDetails) return;
    setCancelling(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to cancel a booking');
        setCancelling(false);
        return;
      }

      const refundAmount = Math.floor(bookingDetails.totalAmount * 0.8);
      const cancellationDate = new Date().toISOString().split('T')[0];

      await updateDoc(doc(db, 'bookings', bookingDetails.id), {
        status: 'cancelled',
        cancellation_date: cancellationDate,
        refund_amount: refundAmount,
        refund_status: 'processing',
        updated_at: serverTimestamp(),
      });

      const datesToFree = generateDateRange(bookingDetails.startDate, bookingDetails.endDate);
      await removeBookedDatesFromFarmhouse(bookingDetails.farmhouse_id, datesToFree);

      await addDoc(collection(db, 'refunds'), {
        booking_id: bookingDetails.id,
        user_id: currentUser.uid,
        amount: refundAmount,
        original_amount: bookingDetails.totalAmount,
        status: 'processing',
        payment_method: bookingDetails.paymentMethod,
        transaction_id: bookingDetails.transactionId,
        created_at: serverTimestamp(),
      });

      setCancelling(false);
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully. The dates are now available for others. Your refund will be processed within 5-7 business days.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setCancelling(false);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    }
  };

  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    if (!start || !end) return dates;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if(dates.length === 0 && start === end) dates.push(start);
    
    return dates;
  };

  const handleCall = (phoneNumber: string) => Linking.openURL(`tel:${phoneNumber}`);

  const openGoogleMaps = () => {
    if (!bookingDetails) return;
    
    let url = '';
    if (bookingDetails.farmhouseMapLink) url = bookingDetails.farmhouseMapLink;
    else if (bookingDetails.farmhouseCoordinates) url = `http://maps.google.com/maps?q=$${bookingDetails.farmhouseCoordinates.latitude},${bookingDetails.farmhouseCoordinates.longitude}`;
    else { Alert.alert("Location not available", "Map link or coordinates are not available for this farmhouse."); return; }

    Linking.canOpenURL(url).then(supported => supported ? Linking.openURL(url) : Alert.alert('Error', `Could not open the map link.`))
      .catch(err => console.error('An error occurred opening the map', err));
  };

  const getStatusIcon = () => {
    if (!bookingDetails) return null;
    switch (bookingDetails.status) {
      case 'confirmed': return <CheckCircle size={24} color="#4CAF50" />;
      case 'cancelled': return <XCircle size={24} color="#F44336" />;
      case 'completed': return <CheckCircle size={24} color="#2196F3" />;
      case 'draft': return <Clock size={24} color="#FF9800" />;
      default: return <AlertCircle size={24} color={colors.placeholder} />;
    }
  };

  const getStatusColor = () => {
    if (!bookingDetails) return colors.placeholder;
    switch (bookingDetails.status) {
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      case 'draft': return '#FF9800';
      default: return colors.placeholder;
    }
  };

  const getPaymentMethodIcon = () => {
    if (!bookingDetails?.paymentMethod) return <CreditCard size={20} color={colors.buttonBackground} />;
    switch (bookingDetails.paymentMethod) {
      case 'UPI': return <Phone size={20} color={colors.buttonBackground} />;
      case 'Credit Card':
      case 'Debit Card': return <CreditCard size={20} color={colors.buttonBackground} />;
      case 'Net Banking': return <Home size={20} color={colors.buttonBackground} />;
      default: return <CreditCard size={20} color={colors.buttonBackground} />;
    }
  };

  const getPaymentMethodDetails = () => {
    if (!bookingDetails) return 'Payment Details';
    switch (bookingDetails.paymentMethod) {
      case 'UPI': return bookingDetails.upiId || 'UPI Payment';
      case 'Credit Card': return bookingDetails.cardLast4 ? `Credit Card •••• ${bookingDetails.cardLast4}` : 'Credit Card';
      case 'Debit Card': return bookingDetails.cardLast4 ? `Debit Card •••• ${bookingDetails.cardLast4}` : 'Debit Card';
      case 'Net Banking': return bookingDetails.bankName || 'Net Banking';
      default: return 'Online Payment';
    }
  };

  const getRefundStatusColor = () => {
    if (!bookingDetails?.refundStatus) return colors.placeholder;
    switch (bookingDetails.refundStatus) {
      case 'completed': return '#4CAF50';
      case 'processing': return '#FF9800';
      case 'pending': return '#2196F3';
      case 'failed': return '#F44336';
      default: return colors.placeholder;
    }
  };

  const getRefundStatusText = () => {
    if (!bookingDetails?.refundStatus) return 'Refund Status';
    switch (bookingDetails.refundStatus) {
      case 'completed': return 'Refund Completed';
      case 'processing': return 'Refund Processing';
      case 'pending': return 'Refund Pending';
      case 'failed': return 'Refund Failed';
      default: return 'Refund Status';
    }
  };

  const getRefundStatusIcon = () => {
    if (!bookingDetails?.refundStatus) return <AlertCircle size={20} color={colors.placeholder} />;
    switch (bookingDetails.refundStatus) {
      case 'completed': return <CheckCircle size={20} color="#4CAF50" />;
      case 'processing': return <Clock size={20} color="#FF9800" />;
      case 'pending': return <AlertCircle size={20} color="#2196F3" />;
      case 'failed': return <XCircle size={20} color="#F44336" />;
      default: return <AlertCircle size={20} color={colors.placeholder} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bookingDetails) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.buttonBackground]}
            tintColor={colors.buttonBackground}
          />
        }
      >
        {/* Farmhouse Images */}
        <View style={styles.imageSection}>
          <Image 
            source={{ uri: bookingDetails.farmhousePhotos?.[currentImageIndex] || bookingDetails.farmhouseImage }} 
            style={styles.image}
            resizeMode="cover"
          />
          {bookingDetails.farmhousePhotos && bookingDetails.farmhousePhotos.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} / {bookingDetails.farmhousePhotos.length}
              </Text>
            </View>
          )}
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <View style={styles.statusContent}>
            {getStatusIcon()}
            <Text style={styles.statusText}>
              {bookingDetails.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Draft Timer */}
        {bookingDetails.status === 'draft' && timeRemaining !== null && (
          <View style={[styles.timerBanner, { backgroundColor: colors.cardBackground, borderColor: '#FF9800' }]}>
            <Clock size={20} color="#FF9800" />
            <Text style={[styles.timerText, { color: colors.text }]}>
              Complete booking in {formatTime(timeRemaining)}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Farmhouse Info */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.farmhouseName, { color: colors.text }]}>
              {bookingDetails.farmhouseName}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.placeholder} />
              <Text style={[styles.locationText, { color: colors.placeholder }]}>
                {bookingDetails.location}
              </Text>
            </View>
            
            {(bookingDetails.capacity > 0 || bookingDetails.rooms > 0) && (
              <View style={styles.quickInfo}>
                {bookingDetails.rooms > 0 && (
                  <View style={styles.quickInfoItem}>
                    <Home size={16} color={colors.buttonBackground} />
                    <Text style={[styles.quickInfoText, { color: colors.text }]}>
                      {bookingDetails.rooms} Rooms
                    </Text>
                  </View>
                )}
                {bookingDetails.capacity > 0 && (
                  <View style={styles.quickInfoItem}>
                    <Users size={16} color={colors.buttonBackground} />
                    <Text style={[styles.quickInfoText, { color: colors.text }]}>
                      Up to {bookingDetails.capacity} guests
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Contact Buttons */}
            {(!!bookingDetails.farmhouseContactPhone1 || !!bookingDetails.farmhouseContactPhone2) && (
              <View style={styles.contactRow}>
                {!!bookingDetails.farmhouseContactPhone1 && (
                  <TouchableOpacity 
                    style={[styles.contactButton, { backgroundColor: colors.buttonBackground }]}
                    onPress={() => handleCall(bookingDetails.farmhouseContactPhone1!)}
                  >
                    <Phone size={16} color={colors.buttonText} />
                    <Text style={[styles.contactButtonText, { color: colors.buttonText }]}>
                      Call Owner
                    </Text>
                  </TouchableOpacity>
                )}
                {!!bookingDetails.farmhouseContactPhone2 && (
                  <TouchableOpacity 
                    style={[styles.contactButton, { backgroundColor: colors.buttonBackground }]}
                    onPress={() => handleCall(bookingDetails.farmhouseContactPhone2!)}
                  >
                    <Phone size={16} color={colors.buttonText} />
                    <Text style={[styles.contactButtonText, { color: colors.buttonText }]}>
                      Call (Alt)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Booking Information */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Information</Text>
            
            <View style={styles.infoRow}>
              <Calendar size={20} color={colors.buttonBackground} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Check-in</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(bookingDetails.startDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })} at {bookingDetails.checkInTime}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={20} color={colors.buttonBackground} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Check-out</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(bookingDetails.endDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })} at {bookingDetails.checkOutTime}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Users size={20} color={colors.buttonBackground} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Guests</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {bookingDetails.guestCount} {bookingDetails.guestCount === 1 ? 'Guest' : 'Guests'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Clock size={20} color={colors.buttonBackground} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Duration</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {bookingDetails.bookingType === 'day-use' 
                    ? 'Day Use' 
                    : `${bookingDetails.numberOfNights} ${bookingDetails.numberOfNights === 1 ? 'Night' : 'Nights'}`}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={20} color={colors.buttonBackground} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Booked On</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {bookingDetails.bookingDate}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Details */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Details</Text>
            
            {bookingDetails.base_price != null && (
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, { color: colors.placeholder }]}>Base Price</Text>
                <Text style={[styles.paymentValue, { color: colors.text }]}>₹{bookingDetails.base_price}</Text>
              </View>
            )}

            {bookingDetails.discount_amount && bookingDetails.discount_amount > 0 && (
              <>
                <View style={styles.paymentRow}>
                  <Text style={[styles.paymentLabel, { color: '#10B981' }]}>
                    Discount {bookingDetails.coupon_code ? `(${bookingDetails.coupon_code})` : ''}
                  </Text>
                  <Text style={[styles.paymentValue, { color: '#10B981' }]}>
                    -₹{bookingDetails.discount_amount}
                  </Text>
                </View>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.text, fontWeight: 'bold', fontSize: 16 }]}>
                Amount Paid
              </Text>
              <Text style={[styles.paymentValue, { color: colors.buttonBackground, fontWeight: 'bold', fontSize: 18 }]}>
                ₹{bookingDetails.totalAmount}
              </Text>
            </View>

            {bookingDetails.status === 'confirmed' && (
              <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)', borderColor: '#4CAF50' }]}>
                <Text style={[styles.noticeText, { color: colors.text }]}>
                  Payment confirmed. Your booking is secured!
                </Text>
              </View>
            )}
          </View>

          {/* Map Section */}
          {(!!bookingDetails.farmhouseCoordinates || !!bookingDetails.farmhouseMapLink) && (
            <View style={[styles.section, styles.mapContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {bookingDetails.farmhouseCoordinates ? (
                <View style={styles.mapWrapper}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: bookingDetails.farmhouseCoordinates.latitude,
                      longitude: bookingDetails.farmhouseCoordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: bookingDetails.farmhouseCoordinates.latitude,
                        longitude: bookingDetails.farmhouseCoordinates.longitude,
                      }}
                      title={bookingDetails.farmhouseName}
                    />
                  </MapView>
                  <TouchableOpacity 
                    style={[styles.mapOverlay, { backgroundColor: colors.buttonBackground }]}
                    onPress={openGoogleMaps}
                  >
                    <Navigation size={18} color={colors.buttonText} />
                    <Text style={[styles.mapOverlayText, { color: colors.buttonText }]}>
                      Open in Maps
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.mapPlaceholder, { backgroundColor: colors.background }]}>
                  <MapPin size={40} color={colors.placeholder} />
                  <Text style={[styles.mapPlaceholderText, { color: colors.text }]}>
                    {bookingDetails.farmhouseName}
                  </Text>
                  <TouchableOpacity 
                    style={styles.mapPlaceholderButton}
                    onPress={openGoogleMaps}
                  >
                    <Navigation size={16} color={colors.buttonBackground} />
                    <Text style={[styles.mapPlaceholderButtonText, { color: colors.buttonBackground }]}>
                      View on Map
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {!!bookingDetails.farmhouseDescription && (
            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About this Farmhouse</Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {bookingDetails.farmhouseDescription}
              </Text>
            </View>
          )}

          {/* Rules */}
          {!!bookingDetails.farmhouseRules && (
            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>House Rules</Text>
              {bookingDetails.farmhouseRules.unmarriedCouples && (
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  ✓ Unmarried couples allowed
                </Text>
              )}
              {!bookingDetails.farmhouseRules.unmarriedCouples && (
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  ✗ Unmarried couples not allowed
                </Text>
              )}
              {bookingDetails.farmhouseRules.pets && (
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  ✓ Pets allowed
                </Text>
              )}
              {!bookingDetails.farmhouseRules.pets && (
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  ✗ Pets not allowed
                </Text>
              )}
              {bookingDetails.farmhouseRules.quietHours && (
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  ✓ Quiet hours: 10 PM - 8 AM
                </Text>
              )}
            </View>
          )}

          {/* Refund Information */}
          {bookingDetails.status === 'cancelled' && bookingDetails.refundAmount != null && (
            <View style={[styles.refundBox, { backgroundColor: colors.cardBackground, borderColor: getRefundStatusColor() }]}>
              <View style={styles.refundHeader}>
                {getRefundStatusIcon()}
                <Text style={[styles.refundTitle, { color: colors.text }]}>
                  {getRefundStatusText()}
                </Text>
              </View>
              
              <View style={styles.refundRow}>
                <Text style={[styles.refundLabel, { color: colors.placeholder }]}>Refund Amount</Text>
                <Text style={[styles.refundAmount, { color: getRefundStatusColor() }]}>
                  ₹{bookingDetails.refundAmount}
                </Text>
              </View>

              {!!bookingDetails.cancellationDate && (
                <View style={styles.refundRow}>
                  <Text style={[styles.refundLabel, { color: colors.placeholder }]}>Cancelled On</Text>
                  <Text style={[styles.refundLabel, { color: colors.text }]}>
                    {new Date(bookingDetails.cancellationDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              )}

              {bookingDetails.refundStatus === 'processing' && (
                <Text style={[styles.refundNote, { color: colors.placeholder }]}>
                  Your refund is being processed and will be credited to your original payment method within 5-7 business days.
                </Text>
              )}
              
              {bookingDetails.refundStatus === 'completed' && !!bookingDetails.refundDate && (
                <Text style={[styles.refundNote, { color: '#4CAF50' }]}>
                  Refund completed on {new Date(bookingDetails.refundDate).toLocaleDateString('en-IN')}
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {bookingDetails.status === 'draft' && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleContinueBooking}
              >
                <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                  Continue Booking
                </Text>
              </TouchableOpacity>
            )}

            {bookingDetails.status === 'confirmed' && bookingDetails.category === 'future' && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: '#F44336' }]}
                onPress={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.buttonBackground }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.buttonBackground }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  imageSection: { position: 'relative', height: 250 },
  image: { width, height: 250 },
  imageCounter: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  statusBanner: { paddingVertical: 12 },
  statusContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  timerBanner: { marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerText: { fontSize: 14, flex: 1 },
  content: { padding: 20 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  farmhouseName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontSize: 14 },
  quickInfo: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 12 },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickInfoText: { fontSize: 14, fontWeight: '500' },
  contactRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  contactButtonText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  paymentLabel: { fontSize: 14 },
  paymentValue: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },
  paymentMethodIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(2,68,77,0.1)', alignItems: 'center', justifyContent: 'center' },
  transactionBox: { padding: 12, borderRadius: 8, marginTop: 12 },
  transactionLabel: { fontSize: 12, marginBottom: 4 },
  transactionId: { fontSize: 14, fontWeight: '600' },
  noticeBox: { padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1 },
  noticeText: { fontSize: 13, lineHeight: 18 },
  mapContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, padding: 0 },
  mapWrapper: { position: 'relative' },
  map: { width: '100%', height: 200 },
  mapOverlay: { position: 'absolute', bottom: 16, left: '50%', transform: [{ translateX: -90 }], flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  mapOverlayText: { fontSize: 14, fontWeight: '600' },
  mapPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { fontSize: 16, fontWeight: '600' },
  mapPlaceholderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  mapPlaceholderButtonText: { fontSize: 14, fontWeight: '600' },
  description: { fontSize: 15, lineHeight: 22 },
  ruleText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  refundBox: { padding: 16, borderRadius: 10, borderWidth: 2, marginTop: 12, marginBottom: 16 },
  refundHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  refundTitle: { fontSize: 16, fontWeight: 'bold' },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refundLabel: { fontSize: 14 },
  refundAmount: { fontSize: 18, fontWeight: 'bold' },
  refundNote: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  actionSection: { marginTop: 8, gap: 12, marginBottom: 20 },
  primaryButton: { paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});