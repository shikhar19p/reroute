import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Image, ActivityIndicator, TextInput, RefreshControl, Dimensions, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Tag, X, CheckCircle, Square } from 'lucide-react-native';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { useToast } from '../../components/Toast';
import { useDialog } from '../../components/CustomDialog';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useCoupons, useGlobalData } from '../../GlobalDataContext';
import { createBooking, cleanupPendingBooking } from '../../services/bookingService';
import { parseError } from '../../utils/errorHandler';
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  // Ref mirrors state so the unmount cleanup always has the latest bookingId
  // (state closures can be stale at unmount time, refs are always current)
  const currentBookingIdRef = React.useRef<string | null>(null);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cleanupDoneRef = React.useRef<boolean>(false);

  useEffect(() => {
    fetchUserProfile();
    fetchFarmhouseDetails();
  }, [user, farmhouseId]);

  // Cleanup on unmount only — empty deps so this NEVER re-runs mid-flow.
  // Do NOT add currentBookingId to deps: React would fire the cleanup on every
  // state change (when setCurrentBookingId is called), which deletes the booking
  // before the payment flow even starts.
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        title: 'Sign in required',
        message: 'Sign in to continue with your booking.',
        type: 'error'
      });
      return;
    }

    if (!userProfile.phone || userProfile.phone === 'Not provided') {
      showDialog({
        title: 'Phone number missing',
        message: 'Add a phone number in your profile to continue.',
        type: 'warning'
      });
      return;
    }

    // Validate price is greater than 0
    if (finalPrice <= 0) {
      showDialog({
        title: 'Invalid amount',
        message: 'Booking amount must be greater than ₹0.',
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
        title: 'Booking confirmed',
        message: `₹${finalPrice} paid. You're all set for ${farmhouseDetails?.name || farmhouseName}.`,
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
          title: 'Payment status unclear',
          message: `We couldn't confirm your payment. Check your bookings in a few minutes.${bookingId ? ` Ref: ${bookingId.slice(-8)}` : ''}`,
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

      console.error('❌ Booking/Payment error:', error);

      const { title: errTitle, message: errMessage, isCancellation } = parseError(error);

      if (isCancellation || errMessage.toLowerCase().includes('cancel')) {
        showDialog({
          title: 'Payment cancelled',
          message: 'You can try booking again.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default', onPress: () => {} }]
        });
      } else if (errMessage.includes('verification failed') || errMessage.includes('Verification Failed')) {
        showDialog({
          title: 'Verification pending',
          message: 'Payment received but not verified. Check your bookings or contact support.',
          type: 'warning',
          buttons: [{ text: 'Check Bookings', style: 'default', onPress: () => navigation.navigate('Bookings') }]
        });
      } else if (errMessage.includes('not available')) {
        showDialog({
          title: 'Dates unavailable',
          message: 'These dates are no longer available.',
          type: 'error',
          buttons: [{ text: 'Choose New Dates', style: 'default', onPress: () => navigation.goBack() }]
        });
      } else {
        showDialog({
          title: errTitle,
          message: errMessage,
          type: 'error',
          buttons: [{ text: 'OK', style: 'default', onPress: () => {} }]
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

        {/* Terms & Conditions */}
        <View style={[styles.termsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)} activeOpacity={0.7}>
            {agreedToTerms
              ? <CheckCircle size={22} color={colors.buttonBackground} />
              : <Square size={22} color="#9CA3AF" />
            }
            <Text style={[styles.termsText, { color: colors.text }]}>I agree to the </Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={[styles.termsLink, { color: colors.buttonBackground }]}>Terms & Conditions</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* User T&C Modal */}
        <Modal visible={showTermsModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Terms & Conditions</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                <Text style={[styles.modalSubtitle, { color: colors.text }]}>For Guests / Customers</Text>
                <Text style={[styles.modalBody, { color: colors.text }]}>{`1. Eligibility
   • Users must be 18 years or older to make a booking.
   • Valid government ID proof is mandatory at check-in.

2. Booking & Payments
   • All bookings must be made through the Reroute platform only.
   • Booking is confirmed only after successful payment.
   • Prices may vary based on availability, demand, and dates.

3. Cancellation & Refund Policy
   • Cancel more than 24 hours before check-in: 100% refund.
   • Cancel within 24 hours of check-in: 50% refund.
   • No refund for no-shows or cancellations after check-in time.

4. Check-in & Check-out
   • Users must strictly follow the check-in and check-out timings.
   • Early check-in or late check-out is subject to availability and may incur extra charges.

5. Code of Conduct
   • Strictly no illegal activities, drugs, or prohibited substances.
   • Users must adhere to local noise regulations and property rules.
   • Guests must respect the property and surroundings.

6. Damages & Responsibility
   • Any damage caused to the property will be fully charged to the user.
   • Reroute does not take any responsibility for damages, losses, or issues during the stay.

7. Safety & Risk
   • All amenities (pool, bonfire, etc.) are used at the user's own risk.
   • Reroute is not liable for any injuries, accidents, or mishaps.

GENERAL TERMS

1. No Mediation Policy
   • Reroute acts only as a platform connecting users and farmhouse owners.
   • Reroute will NOT act as a mediator in any disputes.

2. No Liability
   • Reroute shall not be held responsible for property damages, personal injuries, theft, loss, accidents, or disputes.

3. Account Suspension
   • Reroute reserves the right to suspend or terminate accounts for violation of terms.

4. Modification of Terms
   • Terms may be updated anytime. Continued usage implies acceptance.`}</Text>
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.buttonBackground }]}
                onPress={() => { setShowTermsModal(false); setAgreedToTerms(true); }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>I Accept & Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
            backgroundColor: (loading || profileLoading || !agreedToTerms) ? colors.border : colors.buttonBackground
          }]}
          onPress={() => {
            if (!agreedToTerms) {
              setShowTermsModal(true);
              return;
            }
            handleConfirmBooking();
          }}
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
  termsCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  termsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  termsText: { fontSize: 14 },
  termsLink: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '88%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#6B7280' },
  modalScroll: { maxHeight: 440, marginBottom: 16 },
  modalBody: { fontSize: 13, lineHeight: 20 },
  modalClose: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});