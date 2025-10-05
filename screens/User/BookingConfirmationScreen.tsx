import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Image, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Tag, X, CheckCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { createBooking } from '../../services/bookingService';

type RootStackParamList = {
  BookingConfirmation: {
    farmhouseId: string;
    farmhouseName: string;
    farmhouseImage: string;
    location: string;
    startDate: string;
    endDate: string;
    guestCount: number;
    totalPrice: number;
    numberOfNights: number;
    bookingType: string;
    capacity: number;
    rooms: number;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmation'>;

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  used: boolean;
}

const AVAILABLE_COUPONS: Coupon[] = [
  { id: '1', code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, valid_from: '2024-01-01', valid_until: '2025-12-31', used: false },
  { id: '2', code: 'FLAT500', discount_type: 'fixed_amount', discount_value: 500, valid_from: '2024-01-01', valid_until: '2025-12-31', used: false },
];

export default function BookingConfirmationScreen({ route, navigation }: Props) {
  const {
    farmhouseId, farmhouseName, farmhouseImage, location,
    startDate, endDate, guestCount, totalPrice, numberOfNights,
    bookingType, capacity, rooms
  } = route.params;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  const userProfile = {
    name: user?.displayName || 'Guest User',
    email: user?.email || 'guest@example.com',
    phone: '+91 98765 43210',
  };

  const validateCoupon = (code: string) => {
    const coupon = AVAILABLE_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return { valid: false, error: 'Invalid coupon code' };
    if (coupon.used) return { valid: false, error: 'Coupon already used' };
    
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);
    if (now < validFrom || now > validUntil) return { valid: false, error: 'Coupon expired' };
    
    return { valid: true, coupon };
  };

  const applyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    const validation = validateCoupon(couponCode.trim());
    if (!validation.valid) {
      setCouponError(validation.error || 'Invalid coupon');
      return;
    }
    setAppliedCoupon(validation.coupon);
    Alert.alert('Success', 'Coupon applied successfully!');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.floor((totalPrice * appliedCoupon.discount_value) / 100);
    }
    return Math.min(appliedCoupon.discount_value, totalPrice);
  };

  const calculateFinalPrice = () => totalPrice - calculateDiscount();

  const handleProceedToPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    try {
      setLoading(true);
      const bookingId = await createBooking({
        farmhouseId,
        farmhouseName,
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || '',
        userPhone: userProfile.phone,
        checkInDate: startDate,
        checkOutDate: endDate,
        guests: guestCount,
        totalPrice: calculateFinalPrice(),
        bookingType: bookingType === 'day-use' ? 'dayuse' : 'overnight',
        status: 'pending',
        paymentStatus: 'pending',
      });

      setLoading(false);
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Booking ID: ${bookingId}\n\nPayment gateway will be integrated soon.`,
        [{ text: 'View Bookings', onPress: () => navigation.navigate('UserHome' as never, { screen: 'Bookings' } as never) }]
      );
    } catch (error) {
      setLoading(false);
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Booking Confirmation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Image source={{ uri: farmhouseImage }} style={styles.farmhouseImage} />
          <View style={styles.farmhouseInfo}>
            <Text style={[styles.farmhouseName, { color: colors.text }]}>{farmhouseName}</Text>
            <Text style={[styles.farmhouseLocation, { color: colors.placeholder }]}>{location}</Text>
            <Text style={[styles.detailText, { color: colors.placeholder }]}>
              {capacity} guests • {rooms} rooms
            </Text>
          </View>
        </View>

        <View style={[styles.billingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Billing Summary</Text>
          
          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Booking Type:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {bookingType === 'day-use' ? 'Day Use' : `Overnight (${numberOfNights} nights)`}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Check-in:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {formatDate(startDate)} {bookingType === 'day-use' ? '' : '(2:00 PM)'}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Check-out:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {formatDate(endDate)} {bookingType === 'day-use' ? '(6:00 PM)' : '(12:00 PM)'}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Guests:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>{guestCount}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.billingRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Subtotal:</Text>
            <Text style={[styles.totalValue, { color: colors.buttonBackground }]}>₹{totalPrice}</Text>
          </View>

          {appliedCoupon && (
            <View style={styles.billingRow}>
              <Text style={[styles.discountLabel, { color: '#10B981' }]}>
                Discount ({appliedCoupon.code}):
              </Text>
              <Text style={[styles.discountValue, { color: '#10B981' }]}>
                -₹{calculateDiscount()}
              </Text>
            </View>
          )}

          {appliedCoupon && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.billingRow}>
                <Text style={[styles.finalTotalLabel, { color: colors.text }]}>Total Amount:</Text>
                <Text style={[styles.finalTotalValue, { color: colors.buttonBackground }]}>₹{calculateFinalPrice()}</Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.couponCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.couponHeader}>
            <Tag size={20} color={colors.buttonBackground} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Apply Coupon</Text>
          </View>
          
          {!appliedCoupon ? (
            <>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={[styles.couponInput, { 
                    backgroundColor: colors.background, 
                    color: colors.text,
                    borderColor: couponError ? '#EF4444' : colors.border 
                  }]}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.placeholder}
                  value={couponCode}
                  onChangeText={(text) => {
                    setCouponCode(text.toUpperCase());
                    setCouponError('');
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={applyCoupon}
                >
                  <Text style={[styles.applyButtonText, { color: colors.buttonText }]}>Apply</Text>
                </TouchableOpacity>
              </View>
              {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
            </>
          ) : (
            <View style={[styles.appliedCouponBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)', borderColor: '#10B981' }]}>
              <View style={styles.appliedCouponInfo}>
                <CheckCircle size={20} color="#10B981" />
                <View style={styles.appliedCouponText}>
                  <Text style={[styles.appliedCouponCode, { color: colors.text }]}>{appliedCoupon.code}</Text>
                  <Text style={[styles.appliedCouponDiscount, { color: '#10B981' }]}>
                    {appliedCoupon.discount_type === 'percentage' 
                      ? `${appliedCoupon.discount_value}% OFF` 
                      : `₹${appliedCoupon.discount_value} OFF`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponButton}>
                <X size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Contact Information</Text>
          <Text style={[styles.contactSubtext, { color: colors.placeholder }]}>
            The farmhouse owner will receive these details:
          </Text>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <User size={20} color={colors.buttonBackground} />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Full Name</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.name}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <Phone size={20} color={colors.buttonBackground} />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Mobile Number</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.phone}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <Mail size={20} color={colors.buttonBackground} />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Email Address</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.email}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomLabel, { color: colors.placeholder }]}>Total Amount</Text>
          {appliedCoupon && (
            <Text style={[styles.bottomOriginalPrice, { color: colors.placeholder }]}>₹{totalPrice}</Text>
          )}
          <Text style={[styles.bottomPrice, { color: colors.buttonBackground }]}>
            ₹{appliedCoupon ? calculateFinalPrice() : totalPrice}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.proceedButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleProceedToPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.proceedButtonText, { color: colors.buttonText }]}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  summaryCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  farmhouseImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  farmhouseInfo: { gap: 4 },
  farmhouseName: { fontSize: 18, fontWeight: '600' },
  farmhouseLocation: { fontSize: 14 },
  detailText: { fontSize: 13 },
  billingCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billingLabel: { fontSize: 14 },
  billingValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  discountLabel: { fontSize: 14, fontWeight: '600' },
  discountValue: { fontSize: 16, fontWeight: 'bold' },
  finalTotalLabel: { fontSize: 18, fontWeight: 'bold' },
  finalTotalValue: { fontSize: 22, fontWeight: 'bold' },
  couponCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  couponInputRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  couponInput: { flex: 1, height: 48, borderRadius: 8, paddingHorizontal: 12, fontSize: 15, fontWeight: '600', borderWidth: 1 },
  applyButton: { paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  applyButtonText: { fontSize: 15, fontWeight: '600' },
  couponError: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  appliedCouponBox: { padding: 14, borderRadius: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appliedCouponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appliedCouponText: { gap: 2 },
  appliedCouponCode: { fontSize: 15, fontWeight: '700' },
  appliedCouponDiscount: { fontSize: 13, fontWeight: '600' },
  removeCouponButton: { padding: 4 },
  contactCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  contactSubtext: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  contactIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactTextContainer: { flex: 1 },
  contactLabel: { fontSize: 12, marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  bottomLabel: { fontSize: 12, marginBottom: 4 },
  bottomOriginalPrice: { fontSize: 14, textDecorationLine: 'line-through', marginBottom: 2 },
  bottomPrice: { fontSize: 24, fontWeight: 'bold' },
  proceedButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  proceedButtonText: { fontSize: 16, fontWeight: '600' },
});