import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Linking, Share, TextInput, FlatList, RefreshControl, useWindowDimensions, Modal,
} from 'react-native';
import LocationMapView from '../../components/LocationMapView';
import AnimatedImage from '../../components/AnimatedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Users, Home, Star, Clock, Share2, Phone, Mail, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useDialog } from '../../components/CustomDialog';
import { RootStackScreenProps, Farmhouse } from '../../types/navigation';
import { collection, query, where, onSnapshot, orderBy as firestoreOrderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../authContext';

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  userId: string;
  createdAt: any;
}

type Props = RootStackScreenProps<'FarmhouseDetail'>;

export default function FarmhouseDetailScreen({ route, navigation }: Props) {
  const initialFarmhouse = route.params.farmhouse;
  const { width, height: screenHeight } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();

  const [userPhone, setUserPhone] = useState<string>('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Use state for farmhouse to enable real-time updates
  const [farmhouse, setFarmhouse] = useState<Farmhouse>(initialFarmhouse);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<{ start?: string; end?: string }>({});
  const [guestCount, setGuestCount] = useState(initialFarmhouse.capacity);
  const [guestInputValue, setGuestInputValue] = useState(initialFarmhouse.capacity.toString());
  const [showPricingInfo, setShowPricingInfo] = useState<'overnight' | 'day-use'>('overnight');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fullscreen image viewer
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const fullscreenListRef = useRef<FlatList>(null);
  const imageListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onGalleryViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentImageIndex(viewableItems[0].index);
  });
  const onFullscreenViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setFullscreenIndex(viewableItems[0].index);
  });

  useEffect(() => {
    if (fullscreenVisible && fullscreenIndex > 0) {
      setTimeout(() => {
        fullscreenListRef.current?.scrollToIndex({ index: fullscreenIndex, animated: false });
      }, 50);
    }
  }, [fullscreenVisible]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const phone = snap.data()?.phone || '';
        setUserPhone(phone);
      }
    }).catch(() => {});
  }, [user]);

  // Real-time farmhouse updates
  useEffect(() => {
    const farmhouseRef = doc(db, 'farmhouses', initialFarmhouse.id);
    
    const unsubscribe = onSnapshot(
      farmhouseRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          // Transform the data to match Farmhouse type
          const updatedFarmhouse: Farmhouse = {
            ...farmhouse,
            bookedDates: data.bookedDates || [],
            blockedDates: data.blockedDates || [],
            customPricing: data.pricing?.customPricing || data.customPricing || [],
            // Update other fields that might change
            weeklyDay: parseInt(data.pricing?.weeklyDay || data.weeklyDay) || farmhouse.weeklyDay,
            weeklyNight: parseInt(data.pricing?.weeklyNight || data.weeklyNight) || farmhouse.weeklyNight,
            weekendDay: parseInt(data.pricing?.weekendDay || data.weekendDay) || farmhouse.weekendDay,
            weekendNight: parseInt(data.pricing?.weekendNight || data.weekendNight) || farmhouse.weekendNight,
            occasionalDay: parseInt(data.pricing?.occasionalDay || data.occasionalDay) || farmhouse.occasionalDay,
            occasionalNight: parseInt(data.pricing?.occasionalNight || data.occasionalNight) || farmhouse.occasionalNight,
            extraGuestPrice: parseInt(data.pricing?.extraGuestPrice) || farmhouse.extraGuestPrice,
            maxGuests: parseInt(data.pricing?.maxGuests || data.basicDetails?.maxGuests) || farmhouse.maxGuests,
            timing: data.timing ? {
              dayUseCheckIn: data.timing.dayUseCheckIn || farmhouse.timing?.dayUseCheckIn || '9:00 AM',
              dayUseCheckOut: data.timing.dayUseCheckOut || farmhouse.timing?.dayUseCheckOut || '6:00 PM',
              nightCheckIn: data.timing.nightCheckIn || farmhouse.timing?.nightCheckIn || '12:00 PM',
              nightCheckOut: data.timing.nightCheckOut || farmhouse.timing?.nightCheckOut || '11:00 AM',
            } : farmhouse.timing,
          };
          setFarmhouse(updatedFarmhouse);
        }
      },
      (error) => {
        console.error('Error listening to farmhouse updates:', error);
      }
    );

    return () => unsubscribe();
  }, [initialFarmhouse.id]);

  // Real-time reviews updates
  useEffect(() => {
    // Updated to use subcollection: farmhouses/{farmhouseId}/reviews
    const reviewsRef = collection(db, 'farmhouses', farmhouse.id, 'reviews');
    const q = query(
      reviewsRef,
      firestoreOrderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedReviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Review));
        setReviews(fetchedReviews);
        setLoadingReviews(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching reviews:', error);
        setLoadingReviews(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [farmhouse.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
  };

  // Calculate average rating from reviews
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return totalRating / reviews.length;
  }, [reviews]);

  // Sync stored rating with calculated average so list/wishlist screens stay consistent
  useEffect(() => {
    if (loadingReviews || reviews.length === 0) return;
    const avg = parseFloat(averageRating.toFixed(1));
    if (avg === farmhouse.rating) return;
    updateDoc(doc(db, 'farmhouses', farmhouse.id), { rating: avg }).catch(() => {});
  }, [averageRating, farmhouse.id, farmhouse.rating, loadingReviews, reviews.length]);

  // ========== PRICING HELPER FUNCTIONS ==========
  
  /** Convert ISO yyyy-mm-dd -> yyyy/mm/dd (with leading zeros) */
  const isoToCustomDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-');
    return `${y}/${m}/${d}`;
  };

  /** Normalize DB `name` value to yyyy/mm/dd. Handles "DD Mon YYYY" (admin format) and "YYYY-MM-DD" / "YYYY/MM/DD". */
  const normalizeCustomName = (name: string | undefined) => {
    if (!name) return null;
    const trimmed = name.trim();
    const MON: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const ddMonYYYY = trimmed.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
    if (ddMonYYYY) {
      const [, d, mon, y] = ddMonYYYY;
      const m = MON[mon];
      if (m) return `${y}/${m}/${d.padStart(2, '0')}`;
    }
    return trimmed.replace(/-/g, '/');
  };

  /** Safely parse price strings/numbers to Number, return null if invalid */
  const parsePrice = (val: any) => {
    if (val == null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = Number(val.replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  /** Find custom pricing entry for a given ISO date (yyyy-mm-dd) */
  const findCustomPricingFor = (isoDate: string) => {
    const customPricing = farmhouse.customPricing || [];
    if (!Array.isArray(customPricing)) return null;
    const key = isoToCustomDate(isoDate);
    return customPricing.find(cp => {
      const cpName = normalizeCustomName(cp.label || (cp as any).name);
      return cpName === key;
    }) || null;
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  /**
   * Get custom price for a single date for a "day" or "night".
   * type: 'day' | 'night'
   * Returns number or null if no custom price found.
   */
  const getCustomPriceForDate = (dateStringIso: string, type: 'day' | 'night' = 'night') => {
    const custom = findCustomPricingFor(dateStringIso);
    if (!custom) return null;

    const isWknd = isWeekend(dateStringIso);

    // Helper to try multiple fields
    const valueFrom = (...fields: (string | null)[]) => {
      for (const f of fields) {
        if (!f) continue;
        const customAny = custom as any;
        if (customAny[f] !== undefined && customAny[f] !== null) {
          const p = parsePrice(customAny[f]);
          if (p != null) return p;
        }
      }
      return null;
    };

    if (type === 'day') {
      const v = valueFrom('occasionalDay', isWknd ? 'weekendDay' : null, 'weeklyDay', 'price');
      if (v != null) return v;
    } else {
      const v = valueFrom('occasionalNight', isWknd ? 'weekendNight' : null, 'weeklyNight', 'price');
      if (v != null) return v;
    }

    return null;
  };

  /** 
   * Get the per-night price for a date (uses customPricing first, then farmhouse fields).
   * dateString is ISO yyyy-mm-dd
   */
  const getPriceForDate = (dateString: string) => {
    // Check custom pricing per-night
    const customNight = getCustomPriceForDate(dateString, 'night');
    if (customNight != null) return Math.floor(customNight);

    // Fallback to farmhouse fields
    return isWeekend(dateString) 
      ? parsePrice(farmhouse.weekendNight) || 0 
      : parsePrice(farmhouse.weeklyNight) || 0;
  };

  /** 
   * Get the day-use price for a date (day-use may have separate custom fields).
   * dateString is ISO yyyy-mm-dd
   */
  const getDayUsePrice = (dateString: string) => {
    // Check custom pricing per-day
    const customDay = getCustomPriceForDate(dateString, 'day');
    if (customDay != null) return Math.floor(customDay);

    // Fallback: use weekendDay/weeklyDay if available
    const baseDayPrice = isWeekend(dateString) 
      ? parsePrice(farmhouse.weekendDay) 
      : parsePrice(farmhouse.weeklyDay);
    if (baseDayPrice) return Math.floor(baseDayPrice);

    // Last resort: fall back to night price for that date
    return getPriceForDate(dateString);
  };

  // ========== END PRICING HELPER FUNCTIONS ==========

  const amenitiesList = useMemo(() => {
    const a = farmhouse.amenities as any;
    const list: string[] = [];
    if (a.wifi) list.push('WiFi');
    if (a.ac) list.push('Air Conditioning');
    if (a.parking) list.push('Parking');
    if (a.kitchen) list.push('Kitchen');
    if (a.tv > 0 || a.tv === true) list.push('TV');
    if (a.geyser > 0 || a.geyser === true) list.push('Geyser');
    if (a.pool) list.push('Swimming Pool');
    if (a.bonfire > 0 || a.bonfire === true) list.push('Bonfire');
    if (a.bbq) list.push('BBQ / Grill');
    if (a.outdoorSeating) list.push('Outdoor Seating');
    if (a.hotTub) list.push('Hot Tub / Jacuzzi');
    if (a.djMusicSystem) list.push('DJ / Music System');
    if (a.projector) list.push('Projector');
    if (a.restaurant) list.push('Restaurant');
    if (a.foodPrepOnDemand) list.push('Food Prep on Demand');
    if (a.decorService) list.push('Decor Service');
    if (a.chess > 0 || a.chess === true) list.push('Chess');
    if (a.carroms > 0 || a.carroms === true) list.push('Carom Board');
    if (a.volleyball > 0 || a.volleyball === true) list.push('Volleyball');
    if (a.badminton) list.push('Badminton Court');
    if (a.tableTennis) list.push('Table Tennis');
    if (a.cricket) list.push('Cricket Ground');
    return list;
  }, [farmhouse.amenities]);

  const images = farmhouse.photos || [];
  const mainImage = images[0] || 'https://via.placeholder.com/400x300';
  const rooms = farmhouse.bedrooms;
  const unavailableDates: string[] = [...new Set([...(farmhouse.blockedDates || []), ...(farmhouse.bookedDates || [])])];
  const extraGuestPrice = farmhouse.extraGuestPrice || 500;
  const maxGuests = farmhouse.maxGuests && farmhouse.maxGuests > 0 ? farmhouse.maxGuests : farmhouse.capacity * 2;

  const rulesList = useMemo(() => {
    const rules = farmhouse.rules;
    if (!rules) return ['House rules will be provided by the owner.'];
    const list: string[] = [];
    if (rules.pets) list.push('Pets allowed');
    else list.push('No pets allowed');
    if ((rules as any).alcohol === false || (rules as any).alcoholNotAllowed === true) list.push('No alcohol allowed');
    if (rules.quietHours) {
      const quietHoursText = typeof rules.quietHours === 'string' ? rules.quietHours : 'enforced';
      list.push(`Quiet hours: ${quietHoursText}`);
    }
    if ((rules as any).additionalRules) list.push((rules as any).additionalRules);
    return list;
  }, [farmhouse.rules]);

  const updateGuestCount = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(1, Math.min(numValue, maxGuests));
    setGuestCount(clampedValue);
    setGuestInputValue(clampedValue.toString());
  };

  const handleGuestInputChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setGuestInputValue(numericText);
  };

  const handleGuestInputBlur = () => {
    updateGuestCount(guestInputValue);
  };

  const toggleWishlist = async () => {
    if (isInWishlist(farmhouse.id)) {
      await removeFromWishlist(farmhouse.id);
    } else {
      await addToWishlist(farmhouse.id);
    }
  };

  const handleShare = async () => {
    try {
      const ratingText = averageRating > 0 ? `${averageRating.toFixed(1)}/5` : 'New Property';
      const shareMessage = `${farmhouse.name}\n\n` +
        `Location: ${farmhouse.location}\n` +
        `Rating: ${ratingText} (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})\n` +
        `Capacity: Up to ${farmhouse.capacity} guests\n` +
        `${farmhouse.bedrooms} Bedrooms\n\n` +
        `Pricing:\n` +
        `   Weekday: Rs. ${farmhouse.weeklyNight}/night\n` +
        `   Weekend: Rs. ${farmhouse.weekendNight}/night\n\n` +
        `Book now on ReRoute App!\n` +
        `Download: https://play.google.com/store/apps/details?id=com.reroute.app`;

      await Share.share({
        message: shareMessage,
        title: `${farmhouse.name} - ReRoute`,
      });
    } catch (error) {
      showDialog({
        title: 'Error',
        message: 'Could not share farmhouse',
        type: 'error'
      });
    }
  };

  const getISTHour = () => {
    // IST = UTC+5:30
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istMs = utcMs + 5.5 * 3600000;
    return new Date(istMs).getHours();
  };

  const getMinimumDate = () => {
    const now = new Date();
    // Block today if it's past 9am IST
    if (getISTHour() >= 9) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return now.toISOString().split('T')[0];
  };

  const getMaximumDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + (farmhouse.bookingWindowDays ?? 90));
    return now.toISOString().split('T')[0];
  };

  const fmtDate = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  type UnavailReason = 'past' | 'outside_window' | 'booked' | 'blocked' | null;

  const getUnavailReason = (dateString: string): UnavailReason => {
    const minDate = getMinimumDate();
    const maxDate = getMaximumDate();
    if (dateString < minDate) return 'past';
    if (dateString > maxDate) return 'outside_window';
    if (farmhouse.bookedDates?.includes(dateString)) return 'booked';
    if (farmhouse.blockedDates?.includes(dateString)) return 'blocked';
    return null;
  };

  const isDateUnavailable = (dateString: string) => getUnavailReason(dateString) !== null;

  const showUnavailDialog = (reason: UnavailReason, dateString?: string) => {
    const minDate = getMinimumDate();
    const maxDate = getMaximumDate();
    const window = farmhouse.bookingWindowDays ?? 90;
    const msgs: Record<NonNullable<UnavailReason>, string> = {
      past: `Earliest available date is ${fmtDate(minDate)}.`,
      outside_window: `This farmhouse accepts bookings up to ${window} days ahead (until ${fmtDate(maxDate)}).`,
      booked: `${dateString ? fmtDate(dateString) + ' is' : 'This date is'} unavailable for booking.`,
      blocked: `${dateString ? fmtDate(dateString) + ' is' : 'This date is'} unavailable for booking.`,
    };
    showDialog({ title: 'Date Unavailable', message: msgs[reason!], type: 'warning' });
  };

  const handleDateSelect = (day: DateData) => {
    const dateString = day.dateString;

    const reason = getUnavailReason(dateString);
    if (reason) {
      showUnavailDialog(reason, dateString);
      return;
    }

    if (!selectedDates.start) {
      setSelectedDates({ start: dateString, end: dateString });
      return;
    }

    if (selectedDates.start && selectedDates.start === selectedDates.end) {
      if (dateString === selectedDates.start) {
        setSelectedDates({});
        return;
      }

      if (dateString < selectedDates.start) {
        setSelectedDates({ start: dateString, end: dateString });
        return;
      }

      const start = new Date(selectedDates.start);
      const end = new Date(dateString);
      let current = new Date(start);
      let conflictDate: string | null = null;
      let conflictReason: UnavailReason = null;

      while (current <= end) {
        const check = current.toISOString().split('T')[0];
        const r = getUnavailReason(check);
        if (r) { conflictDate = check; conflictReason = r; break; }
        current.setDate(current.getDate() + 1);
      }

      if (conflictDate && conflictReason) {
        showUnavailDialog(conflictReason, conflictDate);
        setSelectedDates({ start: dateString, end: dateString });
        return;
      }

      setSelectedDates({ start: selectedDates.start, end: dateString });
      return;
    }

    setSelectedDates({ start: dateString, end: dateString });
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    const bookedStyle = {
      disabled: true,
      disableTouchEvent: true,
      startingDay: true,
      endingDay: true,
      color: isDark ? '#374151' : '#E5E7EB',
      textColor: isDark ? '#6B7280' : '#9CA3AF',
    };

    // Only mark future booked/blocked dates — past dates are outside the booking window
    // and should not show the grey circle (calendar already disables them via minDate)
    const today = new Date().toISOString().split('T')[0];
    unavailableDates.forEach(date => {
      if (date < today) return;
      marked[date] = bookedStyle;
    });

    // Mark selected dates
    if (selectedDates.start && selectedDates.end) {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      let current = new Date(start);

      while (current <= end) {
        const dateString = current.toISOString().split('T')[0];

        // Only mark if not already marked as unavailable
        if (!marked[dateString]) {
          const isStart = dateString === selectedDates.start;
          const isEnd = dateString === selectedDates.end;

          marked[dateString] = {
            selected: true,
            color: '#D4AF37',
            textColor: '#FFFFFF',
            startingDay: isStart,
            endingDay: isEnd,
          };
        }
        current.setDate(current.getDate() + 1);
      }
    }
    // Custom-priced dates: no dot, just available (normal)


    return marked;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDates, unavailableDates, isDark, farmhouse.bookingWindowDays]);
  
  const calculateNights = () => {
    if (!selectedDates.start || !selectedDates.end || selectedDates.start === selectedDates.end) return 0;
    const start = new Date(selectedDates.start);
    const end = new Date(selectedDates.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateExtraGuestCharge = () => {
    if (guestCount <= farmhouse.capacity) return 0;
    const extra = guestCount - farmhouse.capacity;
    const units = getBookingType() === 'day-use' ? 1 : calculateNights();
    return extra * extraGuestPrice * units;
  };

  const getBookingType = () => {
    return calculateNights() === 0 ? 'day-use' : 'overnight';
  };

  const calculateTotalPrice = () => {
    if (!selectedDates.start || !selectedDates.end) return 0;
    let total = 0;
    const bookingType = getBookingType();

    if (bookingType === 'day-use') {
      total = getDayUsePrice(selectedDates.start);
    } else {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      let current = new Date(start);
      while (current < end) {
        const dateString = current.toISOString().split('T')[0];
        total += getPriceForDate(dateString);
        current.setDate(current.getDate() + 1);
      }
    }

    if (guestCount > farmhouse.capacity) {
      const extraGuests = guestCount - farmhouse.capacity;
      const days = bookingType === 'day-use' ? 1 : calculateNights();
      total += extraGuests * extraGuestPrice * days;
    }
    return total;
  };

  const proceedToBooking = () => {
    navigation.navigate('BookingConfirmation', {
      farmhouseId: farmhouse.id,
      farmhouseName: farmhouse.name,
      farmhouseImage: mainImage,
      location: farmhouse.location,
      startDate: selectedDates.start!,
      endDate: selectedDates.end!,
      guestCount,
      totalPrice: calculateTotalPrice(),
      numberOfNights: calculateNights(),
      bookingType: getBookingType(),
      capacity: farmhouse.capacity,
      rooms: rooms,
      extraGuestCharge: calculateExtraGuestCharge(),
      extraGuestCount: Math.max(0, guestCount - farmhouse.capacity),
      extraGuestRate: extraGuestPrice,
    });
  };

  const handleBooking = () => {
    if (!selectedDates.start || !selectedDates.end) {
      showDialog({
        title: 'Select Dates',
        message: 'Please select your desired dates on the calendar.',
        type: 'warning'
      });
      return;
    }
    if (!userPhone || userPhone.trim() === '' || userPhone === 'Not provided') {
      setPhoneInput('');
      setShowPhoneModal(true);
      return;
    }
    proceedToBooking();
  };

  const savePhoneAndProceed = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed || !/^[6-9]\d{9}$/.test(trimmed)) {
      showDialog({ title: 'Invalid Number', message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.', type: 'warning' });
      return;
    }
    if (!user) return;
    setSavingPhone(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { phone: trimmed });
      setUserPhone(trimmed);
      setShowPhoneModal(false);
      proceedToBooking();
    } catch {
      showDialog({ title: 'Error', message: 'Could not save phone number. Try again.', type: 'error' });
    } finally {
      setSavingPhone(false);
    }
  };

  const openGoogleMaps = () => {
    if (!farmhouse.mapLink) {
        showDialog({
          title: 'Location not available',
          message: 'Map link is not available for this farmhouse.',
          type: 'warning'
        });
        return;
    }
    Linking.canOpenURL(farmhouse.mapLink).then(supported => {
        if (supported) Linking.openURL(farmhouse.mapLink);
        else showDialog({
          title: 'Error',
          message: 'Could not open the map link.',
          type: 'error'
        });
    }).catch(err => console.error('An error occurred opening the map', err));
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            color={star <= rating ? '#FCD34D' : '#D1D5DB'}
            fill={star <= rating ? '#FCD34D' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const renderReview = useCallback(({ item }: { item: Review }) => (
    <View style={[styles.reviewCardHorizontal, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: colors.buttonBackground }]}>
          <Text style={[styles.reviewAvatarText, { color: colors.buttonText }]}>
            {item.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.reviewMeta}>
          <Text style={[styles.reviewUserName, { color: colors.text }]} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={[styles.reviewDate, { color: colors.placeholder }]}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
      {renderStars(item.rating)}
      <Text style={[styles.reviewComment, { color: colors.text }]} numberOfLines={4}>
        {item.comment}
      </Text>
    </View>
  ), [colors, isDark]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <ScrollView
        style={styles.mainScroll}
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
        <View style={styles.imageSection}>
          <FlatList
            ref={imageListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onViewableItemsChanged={onGalleryViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={0.95} onPress={() => { setFullscreenIndex(index); setFullscreenVisible(true); }}>
                <AnimatedImage uri={item} style={[styles.image, { width }]} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>{currentImageIndex + 1} / {images.length || 1}</Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Share2 size={22} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={toggleWishlist}>
                <Heart size={22} color={isInWishlist(farmhouse.id) ? "#EF4444" : "#666"} fill={isInWishlist(farmhouse.id) ? "#EF4444" : "transparent"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{farmhouse.name}</Text>
            <View style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              marginBottom: 8,
              backgroundColor: farmhouse.propertyType === 'resort' ? '#F3E8FF' : '#ECFDF5',
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: farmhouse.propertyType === 'resort' ? '#7C3AED' : '#16A34A',
              }}>
                {farmhouse.propertyType === 'resort' ? 'Resort' : 'Farmhouse'}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Star size={16} color="#FCD34D" fill="#FCD34D" />
              <Text style={[styles.rating, { color: colors.text }]}>
                {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
              </Text>
              <Text style={[styles.reviews, { color: colors.placeholder }]}>
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          </View>

          <View style={styles.quickInfo}>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Users size={20} color={colors.buttonBackground} />
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Capacity</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{farmhouse.capacity}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Home size={20} color={colors.buttonBackground} />
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Rooms</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{rooms}</Text>
            </View>
          </View>
          
          <View style={[styles.timingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.timingTypeLabel, { color: colors.placeholder }]}>Day Use</Text>
            <View style={styles.timingRow}>
              <Clock size={16} color={colors.buttonBackground} />
              <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-in</Text>
              <Text style={[styles.timingValue, { color: colors.text }]}>{farmhouse.timing?.dayUseCheckIn || '9:00 AM'}</Text>
            </View>
            <View style={styles.timingRow}>
              <Clock size={16} color={colors.buttonBackground} />
              <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-out</Text>
              <Text style={[styles.timingValue, { color: colors.text }]}>{farmhouse.timing?.dayUseCheckOut || '6:00 PM'}</Text>
            </View>
            <View style={[styles.timingDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.timingTypeLabel, { color: colors.placeholder }]}>Overnight Stay</Text>
            <View style={styles.timingRow}>
              <Clock size={16} color={colors.buttonBackground} />
              <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-in</Text>
              <Text style={[styles.timingValue, { color: colors.text }]}>{farmhouse.timing?.nightCheckIn || '12:00 PM'}</Text>
            </View>
            <View style={styles.timingRow}>
              <Clock size={16} color={colors.buttonBackground} />
              <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-out</Text>
              <Text style={[styles.timingValue, { color: colors.text }]}>{farmhouse.timing?.nightCheckOut || '11:00 AM'}</Text>
            </View>
           </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.description, { color: colors.placeholder }]}>{farmhouse.description}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllAmenities', { amenities: amenitiesList })}>
                <Text style={[styles.viewAllText, { color: colors.buttonBackground }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.amenitiesGrid}>
              {amenitiesList.slice(0, 6).map((amenity, index) => (
                <View key={index} style={[styles.amenityChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Where you'll be */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Where you'll be</Text>
            <LocationMapView
              location={[farmhouse.area, farmhouse.city].filter(Boolean).join(', ') || farmhouse.location}
              mapLink={farmhouse.mapLink}
            />
          </View>

          <View style={[styles.pricingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>
            <View style={styles.pricingViewContainer}>
              <TouchableOpacity style={[ styles.pricingViewButton, showPricingInfo === 'overnight' && { backgroundColor: colors.buttonBackground }, { borderColor: colors.border }]} onPress={() => setShowPricingInfo('overnight')}>
                <Text style={[ styles.pricingViewText, { color: showPricingInfo === 'overnight' ? colors.buttonText : colors.text }]}>Overnight Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ styles.pricingViewButton, showPricingInfo === 'day-use' && { backgroundColor: colors.buttonBackground }, { borderColor: colors.border }]} onPress={() => setShowPricingInfo('day-use')}>
                <Text style={[ styles.pricingViewText, { color: showPricingInfo === 'day-use' ? colors.buttonText : colors.text }]}>Day Use</Text>
              </TouchableOpacity>
            </View>

            {showPricingInfo === 'overnight' ? (
              <View style={styles.priceGrid}>
                <View style={styles.priceBox}><Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Weekday</Text><Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weeklyNight}</Text><Text style={[styles.priceBoxSub, { color: colors.placeholder }]}>per night</Text></View>
                <View style={styles.priceBox}><Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Weekend</Text><Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weekendNight}</Text><Text style={[styles.priceBoxSub, { color: colors.placeholder }]}>per night</Text></View>
              </View>
            ) : (
              <View style={styles.priceGrid}>
                <View style={styles.priceBox}><Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Weekday</Text><Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weeklyDay}</Text></View>
                <View style={styles.priceBox}><Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Weekend</Text><Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weekendDay}</Text></View>
              </View>
            )}

            <View style={[styles.extraGuestBox, { backgroundColor: isDark ? 'rgba(2,68,77,0.1)' : 'rgba(2,68,77,0.05)', borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.extraGuestText, { color: colors.text }]}>Extra guest charge (above {farmhouse.capacity})</Text>
                <Text style={[{ fontSize: 12, color: colors.placeholder, marginTop: 2 }]}>Max {maxGuests} guests allowed</Text>
              </View>
              <Text style={[styles.extraGuestPrice, { color: colors.buttonBackground }]}>₹{extraGuestPrice}/guest</Text>
            </View>
          </View>

          <View style={[styles.calendarCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Dates</Text>
            <Text style={[styles.calendarInstruction, { color: colors.placeholder }]}>
              Tap a date for day use, or two dates for an overnight stay. (Max {farmhouse.bookingWindowDays ?? 90} days from today)
            </Text>
            
            <View style={[styles.guestSelector, { borderColor: colors.border }]}>
              <View style={styles.guestInfoContainer}>
                <Text style={[styles.guestLabel, { color: colors.text }]}>Number of Guests</Text>
                <Text style={[styles.guestSubLabel, { color: colors.placeholder }]}>Base: {farmhouse.capacity} · Max: {maxGuests}</Text>
                {guestCount > farmhouse.capacity && (
                  <Text style={[styles.guestSubLabel, { color: '#F59E0B' }]}>+{guestCount - farmhouse.capacity} extra @ ₹{extraGuestPrice}/guest</Text>
                )}
              </View>
              <View style={styles.guestControls}>
                <TouchableOpacity
                  style={[styles.guestButton, { backgroundColor: colors.buttonBackground, opacity: guestCount <= 1 ? 0.5 : 1 }]}
                  onPress={() => updateGuestCount((guestCount - 1).toString())}
                  disabled={guestCount <= 1}
                >
                  <Text style={[styles.guestButtonText, { color: colors.buttonText }]}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.guestInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={guestInputValue}
                  onChangeText={handleGuestInputChange}
                  onBlur={handleGuestInputBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={[styles.guestButton, { backgroundColor: colors.buttonBackground, opacity: guestCount >= maxGuests ? 0.5 : 1 }]}
                  onPress={() => updateGuestCount((guestCount + 1).toString())}
                  disabled={guestCount >= maxGuests}
                >
                  <Text style={[styles.guestButtonText, { color: colors.buttonText }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Calendar
              markedDates={markedDates}
              onDayPress={handleDateSelect}
              minDate={getMinimumDate()}
              maxDate={getMaximumDate()}
              current={getMinimumDate()}
              pastScrollRange={0}
              markingType={'period'}
              renderArrow={(direction) =>
                direction === 'left'
                  ? <ChevronLeft size={22} color="#D4AF37" />
                  : <ChevronRight size={22} color="#D4AF37" />
              }
              theme={{
                backgroundColor: colors.cardBackground,
                calendarBackground: colors.cardBackground,
                textSectionTitleColor: colors.text,
                dayTextColor: colors.text,
                todayTextColor: '#D4AF37',
                monthTextColor: colors.text,
                arrowColor: isDark ? '#D4AF37' : '#B8860B',
                textDisabledColor: isDark ? '#4A4A4A' : '#C8C8C8',
              }}
            />

            {selectedDates.start && selectedDates.end && (
              <View style={[styles.bookingSummary, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.1)', borderColor: '#D4AF37' }]}>
                {(() => {
                  const type = getBookingType();
                  const nights = calculateNights();
                  const extraCharge = calculateExtraGuestCharge();
                  const baseCharge = calculateTotalPrice() - extraCharge;
                  const label = type === 'day-use' ? 'Day Use' : `${nights} ${nights === 1 ? 'night' : 'nights'}`;
                  return (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.placeholder }]}>Accommodation ({label}):</Text>
                        <Text style={[styles.summaryLabel, { color: colors.text }]}>₹{baseCharge}</Text>
                      </View>
                      {extraCharge > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>
                            Extra guests ({guestCount - farmhouse.capacity} × ₹{extraGuestPrice}{type !== 'day-use' ? ` × ${nights}n` : ''}):
                          </Text>
                          <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>₹{extraCharge}</Text>
                        </View>
                      )}
                      <View style={[styles.summaryRow, { borderTopWidth: extraCharge > 0 ? 0.5 : 0, borderTopColor: '#D4AF37', marginTop: extraCharge > 0 ? 6 : 0, paddingTop: extraCharge > 0 ? 6 : 0 }]}>
                        <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>Total:</Text>
                        <Text style={[styles.totalValue, { color: '#D4AF37' }]}>₹{calculateTotalPrice()}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>House Rules</Text>
            {rulesList.map((rule, idx) => (
              <Text key={idx} style={[styles.ruleText, { color: colors.placeholder }]}>• {rule}</Text>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllReviews', { farmhouseId: farmhouse.id })}>
                <Text style={[styles.viewAllText, { color: colors.buttonBackground }]}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {loadingReviews ? (
              <Text style={[styles.loadingText, { color: colors.placeholder }]}>Loading reviews...</Text>
            ) : reviews.length === 0 ? (
              <Text style={[styles.noReviewsText, { color: colors.placeholder }]}>No reviews yet. Be the first to review!</Text>
            ) : (
              <FlatList
                data={reviews}
                renderItem={renderReview}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsListContainer}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={true}
              />
            )}
          </View>

          {/* Contact Us */}
          <View style={[styles.contactSection, { borderColor: colors.border }]}>
            <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Need help? Reach us directly</Text>
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.buttonBackground }]}
                onPress={() => Linking.openURL('tel:+918280353535')}
                activeOpacity={0.8}
              >
                <Phone size={16} color={colors.buttonText} />
                <Text style={[styles.contactBtnText, { color: colors.buttonText }]}>+91 82803 53535</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.buttonBackground }]}
                onPress={() => Linking.openURL('mailto:rustiquebyranareddy@gmail.com')}
                activeOpacity={0.8}
              >
                <Mail size={16} color={colors.buttonBackground} />
                <Text style={[styles.contactBtnText, { color: colors.buttonBackground }]}>Email Us</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomPrice, { color: colors.buttonBackground }]}>
            ₹{selectedDates.start ? calculateTotalPrice() : farmhouse.weeklyNight}
            {selectedDates.start ? null : <Text style={styles.priceQualifier}> / night</Text>}
          </Text>
        </View>
        <TouchableOpacity style={[styles.bookButton, { backgroundColor: colors.buttonBackground, opacity: !selectedDates.start ? 0.6 : 1 }]} onPress={handleBooking} disabled={!selectedDates.start}>
          <Text style={[styles.bookButtonText, { color: colors.buttonText }]}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPhoneModal} transparent animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
        <View style={styles.phoneModalOverlay}>
          <View style={[styles.phoneModalCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.phoneModalTitle, { color: colors.text }]}>Contact Number Required</Text>
            <Text style={[styles.phoneModalSubtitle, { color: colors.placeholder }]}>
              We need your phone number to confirm your booking.
            </Text>
            <TextInput
              style={[styles.phoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your phone number"
              placeholderTextColor={colors.placeholder}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.phoneModalBtn, { backgroundColor: colors.buttonBackground, opacity: savingPhone ? 0.7 : 1 }]}
              onPress={savePhoneAndProceed}
              disabled={savingPhone}
            >
              <Text style={[styles.phoneModalBtnText, { color: colors.buttonText }]}>
                {savingPhone ? 'Saving...' : 'Save & Continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.phoneModalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 8 }]}
              onPress={() => { setShowPhoneModal(false); navigation.navigate('EditProfile' as any); }}
            >
              <Text style={[styles.phoneModalBtnText, { color: colors.text }]}>Edit Profile Instead</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => setShowPhoneModal(false)}>
              <Text style={{ color: colors.placeholder, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={fullscreenVisible} transparent animationType="fade" onRequestClose={() => setFullscreenVisible(false)}>
        <View style={styles.fullscreenContainer}>
          <FlatList
            ref={fullscreenListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={fullscreenIndex}
            onViewableItemsChanged={onFullscreenViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={({ item }) => (
              <View style={{ width, height: screenHeight, justifyContent: 'center', alignItems: 'center' }}>
                <AnimatedImage uri={item} style={{ width, height: screenHeight * 0.75 }} resizeMode="contain" />
              </View>
            )}
          />
          <View style={styles.fullscreenCounter}>
            <Text style={styles.imageCounterText}>{fullscreenIndex + 1} / {images.length}</Text>
          </View>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenVisible(false)}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainScroll: { flex: 1 },
  imageSection: { position: 'relative', height: 300, overflow: 'hidden' },
  fullscreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullscreenClose: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 },
  fullscreenCounter: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  image: { height: 300 },
  imageCounter: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  topActions: { position: 'absolute', top: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  rightActions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 8 },
  content: { paddingHorizontal: 20 },
  header: { marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 16, fontWeight: '600' },
  reviews: { fontSize: 14 },
  contactSection: { marginTop: 28, paddingTop: 20 },
  contactLabel: { fontSize: 12, textAlign: 'center', marginBottom: 12, letterSpacing: 0.3 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  contactBtnText: { fontSize: 13, fontWeight: '600' },
  quickInfo: { flexDirection: 'row', gap: 12, marginTop: 20 },
  infoCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  timingCard: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timingInfo: { flex: 1 },
  timingTypeLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  timingLabel: { fontSize: 13, flex: 1 },
  timingValue: { fontSize: 14, fontWeight: '600' },
  timingNote: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  timingDivider: { height: 1, marginVertical: 8 },
  phoneModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  phoneModalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  phoneModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  phoneModalSubtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  phoneInput: { height: 50, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  phoneModalBtn: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  phoneModalBtnText: { fontSize: 16, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  viewAllText: { fontSize: 14, fontWeight: '500' },
  description: { fontSize: 15, lineHeight: 22 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  amenityText: { fontSize: 14 },
  pricingCard: { marginTop: 24, padding: 20, borderRadius: 12, borderWidth: 1 },
  pricingViewContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pricingViewButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  pricingViewText: { fontSize: 14, fontWeight: '600' },
  priceGrid: { flexDirection: 'row', gap: 12 },
  priceBox: { flex: 1, padding: 16, borderRadius: 8, backgroundColor: 'rgba(2,68,77,0.05)', alignItems: 'center' },
  priceBoxLabel: { fontSize: 12, marginBottom: 8 },
  priceBoxValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  priceBoxSub: { fontSize: 11 },
  extraGuestBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 16 },
  extraGuestText: { fontSize: 13, flex: 1 },
  extraGuestPrice: { fontSize: 16, fontWeight: 'bold' },
  calendarCard: { marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1 },
  calendarInstruction: { fontSize: 13, marginBottom: 12, lineHeight: 18, textAlign: 'center' },
  guestSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  guestInfoContainer: { flex: 1 },
  guestLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  guestSubLabel: { fontSize: 12 },
  guestControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guestButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  guestButtonText: { fontSize: 20, fontWeight: 'bold' },
  guestInput: { width: 50, height: 40, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  bookingSummary: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  ruleText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  loadingText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  noReviewsText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  reviewsListContainer: { paddingRight: 20 },
  reviewCardHorizontal: { width: 280, padding: 16, borderRadius: 12, borderWidth: 1, marginRight: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 18, fontWeight: 'bold' },
  reviewMeta: { flex: 1 },
  reviewUserName: { fontSize: 15, fontWeight: '600' },
  reviewDate: { fontSize: 12, marginTop: 2 },
  starsRow: { flexDirection: 'row', gap: 2, marginVertical: 6 },
  reviewComment: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, paddingBottom: 24 },
  bottomPrice: { fontSize: 22, fontWeight: 'bold' },
  priceQualifier: { fontSize: 14, fontWeight: 'normal' },
  bookButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  bookButtonText: { fontSize: 16, fontWeight: '600' },
});