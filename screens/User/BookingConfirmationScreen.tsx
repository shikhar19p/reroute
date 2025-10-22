import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Image, Alert, ActivityIndicator, TextInput, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Tag, X, CheckCircle } from 'lucide-react-native';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { useCoupons, useGlobalData } from '../../GlobalDataContext';
import { createBooking } from '../../services/bookingService';
import { addBookedDatesToFarmhouse } from '../../services/farmhouseService';

const { width } = Dimensions.get('window');

export default function BookingConfirmationScreen({ route, navigation }: any) {
  const {
    farmhouseId, farmhouseName, farmhouseImage, location,
    startDate, endDate, guestCount, totalPrice, numberOfNights,
    bookingType
  } = route.params;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { getFarmhouseById } = useGlobalData();
  const { data: availableCoupons, loading: couponsLoading, refresh: refreshCoupons } = useCoupons();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [farmhouseDetails, setFarmhouseDetails] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchFarmhouseDetails();
  }, [user, farmhouseId]);

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
    Alert.alert('Success', 'Coupon applied successfully!');
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

  const generateDateRange = (start: string, end: string, bookingType: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (bookingType === 'day-use') {
      return [start];
    }
    
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const handleConfirmBooking = async () => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    if (!userProfile.phone || userProfile.phone === 'Not provided') {
      Alert.alert('Phone Number Required', 'Please add a phone number to your profile before booking.');
      return;
    }

    setLoading(true);
    try {
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
        status: 'confirmed' as 'confirmed', 
        paymentStatus: 'paid' as 'paid',
      };
      
      const bookingId = await createBooking(bookingData);
      
      const datesToBlock = generateDateRange(startDate, endDate, bookingType);
      await addBookedDatesToFarmhouse(farmhouseId, datesToBlock);

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

      setLoading(false);
      Alert.alert(
        'Booking Confirmed! 🎉', 
        `Your booking for ${farmhouseDetails?.name || farmhouseName} is confirmed.`,
        [{ 
          text: 'View Details', 
          onPress: () => navigation.replace('BookingDetails', { 
            booking: { 
              ...bookingData, 
              id: bookingId, 
              createdAt: new Date().toISOString() 
            } 
          }) 
        }]
      );
    } catch (error) {
      setLoading(false);
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking. The dates may have just been taken. Please try again.');
    }
  };

  const displayImage = farmhouseDetails?.photos?.[0] || farmhouseImage;
  const displayName = farmhouseDetails?.name || farmhouseName;
  const displayLocation = farmhouseDetails?.location || location;

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

      <ScrollView 
        style={styles.content} 
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
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Image source={{ uri: displayImage }} style={styles.farmhouseImage} />
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
            <ActivityIndicator color={colors.buttonText} />
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