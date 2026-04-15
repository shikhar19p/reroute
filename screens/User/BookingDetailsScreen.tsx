import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  ActivityIndicator, Linking, Dimensions, RefreshControl
} from 'react-native';
import AnimatedImage from '../../components/AnimatedImage';
import LocationMapView from '../../components/LocationMapView';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Calendar, MapPin, Phone, Mail, Clock, AlertCircle,
  CheckCircle, ChevronLeft, ChevronRight, Home, Users,
  Droplet, Flame, Tv, Shield
} from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';

const { width } = Dimensions.get('window');

interface Booking {
  id: string;
  bookingType: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: any;
  farmhouseId: string;
  farmhouseName: string;
  guests: number;
  totalPrice: number;
  originalPrice: number;
  discountApplied: number;
  paymentStatus: string;
  status: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  couponCode?: string | null;
  transactionId?: string;
  refundAmount?: number;
  refundPercentage?: number;
  refundStatus?: string;
  refundDate?: any;
  cancellationReason?: string;
  cancelledAt?: any;
  razorpayRefundId?: string;
  refundNote?: string;
}

interface Farmhouse {
  name: string;
  area: string;
  city: string;
  contactPhone1: string;
  contactPhone2: string;
  description: string;
  mapLink: string;
  capacity: string;
  bedrooms: string;
  photoUrls: string[];
  amenities: {
    pool?: boolean;
    bonfire?: number;
    tv?: number;
    geyser?: number;
    carroms?: number;
    chess?: number;
    volleyball?: number;
    customAmenities?: string;
  };
  rules: {
    additionalRules?: string;
    customRules?: string;
    petsNotAllowed?: boolean;
    pets?: boolean;
  };
}

export default function BookingDetailsScreen({ route, navigation }: any) {
  const { bookingId, booking: bookingParam } = route.params || {};
  const { colors, isDark } = useTheme();
  const scrollHandler = useScrollHandler();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [farmhouse, setFarmhouse] = useState<Farmhouse | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Always fetch fresh from Firestore if we have any ID
    const id = bookingId || bookingParam?.id;
    if (id) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);

      const id = bookingId || bookingParam?.id;
      if (!id) {
        console.error('No booking ID provided');
        setLoading(false);
        return;
      }

      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        console.error('Booking not found');
        setLoading(false);
        return;
      }

      const rawBookingData = bookingSnap.data();
      const bookingData = {
        id: bookingSnap.id,
        bookingType: rawBookingData?.bookingType || 'overnight',
        checkInDate: rawBookingData?.checkInDate || '',
        checkOutDate: rawBookingData?.checkOutDate || '',
        createdAt: rawBookingData?.createdAt || null,
        farmhouseId: rawBookingData?.farmhouseId || '',
        farmhouseName: rawBookingData?.farmhouseName || '',
        guests: Number(rawBookingData?.guests) || 0,
        totalPrice: Number(rawBookingData?.totalPrice) || 0,
        originalPrice: Number(rawBookingData?.originalPrice || rawBookingData?.totalPrice) || 0,
        discountApplied: Number(rawBookingData?.discountApplied) || 0,
        paymentStatus: rawBookingData?.paymentStatus || 'pending',
        status: rawBookingData?.status || 'pending',
        userEmail: rawBookingData?.userEmail || '',
        userName: rawBookingData?.userName || '',
        userPhone: rawBookingData?.userPhone || '',
        couponCode: rawBookingData?.couponCode || null,
        transactionId: rawBookingData?.transactionId || null,
        refundAmount: rawBookingData?.refundAmount ? Number(rawBookingData.refundAmount) : undefined,
        refundPercentage: rawBookingData?.refundPercentage ? Number(rawBookingData.refundPercentage) : undefined,
        refundStatus: rawBookingData?.refundStatus || undefined,
        refundDate: rawBookingData?.refundDate || undefined,
        cancellationReason: rawBookingData?.cancellationReason || undefined,
        cancelledAt: rawBookingData?.cancelledAt || undefined,
        razorpayRefundId: rawBookingData?.razorpayRefundId || undefined,
        refundNote: rawBookingData?.refundNote || undefined,
      } as Booking;
      
      setBooking(bookingData);

      if (bookingData.farmhouseId && bookingData.farmhouseId.trim() !== '') {
        const farmhouseRef = doc(db, 'farmhouses', bookingData.farmhouseId);
        const farmhouseSnap = await getDoc(farmhouseRef);
        
        if (farmhouseSnap.exists()) {
          const farmhouseData = farmhouseSnap.data();
          const basicDetails = farmhouseData?.basicDetails || {};
          
          setFarmhouse({
            name: basicDetails.name || farmhouseData?.name || bookingData.farmhouseName || 'Unknown Property',
            area: basicDetails.area || farmhouseData?.area || '',
            city: basicDetails.city || farmhouseData?.city || '',
            contactPhone1: basicDetails.contactPhone1 || farmhouseData?.contactPhone1 || '',
            contactPhone2: basicDetails.contactPhone2 || farmhouseData?.contactPhone2 || '',
            description: basicDetails.description || farmhouseData?.description || '',
            mapLink: basicDetails.mapLink || farmhouseData?.mapLink || '',
            capacity: String(basicDetails.capacity || farmhouseData?.capacity || '0'),
            bedrooms: String(basicDetails.bedrooms || farmhouseData?.bedrooms || '0'),
            photoUrls: Array.isArray(farmhouseData?.photoUrls) ? farmhouseData.photoUrls : [],
            amenities: farmhouseData?.amenities || {},
            rules: farmhouseData?.rules || {},
          } as Farmhouse);
        } else {
          setFarmhouse({
            name: bookingData.farmhouseName || 'Unknown Property',
            area: '',
            city: '',
            contactPhone1: '',
            contactPhone2: '',
            description: '',
            mapLink: '',
            capacity: '0',
            bedrooms: '0',
            photoUrls: [],
            amenities: {},
            rules: {},
          } as Farmhouse);
        }
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // fetchBookingDetails uses bookingId from route.params or falls back to bookingParam.id
    const id = bookingId || bookingParam?.id;
    if (id) {
      await fetchBookingDetails();
    }
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'N/A';
    }
  };

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
    } catch (error) {
      return 'N/A';
    }
  };

  const nextImage = () => {
    if (farmhouse?.photoUrls && farmhouse.photoUrls.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % farmhouse.photoUrls.length);
    }
  };

  const prevImage = () => {
    if (farmhouse?.photoUrls && farmhouse.photoUrls.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + farmhouse.photoUrls.length) % farmhouse.photoUrls.length);
    }
  };

  const openMap = () => {
    if (farmhouse?.mapLink) {
      Linking.openURL(farmhouse.mapLink);
    }
  };

  const callOwner = (phone: string) => {
    if (phone && phone.trim() !== '') {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.text }]}>Booking not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.errorButton, { color: colors.buttonBackground }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler.onScroll}
        scrollEventThrottle={scrollHandler.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.buttonBackground]}
            tintColor={colors.buttonBackground}
          />
        }
      >
        <View style={[styles.statusBanner, {
          backgroundColor: booking.status === 'confirmed' ? '#10B981' :
                           booking.status === 'cancelled' ? '#EF4444' :
                           booking.status === 'completed' ? '#3B82F6' : '#F59E0B'
        }]}>
          {booking.status === 'cancelled'
            ? <AlertCircle size={20} color="white" />
            : <CheckCircle size={20} color="white" />
          }
          <Text style={styles.statusText}>
            Booking {(booking.status || 'pending').toUpperCase()}
          </Text>
        </View>

        {farmhouse && farmhouse.photoUrls && farmhouse.photoUrls.length > 0 && (
          <View style={styles.imageSection}>
            <AnimatedImage
              uri={farmhouse.photoUrls[currentImageIndex]}
              style={styles.farmhouseImage}
              resizeMode="cover"
            />
            {farmhouse.photoUrls.length > 1 && (
              <>
                <TouchableOpacity 
                  onPress={prevImage}
                  style={[styles.imageNavButton, styles.imageNavLeft, { backgroundColor: colors.cardBackground }]}
                >
                  <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={nextImage}
                  style={[styles.imageNavButton, styles.imageNavRight, { backgroundColor: colors.cardBackground }]}
                >
                  <ChevronRight size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.imageIndicators}>
                  {farmhouse.photoUrls.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.indicator,
                        idx === currentImageIndex && styles.activeIndicator
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.farmhouseName, { color: colors.text }]}>
            {farmhouse?.name || booking.farmhouseName || 'Unknown Property'}
          </Text>
          {farmhouse && (farmhouse.area || farmhouse.city || farmhouse.mapLink) && (
            <View style={[styles.locationRow, { gap: 4 }]}>
              <MapPin size={13} color={colors.placeholder} />
              <Text style={[styles.locationText, { color: colors.placeholder }]} numberOfLines={1}>
                {[farmhouse.area, farmhouse.city].filter(Boolean).join(', ') || farmhouse.mapLink}
              </Text>
            </View>
          )}
          {farmhouse?.description && (
            <Text style={[styles.description, { color: colors.text }]}>
              {farmhouse.description}
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Summary</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Booking ID</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              #{booking.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Booked On</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatTimestamp(booking.createdAt)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Guest Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {booking.userName || 'Guest'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Number of Guests</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {Number(booking.guests) || 0} guests
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Booking Type</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {booking.bookingType === 'dayuse' ? 'Day Use' : 'Overnight Stay'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color={colors.buttonBackground} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Stay Duration</Text>
          </View>

          <View style={[styles.dateCard, { backgroundColor: colors.background }]}>
            <View style={styles.dateSection}>
              <View style={[styles.dateBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.dateBadgeText}>CHECK-IN</Text>
              </View>
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(booking.checkInDate)}</Text>
              <View style={styles.timeRow}>
                <Clock size={14} color={colors.placeholder} />
                <Text style={[styles.timeText, { color: colors.placeholder }]}>2:00 PM onwards</Text>
              </View>
            </View>

            <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />

            <View style={styles.dateSection}>
              <View style={[styles.dateBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.dateBadgeText}>CHECK-OUT</Text>
              </View>
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(booking.checkOutDate)}</Text>
              <View style={styles.timeRow}>
                <Clock size={14} color={colors.placeholder} />
                <Text style={[styles.timeText, { color: colors.placeholder }]}>11:00 AM</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: '#3B82F6' }]}>
            <AlertCircle size={16} color="#3B82F6" />
            <Text style={[styles.infoBoxText, { color: colors.text }]}>
              Please coordinate with the property owner for exact timings
            </Text>
          </View>
        </View>

        {farmhouse && (
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Users size={24} color={colors.buttonBackground} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {farmhouse.capacity || '0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.placeholder }]}>Max Guests</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Home size={24} color={colors.buttonBackground} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {farmhouse.bedrooms || '0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.placeholder }]}>Bedrooms</Text>
            </View>

          </View>

          {/* Where you'll be */}
          <View style={[styles.locationSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Where you'll be</Text>
            <LocationMapView
              location={[farmhouse.area, farmhouse.city].filter(Boolean).join(', ') || 'Location'}
              mapLink={farmhouse.mapLink}
              height={170}
            />
          </View>

          {farmhouse.amenities && Object.keys(farmhouse.amenities).length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { color: colors.text }]}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {(() => {
                  const a = farmhouse.amenities as any;
                  const items: Array<{ label: string; icon?: any; color?: string }> = [];
                  if (a.wifi) items.push({ label: 'WiFi' });
                  if (a.ac) items.push({ label: 'AC' });
                  if (a.parking) items.push({ label: 'Parking' });
                  if (a.kitchen) items.push({ label: 'Kitchen' });
                  if (a.tv > 0 || a.tv === true) items.push({ label: 'TV' });
                  if (a.geyser > 0 || a.geyser === true) items.push({ label: 'Geyser' });
                  if (a.pool) items.push({ label: 'Swimming Pool' });
                  if (a.bonfire > 0 || a.bonfire === true) items.push({ label: 'Bonfire' });
                  if (a.bbq) items.push({ label: 'BBQ / Grill' });
                  if (a.outdoorSeating) items.push({ label: 'Outdoor Seating' });
                  if (a.hotTub) items.push({ label: 'Hot Tub' });
                  if (a.djMusicSystem) items.push({ label: 'DJ / Music System' });
                  if (a.projector) items.push({ label: 'Projector' });
                  if (a.restaurant) items.push({ label: 'Restaurant' });
                  if (a.foodPrepOnDemand) items.push({ label: 'Food on Demand' });
                  if (a.decorService) items.push({ label: 'Decor Service' });
                  if (a.chess > 0 || a.chess === true) items.push({ label: 'Chess' });
                  if (a.carroms > 0 || a.carroms === true) items.push({ label: 'Carom Board' });
                  if (a.volleyball > 0 || a.volleyball === true) items.push({ label: 'Volleyball' });
                  if (a.badminton) items.push({ label: 'Badminton' });
                  if (a.tableTennis) items.push({ label: 'Table Tennis' });
                  if (a.cricket) items.push({ label: 'Cricket' });
                  return items.map((item, i) => (
                    <View key={i} style={[styles.amenityChip, { backgroundColor: colors.background }]}>
                      <Text style={[styles.amenityText, { color: colors.text }]}>{item.label}</Text>
                    </View>
                  ));
                })()}
              </View>
              {(() => {
                const a = farmhouse.amenities as any;
                const extra = a.additionalAmenities || a.customAmenities || '';
                return extra.trim() ? (
                  <Text style={[styles.customAmenities, { color: colors.placeholder }]}>{extra}</Text>
                ) : null;
              })()}
            </>
          )}
        </View>
        )}

        {/* Support Contact */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Need Help?</Text>
          <Text style={[styles.contactNote, { color: colors.placeholder }]}>
            For any queries related to your booking, reach out to us:
          </Text>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.background }]}
            onPress={() => Linking.openURL('tel:+918280353535')}
          >
            <Phone size={20} color={colors.buttonBackground} />
            <Text style={[styles.contactText, { color: colors.text }]}>+91 82803 53535</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.background }]}
            onPress={() => Linking.openURL('mailto:rustiquebyranareddy@gmail.com')}
          >
            <Mail size={20} color={colors.buttonBackground} />
            <Text style={[styles.contactText, { color: colors.text }]}>rustiquebyranareddy@gmail.com</Text>
          </TouchableOpacity>
        </View>

        {farmhouse?.rules && Object.values(farmhouse.rules).some(v => v) && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Shield size={20} color={colors.buttonBackground} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Property Rules</Text>
            </View>

            {farmhouse.rules.petsNotAllowed && (
              <View style={styles.ruleItem}>
                <Text style={styles.ruleBullet}>•</Text>
                <Text style={[styles.ruleText, { color: colors.text }]}>Pets not allowed</Text>
              </View>
            )}

            {farmhouse.rules.customRules && (
              <View style={styles.ruleItem}>
                <Text style={styles.ruleBullet}>•</Text>
                <Text style={[styles.ruleText, { color: colors.text }]}>
                  {farmhouse.rules.customRules}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Summary</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Base Price</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              ₹{Number(booking.originalPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {Number(booking.discountApplied || 0) > 0 && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.discountLabel, { color: '#10B981' }]}>
                  {`Discount${booking.couponCode ? ` (${booking.couponCode})` : ''}`}
                </Text>
                <Text style={[styles.discountValue, { color: '#10B981' }]}>
                  -₹{Number(booking.discountApplied).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
            <Text style={[styles.totalValue, { color: colors.buttonBackground }]}>
              ₹{Number(booking.totalPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {booking.transactionId && (
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Transaction ID</Text>
              <Text style={[styles.transactionId, { color: colors.text }]} numberOfLines={1}>
                {booking.transactionId}
              </Text>
            </View>
          )}

          <View style={[styles.paidBadge, { backgroundColor: booking.paymentStatus === 'paid' ? '#10B981' : '#F59E0B' }]}>
            <CheckCircle size={16} color="white" />
            <Text style={styles.paidText}>
              Payment {(booking.paymentStatus || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Show refund details for cancelled bookings */}
        {booking.status === 'cancelled' && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.cancelledHeader, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}>
              <AlertCircle size={20} color="#EF4444" />
              <Text style={[styles.cancelledTitle, { color: '#EF4444' }]}>Booking Cancelled</Text>
            </View>

            {booking.cancelledAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Cancelled On</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTimestamp(booking.cancelledAt)}
                </Text>
              </View>
            )}

            {booking.cancellationReason && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Reason</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {booking.cancellationReason}
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Refund Information</Text>

            {booking.refundAmount !== undefined && booking.refundAmount > 0 ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Amount</Text>
                  <Text style={[styles.refundAmount, { color: '#10B981' }]}>
                    ₹{Number(booking.refundAmount).toLocaleString('en-IN')}
                  </Text>
                </View>

                {booking.refundPercentage !== undefined && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Percentage</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {booking.refundPercentage}%
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Status</Text>
                  <View style={[styles.refundStatusBadge, {
                    backgroundColor: booking.refundStatus === 'completed' ? '#10B981' :
                                   booking.refundStatus === 'processing' ? '#F59E0B' :
                                   booking.refundStatus === 'failed' ? '#EF4444' : '#6B7280'
                  }]}>
                    <Text style={styles.refundStatusText}>
                      {(booking.refundStatus || 'Pending').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {booking.refundDate && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund Date</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatTimestamp(booking.refundDate)}
                    </Text>
                  </View>
                )}

                {booking.transactionId && (
                  <View style={[styles.infoRow, { marginTop: 12 }]}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Payment ID</Text>
                    <Text style={[styles.transactionId, { color: colors.text }]} numberOfLines={1}>
                      {booking.transactionId}
                    </Text>
                  </View>
                )}

                {booking.razorpayRefundId && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Refund ID</Text>
                    <Text style={[styles.transactionId, { color: colors.text }]} numberOfLines={1}>
                      {booking.razorpayRefundId}
                    </Text>
                  </View>
                )}

                <View style={[styles.refundNote, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <AlertCircle size={16} color="#3B82F6" />
                  <Text style={[styles.refundNoteText, { color: colors.text }]}>
                    {booking.refundStatus === 'completed'
                      ? 'Refund has been processed to your original payment method.'
                      : booking.refundStatus === 'processing'
                      ? 'Refund is being processed and will reflect in 5-7 business days.'
                      : booking.refundStatus === 'failed'
                      ? 'Refund processing failed. Please contact support with your transaction ID.'
                      : 'Refund will be processed within 24 hours to your original payment method.'
                    }
                  </Text>
                </View>

                {booking.refundNote && (
                  <Text style={[styles.supportText, { color: '#F59E0B', marginBottom: 4 }]}>
                    Note: {booking.refundNote}
                  </Text>
                )}

                <Text style={[styles.supportText, { color: colors.placeholder }]}>
                  For refund queries, contact support with your Booking ID and Refund ID
                </Text>
              </>
            ) : (
              <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={[styles.infoBoxText, { color: colors.text }]}>
                  No refund applicable as per cancellation policy (cancelled after check-in time)
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  errorText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  errorButton: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  statusBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12
  },
  statusText: { color: 'white', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  imageSection: { position: 'relative' },
  farmhouseImage: { width: width, height: 280 },
  imageNavButton: { 
    position: 'absolute', 
    top: '50%', 
    transform: [{ translateY: -20 }],
    padding: 8, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  imageNavLeft: { left: 16 },
  imageNavRight: { right: 16 },
  imageIndicators: { 
    position: 'absolute', 
    bottom: 16, 
    left: 0, 
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'center',
    gap: 6
  },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeIndicator: { width: 24, backgroundColor: 'white' },
  card: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    padding: 20, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  farmhouseName: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  locationText: { fontSize: 13, flex: 1 },
  description: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  dateCard: { padding: 16, borderRadius: 10, marginBottom: 12 },
  dateSection: { paddingVertical: 8 },
  dateBadge: { 
    alignSelf: 'flex-start',
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 6,
    marginBottom: 8
  },
  dateBadgeText: { color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 13 },
  dateDivider: { height: 1, marginVertical: 12 },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 8,
    padding: 12, 
    borderRadius: 8,
    borderWidth: 1
  },
  infoBoxText: { fontSize: 13, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center',
    gap: 6
  },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  statLink: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  subsectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8
  },
  amenityText: { fontSize: 13, fontWeight: '500' },
  customAmenities: { fontSize: 13, marginTop: 12, lineHeight: 20 },
  contactNote: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12
  },
  contactText: { fontSize: 16, fontWeight: '600' },
  transactionId: { fontSize: 12, fontWeight: '500', flex: 1, textAlign: 'right', fontFamily: 'monospace' },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  cancelledTitle: { fontSize: 16, fontWeight: '700' },
  refundAmount: { fontSize: 16, fontWeight: 'bold' },
  refundStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6
  },
  refundStatusText: { color: 'white', fontSize: 12, fontWeight: '700' },
  refundNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12
  },
  refundNoteText: { fontSize: 13, flex: 1, lineHeight: 18 },
  supportText: { fontSize: 12, marginTop: 12, fontStyle: 'italic', textAlign: 'center' },
  ruleItem: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ruleBullet: { color: '#EF4444', fontSize: 18, fontWeight: 'bold' },
  ruleText: { fontSize: 14, flex: 1, lineHeight: 20 },
  divider: { height: 1, marginVertical: 12 },
  discountLabel: { fontSize: 14, fontWeight: '600' },
  discountValue: { fontSize: 14, fontWeight: 'bold' },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  paidBadge: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12, 
    borderRadius: 8,
    marginTop: 12
  },
  paidText: { color: 'white', fontSize: 14, fontWeight: '700' },

  locationSection: { marginTop: 20, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth },
});