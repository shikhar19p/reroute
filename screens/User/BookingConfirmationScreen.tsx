import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Image, ActivityIndicator, TextInput, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Tag, X, CheckCircle } from 'lucide-react-native';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { useToast } from '../../components/Toast';
import { useDialog } from '../../components/CustomDialog';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useCoupons, useGlobalData } from '../../GlobalDataContext';
import { createBooking, cleanupPendingBooking } from '../../services/bookingService';
import { completePaymentFlow, savePaymentRecord } from '../../services/paymentService';

const { width } = Dimensions.get('window');

export default function BookingConfirmationScreen({ route, navigation }: any) {
  const {
    farmhouseId, farmhouseName, farmhouseImage, location,
    startDate, endDate, guestCount, totalPrice, numberOfNights,
    bookingType
  } = route.params;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const scrollHandler = useScrollHandler();
  const { getFarmhouseById } = useGlobalData();
  const { data: availableCoupons, loading: couponsLoading, refresh: refreshCoupons } = useCoupons();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [farmhouseDetails, setFarmhouseDetails] = useState<any>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  // Ref mirrors state so the unmount cleanup always has the latest bookingId
  // (state closures can be stale at unmount time, refs are always current)
  const currentBookingIdRef = React.useRef<string | null>(null);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cleanupDoneRef = React.useRef<boolean>(false);

  useEffect(() => {
    fetchUserProfile();
    fetchFarmhouseDetails();
  }, [user, farmhouseId]);

  // Cleanup on unmount only (not on every currentBookingId change)
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      // Use ref (not state) — state closures can be stale at unmount time
      if (currentBookingIdRef.current && !cleanupDoneRef.current) {
        console.log('🧹 Component unmounting, cleaning up pending booking...');
        cleanupDoneRef.current = true;
        const bId = currentBookingIdRef.current;
        currentBookingIdRef.current = null;
        cleanupPendingBooking(bId).catch(error => {
          console.error('Failed to cleanup on unmount:', error);
        });
      }
    };
  }, [currentBookingId]);

  const fetchUserProfile = async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const data = userDoc.data();
      setUserProfile({
        name: data?.name || user.displayName || 'Guest User',
        email: user.email || 'guest@example.com',
        phone: data?.phone || user.phoneNumber || 'Not provided',
      });
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchFarmhouseDetails = () => {
    try {
      const farmhouse = getFarmhouseById(farmhouseId);
      if (farmhouse) {
        setFarmhouseDetails(farmhouse);
      }
    } catch (error) {
      console.error("Failed to fetch farmhouse details:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserProfile(),
      refreshCoupons(),
    ]);
    fetchFarmhouseDetails();
    setRefreshing(false);
  };

  const validateCoupon = (code: string) => {
    const coupon = availableCoupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return { valid: false, error: 'Invalid coupon code' };
    if (coupon.current_uses >= coupon.max_uses) return { valid: false, error: 'This coupon has reached its usage limit' };
    if (totalPrice < coupon.min_booking_amount) return { valid: false, error: `Requires a minimum spend of ₹${coupon.min_booking_amount}` };
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
    showToast('Coupon applied successfully!', 'success');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'fixed_amount') {
      return Math.min(appliedCoupon.discount_value, totalPrice);
    }
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.floor((totalPrice * appliedCoupon.discount_value) / 100);
    }
    return 0;
  };

  const discountAmount = calculateDiscount();
  const finalPrice = totalPrice - discountAmount;

  const handleConfirmBooking = async () => {
    if (!user || !userProfile) {
      showDialog({
        title: 'Error',
        message: 'Please login to continue',
        type: 'error'
      });
      return;
    }

    if (!userProfile.phone || userProfile.phone === 'Not provided') {
      showDialog({
        title: 'Phone Number Required',
        message: 'Please add a phone number to your profile before booking.',
        type: 'warning'
      });
      return;
    }

    // Validate price is greater than 0
    if (finalPrice <= 0) {
      showDialog({
        title: 'Invalid Price',
        message: 'Booking amount must be greater than ₹0. Please check the pricing details.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setLoadingMessage('Creating booking...');
    cleanupDoneRef.current = false;
    let bookingId: string | null = null;
    let paymentId: string | null = null;

    try {
      // Step 1: Create booking with pending status
      const bookingData = {
        farmhouseId,
        farmhouseName: farmhouseDetails?.name || farmhouseName,
        userId: user.uid,
        userEmail: user.email || '',
        userName: userProfile.name,
        userPhone: userProfile.phone,
        checkInDate: startDate,
        checkOutDate: endDate,
        guests: guestCount,
        totalPrice: finalPrice,
        originalPrice: totalPrice,
        discountApplied: discountAmount,
        couponCode: appliedCoupon?.code || null,
        bookingType: bookingType === 'day-use' ? 'dayuse' : 'overnight' as 'dayuse' | 'overnight',
        status: 'pending' as 'pending',
        paymentStatus: 'pending' as 'pending',
      };

      bookingId = await createBooking(bookingData);
      console.log('✅ Booking created with ID:', bookingId);
      setCurrentBookingId(bookingId);
      currentBookingIdRef.current = bookingId;

      // Set up automatic cleanup after 2 minutes
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('⏰ 2 minutes elapsed, cleaning up pending booking...');
        cleanupPendingBooking(bookingId).catch(error => {
          console.error('Failed to auto-cleanup:', error);
        });
      }, 2 * 60 * 1000); // 2 minutes

      // Step 2: Process payment via Razorpay
      setLoadingMessage('Preparing payment...');

      const paymentResponse = await completePaymentFlow(
        finalPrice, // amount in rupees
        'INR',
        bookingId,
        user.uid,
        userProfile.name,
        userProfile.email,
        userProfile.phone,
        `Booking for ${farmhouseDetails?.name || farmhouseName}`
      );

      console.log('✅ Payment successful:', paymentResponse);

      // Step 3: Save payment record to Firestore
      paymentId = await savePaymentRecord(
        bookingId,
        user.uid,
        finalPrice * 100, // amount in paise
        'INR',
        paymentResponse
      );

      // Step 4: Update coupon usage and user stats
      if (appliedCoupon) {
        const couponRef = doc(db, 'coupons', appliedCoupon.id);
        await updateDoc(couponRef, {
          current_uses: increment(1)
        });
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        totalBookings: increment(1)
      });

      // Clear cleanup timeout and bookingId since payment succeeded
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      currentBookingIdRef.current = null;
      setCurrentBookingId(null);

      setLoading(false);
      setLoadingMessage('');
      showDialog({
        title: 'Booking Confirmed! 🎉',
        message: `Your payment of ₹${finalPrice} was successful. Your booking for ${farmhouseDetails?.name || farmhouseName} is confirmed.`,
        type: 'success',
        buttons: [{
          text: 'View Details',
          style: 'default',
          onPress: () => navigation.replace('BookingDetails', {
            booking: {
              ...bookingData,
              id: bookingId,
              status: 'confirmed',
              paymentStatus: 'paid',
              transactionId: paymentResponse.razorpay_payment_id,
              createdAt: new Date().toISOString()
            }
          })
        }]
      });
    } catch (error: any) {
      setLoading(false);
      setLoadingMessage('');

      // Post payment parsing error: payment MAY have succeeded but response couldn't be parsed.
      // DO NOT clean up the booking — the money may have been charged.
      const errorDesc = error?.description || error?.message || '';
      const isPostPaymentParseError =
        (error as any)?.isPostPaymentParseError === true ||
        errorDesc.includes('Post payment parsing error') ||
        (error?.code === 0 && errorDesc.toLowerCase().includes('parsing'));

      if (isPostPaymentParseError) {
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }
        currentBookingIdRef.current = null;
        setCurrentBookingId(null);
        cleanupDoneRef.current = true;
        showDialog({
          title: 'Payment Status Unclear',
          message: `Your payment may have been processed but we couldn't confirm it. Please check your bookings in a few minutes. If charged, your booking will appear there. Reference: ${bookingId || ''}`,
          type: 'warning',
          buttons: [{ text: 'Check Bookings', style: 'default', onPress: () => navigation.navigate('Bookings') }],
        });
        return;
      }

      // Cleanup the pending booking since payment genuinely failed/cancelled
      if (bookingId && !cleanupDoneRef.current) {
        cleanupDoneRef.current = true;
        currentBookingIdRef.current = null;
        console.log('🧹 Payment failed/cancelled, cleaning up pending booking...');
        cleanupPendingBooking(bookingId).catch(err => {
          console.error('Failed to cleanup after error:', err);
        });

        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }
        setCurrentBookingId(null);
      }

      // Parse error message from various formats
      let errorMessage = 'Failed to create booking';
      let isCancellation = false;
      let isPaymentError = false;

      // Handle Razorpay payment errors (comes as JSON string)
      if (error?.description) {
        try {
          const parsedError = typeof error.description === 'string'
            ? JSON.parse(error.description)
            : error.description;

          if (parsedError?.error) {
            const razorpayError = parsedError.error;
            isPaymentError = true;

            // Map Razorpay error codes to user-friendly messages
            switch (razorpayError.code) {
              case 'BAD_REQUEST_ERROR':
                if (razorpayError.reason === 'payment_error' || razorpayError.step === 'payment_authentication') {
                  isCancellation = true;
                  errorMessage = 'Payment was cancelled or failed during authentication.';
                } else if (razorpayError.description && razorpayError.description !== 'undefined') {
                  errorMessage = razorpayError.description;
                } else {
                  errorMessage = 'Payment could not be processed. Please try again.';
                }
                break;
              case 'GATEWAY_ERROR':
                errorMessage = 'Payment gateway error. Please try again in a few moments.';
                break;
              case 'SERVER_ERROR':
                errorMessage = 'Payment server error. Please try again later.';
                break;
              default:
                if (razorpayError.description && razorpayError.description !== 'undefined') {
                  errorMessage = razorpayError.description;
                } else {
                  errorMessage = 'Payment failed. Please try again.';
                }
            }
          }
        } catch (parseErr) {
          // If parsing fails, treat as payment error
          errorMessage = 'Payment could not be completed. Please try again.';
          isPaymentError = true;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
          isCancellation = true;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error('❌ Booking/Payment error:', error);

      // Handle different error scenarios
      if (isCancellation || errorMessage.toLowerCase().includes('cancel')) {
        // Payment cancelled by user
        showDialog({
          title: 'Payment Cancelled',
          message: 'Your payment was cancelled. The dates have been unblocked and you can try booking again.',
          type: 'warning',
          buttons: [{
            text: 'OK',
            style: 'default',
            onPress: () => {}
          }]
        });
      } else if (errorMessage.includes('Payment verification failed')) {
        // Payment might have succeeded but verification failed
        showDialog({
          title: 'Payment Verification Issue',
          message: 'Your payment may have been processed, but we need to verify it. Please check your bookings or contact support.',
          type: 'warning',
          buttons: [{
            text: 'Check Bookings',
            style: 'default',
            onPress: () => navigation.navigate('Bookings')
          }]
        });
      } else if (errorMessage.includes('Validation failed')) {
        showDialog({
          title: 'Booking Error',
          message: errorMessage.replace('Validation failed: ', ''),
          type: 'error'
        });
      } else if (errorMessage.includes('not available')) {
        showDialog({
          title: 'Dates Unavailable',
          message: 'The selected dates are no longer available. Please choose different dates.',
          type: 'error',
          buttons: [{
            text: 'Choose New Dates',
            style: 'default',
            onPress: () => navigation.goBack()
          }]
        });
      } else if (isPaymentError) {
        showDialog({
          title: 'Payment Failed',
          message: errorMessage,
          type: 'error',
          buttons: [{
            text: 'Try Again',
            style: 'default',
            onPress: () => {}
          }]
        });
      } else {
        showDialog({
          title: 'Booking Failed',
          message: errorMessage,
          type: 'error'
        });
      }
    }
  };

  const displayImage = farmhouseDetails?.photos?.[0] || farmhouseImage;
  const displayName = farmhouseDetails?.name || farmhouseName;
  const displayLocation = farmhouseDetails?.location || location;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Booking Confirmation</Text>
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
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Image source={{ uri: displayImage }} style={styles.farmhouseImage} resizeMode="cover" />
          <View style={styles.farmhouseInfo}>
            <Text style={[styles.farmhouseName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.farmhouseLocation, { color: colors.placeholder }]}>{displayLocation}</Text>
          </View>
        </View>

        <View style={[styles.billingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Billing Summary</Text>
          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Base Price:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>₹{totalPrice}</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.billingRow}>
              <Text style={[styles.discountLabel, { color: '#10B981' }]}>
                Discount ({appliedCoupon.code}):
              </Text>
              <Text style={[styles.discountValue, { color: '#10B981' }]}>
                -₹{discountAmount}
              </Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.billingRow}>
            <Text style={[styles.finalTotalLabel, { color: colors.text }]}>Total Amount:</Text>
            <Text style={[styles.finalTotalValue, { color: colors.buttonBackground }]}>₹{finalPrice}</Text>
          </View>
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
                  disabled={couponsLoading}
                >
                  {couponsLoading ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Text style={[styles.applyButtonText, { color: colors.buttonText }]}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
              {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
            </>
          ) : (
            <View style={[styles.appliedCouponBox, { 
              backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)', 
              borderColor: '#10B981' 
            }]}>
              <View style={styles.appliedCouponInfo}>
                <CheckCircle size={20} color="#10B981" />
                <View>
                  <Text style={[styles.appliedCouponCode, { color: colors.text }]}>{appliedCoupon.code}</Text>
                  <Text style={[styles.appliedCouponSavings, { color: '#10B981' }]}>You saved ₹{discountAmount}!</Text>
                </View>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <X size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Contact Information</Text>
          {profileLoading ? (
            <ActivityIndicator color={colors.buttonBackground} />
          ) : userProfile && (
            <>
              <View style={styles.contactItem}>
                <User size={20} color={colors.buttonBackground} />
                <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.name}</Text>
              </View>
              <View style={styles.contactItem}>
                <Phone size={20} color={colors.buttonBackground} />
                <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.phone}</Text>
              </View>
              <View style={styles.contactItem}>
                <Mail size={20} color={colors.buttonBackground} />
                <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.email}</Text>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomPrice, { color: colors.buttonBackground }]}>₹{finalPrice}</Text>
          {discountAmount > 0 && (
            <Text style={[styles.bottomOriginalPrice, { color: colors.placeholder }]}>₹{totalPrice}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.proceedButton, {
            backgroundColor: (loading || profileLoading) ? colors.border : colors.buttonBackground
          }]}
          onPress={handleConfirmBooking}
          disabled={loading || profileLoading}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={colors.buttonText} size="small" />
              <Text style={[styles.proceedButtonText, { color: colors.buttonText }]}>
                {loadingMessage || 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.proceedButtonText, { color: colors.buttonText }]}>Confirm Booking</Text>
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
  billingCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billingLabel: { fontSize: 14 },
  billingValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 8 },
  discountLabel: { fontSize: 14, fontWeight: '600' },
  discountValue: { fontSize: 16, fontWeight: 'bold' },
  finalTotalLabel: { fontSize: 18, fontWeight: 'bold' },
  finalTotalValue: { fontSize: 22, fontWeight: 'bold' },
  couponCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  couponInputRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  couponInput: { flex: 1, height: 48, borderRadius: 8, paddingHorizontal: 12, fontSize: 15, fontWeight: '600', borderWidth: 1 },
  applyButton: { paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  applyButtonText: { fontSize: 15, fontWeight: '600' },
  couponError: { color: '#EF4444', fontSize: 13, marginTop: 4 },
  appliedCouponBox: { padding: 14, borderRadius: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appliedCouponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appliedCouponCode: { fontSize: 15, fontWeight: '700' },
  appliedCouponSavings: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  contactCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  contactValue: { fontSize: 15, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  bottomPrice: { fontSize: 24, fontWeight: 'bold' },
  bottomOriginalPrice: { fontSize: 14, textDecorationLine: 'line-through', marginTop: 2 },
  proceedButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  proceedButtonText: { fontSize: 16, fontWeight: '600' },
});