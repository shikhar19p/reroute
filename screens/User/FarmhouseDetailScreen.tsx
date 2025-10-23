import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, Linking, Share, TextInput, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Users, Home, Star, Clock, Share2, Phone, Navigation, User } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useDialog } from '../../components/CustomDialog';
import { RootStackScreenProps, Farmhouse } from '../../types/navigation';
import { collection, query, where, onSnapshot, orderBy as firestoreOrderBy, limit, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  farmhouseId: string;
}

type Props = RootStackScreenProps<'FarmhouseDetail'>;

export default function FarmhouseDetailScreen({ route, navigation }: Props) {
  const initialFarmhouse = route.params.farmhouse;
  const { colors, isDark } = useTheme();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();

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
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('farmhouseId', '==', farmhouse.id),
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

  // ========== PRICING HELPER FUNCTIONS ==========
  
  /** Convert ISO yyyy-mm-dd -> yyyy/mm/dd (with leading zeros) */
  const isoToCustomDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-');
    return `${y}/${m}/${d}`;
  };

  /** Normalize DB `name` value to comparable form (trim spaces, ensure slashes) */
  const normalizeCustomName = (name: string | undefined) => {
    if (!name) return null;
    return name.trim().replace(/-/g, '/');
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
    const amenities = farmhouse.amenities;
    const list: string[] = [];
    if (amenities.tv > 0) list.push(`${amenities.tv} TV${amenities.tv > 1 ? 's' : ''}`);
    if (amenities.geyser > 0) list.push(`${amenities.geyser} Geyser${amenities.geyser > 1 ? 's' : ''}`);
    if (amenities.bonfire > 0) list.push('Bonfire');
    if (amenities.chess > 0) list.push('Chess');
    if (amenities.carroms > 0) list.push('Carroms');
    if (amenities.volleyball > 0) list.push('Volleyball');
    if (amenities.pool) list.push('Swimming Pool');
    return list;
  }, [farmhouse.amenities]);

  const images = farmhouse.photos || [];
  const mainImage = images[0] || 'https://via.placeholder.com/400x300';
  const rooms = farmhouse.bedrooms;
  const unavailableDates: string[] = [...new Set([...(farmhouse.blockedDates || []), ...(farmhouse.bookedDates || [])])];
  const extraGuestPrice = farmhouse.extraGuestPrice || 500;

  const rulesList = useMemo(() => {
    const rules = farmhouse.rules;
    if (!rules) return ['House rules will be provided by the owner.'];
    const list: string[] = [];
    if (!rules.unmarriedCouples) list.push('Unmarried couples not allowed');
    else list.push('Unmarried couples are welcome');
    if (rules.pets) list.push('Pets allowed');
    else list.push('No pets allowed');
    if (rules.quietHours) {
      const quietHoursText = typeof rules.quietHours === 'string' ? rules.quietHours : 'enforced';
      list.push(`Quiet hours: ${quietHoursText}`);
    }
    return list;
  }, [farmhouse.rules]);

  const contactPhone1 = farmhouse.contactPhone1 || farmhouse.basicDetails?.contactPhone1;
  const contactPhone2 = farmhouse.contactPhone2 || farmhouse.basicDetails?.contactPhone2;

  const updateGuestCount = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(1, numValue);
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
      const shareMessage = `🏡 ${farmhouse.name}\n\n` +
        `📍 Location: ${farmhouse.location}\n` +
        `⭐ Rating: ${farmhouse.rating.toFixed(1)}/5 (${farmhouse.reviews} reviews)\n` +
        `👥 Capacity: Up to ${farmhouse.capacity} guests\n` +
        `🛏️ ${farmhouse.bedrooms} Bedrooms\n\n` +
        `💰 Pricing:\n` +
        `   Weekday: ₹${farmhouse.weeklyNight}/night\n` +
        `   Weekend: ₹${farmhouse.weekendNight}/night\n\n` +
        `📱 Book now on ReRoute App!\n` +
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

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const getMinimumDate = () => {
    const now = new Date();
    if (now.getHours() < 12) {
      return now.toISOString().split('T')[0];
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaximumDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + 21);
    return now.toISOString().split('T')[0];
  };

  const isDateBooked = (dateString: string) => unavailableDates.includes(dateString);

  const handleDateSelect = (day: DateData) => {
    const dateString = day.dateString;
    if (isDateBooked(dateString)) {
      showDialog({
        title: 'Unavailable',
        message: 'This date is already booked or blocked.',
        type: 'warning'
      });
      return;
    }

    if (!selectedDates.start) {
      setSelectedDates({ start: dateString, end: dateString });
    } else if (selectedDates.start && selectedDates.start === selectedDates.end) {
      if (dateString === selectedDates.start) {
        setSelectedDates({});
      } else if (dateString < selectedDates.start) {
        setSelectedDates({ start: dateString, end: dateString });
      } else {
        setSelectedDates({ start: selectedDates.start, end: dateString });
      }
    } else {
      setSelectedDates({ start: dateString, end: dateString });
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    unavailableDates.forEach(date => {
      marked[date] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: {
            backgroundColor: isDark ? '#3F1F1F' : '#FEE2E2',
            borderWidth: 1,
            borderColor: '#EF4444',
          },
          text: {
            color: '#EF4444',
            fontWeight: '600',
            textDecorationLine: 'line-through',
            textDecorationStyle: 'solid',
            textDecorationColor: '#EF4444',
          }
        }
      };
    });

    if (selectedDates.start && selectedDates.end) {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      let current = new Date(start);

      while (current <= end) {
        const dateString = current.toISOString().split('T')[0];
        if (isDateBooked(dateString) && dateString !== selectedDates.start) {
          showDialog({
            title: 'Invalid Range',
            message: 'Your selection includes an unavailable date.',
            type: 'warning'
          });
          setSelectedDates({ start: selectedDates.start, end: selectedDates.start });
          return marked;
        }
        
        if (!marked[dateString]) {
          const isStart = dateString === selectedDates.start;
          const isEnd = dateString === selectedDates.end;
          
          marked[dateString] = {
            selected: true,
            color: '#14B8A6',
            textColor: '#FFFFFF',
            startingDay: isStart,
            endingDay: isEnd,
          };
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return marked;
  };
  
  const calculateNights = () => {
    if (!selectedDates.start || !selectedDates.end || selectedDates.start === selectedDates.end) return 0;
    const start = new Date(selectedDates.start);
    const end = new Date(selectedDates.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  const handleBooking = () => {
    if (!selectedDates.start || !selectedDates.end) {
      showDialog({
        title: 'Select Dates',
        message: 'Please select your desired dates on the calendar.',
        type: 'warning'
      });
      return;
    }

    navigation.navigate('BookingConfirmation', {
      farmhouseId: farmhouse.id,
      farmhouseName: farmhouse.name,
      farmhouseImage: mainImage,
      location: farmhouse.location,
      startDate: selectedDates.start,
      endDate: selectedDates.end,
      guestCount,
      totalPrice: calculateTotalPrice(),
      numberOfNights: calculateNights(),
      bookingType: getBookingType(),
      capacity: farmhouse.capacity,
      rooms: rooms,
    });
  };

  const openGoogleMaps = () => {
    let url = '';
    if (farmhouse.mapLink) {
        url = farmhouse.mapLink;
    } else if (farmhouse.coordinates) {
        url = `https://www.google.com/maps/search/?api=1&query=${farmhouse.coordinates.latitude},${farmhouse.coordinates.longitude}`;
    } else {
        showDialog({
          title: 'Location not available',
          message: 'Map link or coordinates are not available for this farmhouse.',
          type: 'warning'
        });
        return;
    }
    Linking.canOpenURL(url).then(supported => {
        if (supported) Linking.openURL(url);
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

  const renderReview = ({ item }: { item: Review }) => (
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
  );

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
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => {
              const index = Math.floor(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}>
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>
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
            <View style={styles.ratingRow}>
              <Star size={16} color="#FCD34D" fill="#FCD34D" />
              <Text style={[styles.rating, { color: colors.text }]}>{farmhouse.rating.toFixed(1)}</Text>
              <Text style={[styles.reviews, { color: colors.placeholder }]}>({farmhouse.reviews} reviews)</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={18} color={colors.placeholder} />
            <Text style={[styles.location, { color: colors.placeholder }]}>{farmhouse.location}</Text>
          </View>

          {/* Owner Contact Information Card */}
          {(contactPhone1 || contactPhone2) && (
            <View style={[styles.ownerCard, { backgroundColor: colors.cardBackground, borderColor: colors.buttonBackground }]}>
              <View style={styles.ownerHeader}>
                <View style={[styles.ownerAvatar, { backgroundColor: colors.buttonBackground }]}>
                  <User size={24} color={colors.buttonText} />
                </View>
              </View>

              <View style={styles.contactMethodsContainer}>
                {contactPhone1 && (
                  <TouchableOpacity 
                    style={[styles.contactMethodButton, { backgroundColor: colors.buttonBackground }]} 
                    onPress={() => handleCall(contactPhone1)}
                  >
                    <Phone size={18} color={colors.buttonText} />
                    <Text style={[styles.contactMethodText, { color: colors.buttonText }]}>{contactPhone1}</Text>
                  </TouchableOpacity>
                )}
                
                {contactPhone2 && (
                  <TouchableOpacity 
                    style={[styles.contactMethodButton, { backgroundColor: colors.buttonBackground }]} 
                    onPress={() => handleCall(contactPhone2)}
                  >
                    <Phone size={18} color={colors.buttonText} />
                    <Text style={[styles.contactMethodText, { color: colors.buttonText }]}>{contactPhone2}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.contactNote, { color: colors.placeholder }]}>
                💡 Contact the owner directly for inquiries or special requests
              </Text>
            </View>
          )}

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
             <View style={styles.timingRow}>
               <Clock size={18} color={colors.buttonBackground} />
               <View style={styles.timingInfo}>
                 <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-in</Text>
                 <Text style={[styles.timingValue, { color: colors.text }]}>2:00 PM</Text>
               </View>
             </View>
             <View style={[styles.timingDivider, { backgroundColor: colors.border }]} />
             <View style={styles.timingRow}>
               <Clock size={18} color={colors.buttonBackground} />
               <View style={styles.timingInfo}>
                 <Text style={[styles.timingLabel, { color: colors.placeholder }]}>Check-out</Text>
                 <Text style={[styles.timingValue, { color: colors.text }]}>12:00 PM</Text>
                 <Text style={[styles.timingNote, { color: colors.placeholder }]}>
                   (6:00 PM same day for day-use)
                 </Text>
               </View>
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
              <Text style={[styles.extraGuestText, { color: colors.text }]}>Charge for each extra guest (above {farmhouse.capacity}):</Text>
              <Text style={[styles.extraGuestPrice, { color: colors.buttonBackground }]}>₹{extraGuestPrice}</Text>
            </View>
          </View>

          <View style={[styles.calendarCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Dates</Text>
            <Text style={[styles.calendarInstruction, { color: colors.placeholder }]}>
              Tap a date for day use, or two dates for an overnight stay. (Max 3 weeks from today)
            </Text>
            
            <View style={[styles.guestSelector, { borderColor: colors.border }]}>
              <View style={styles.guestInfoContainer}>
                <Text style={[styles.guestLabel, { color: colors.text }]}>Number of Guests</Text>
                <Text style={[styles.guestSubLabel, { color: colors.placeholder }]}>Capacity: {farmhouse.capacity}</Text>
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
                  style={[styles.guestButton, { backgroundColor: colors.buttonBackground }]} 
                  onPress={() => updateGuestCount((guestCount + 1).toString())}
                >
                  <Text style={[styles.guestButtonText, { color: colors.buttonText }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Calendar
              markedDates={getMarkedDates()}
              onDayPress={handleDateSelect}
              minDate={getMinimumDate()}
              maxDate={getMaximumDate()}
              markingType={'period'}
              theme={{
                backgroundColor: colors.cardBackground,
                calendarBackground: colors.cardBackground,
                textSectionTitleColor: colors.text,
                dayTextColor: colors.text,
                todayTextColor: colors.buttonBackground,
                monthTextColor: colors.text,
                arrowColor: colors.buttonBackground,
                textDisabledColor: '#999999',
              }}
            />

            {selectedDates.start && selectedDates.end && (
              <View style={[styles.bookingSummary, { backgroundColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)', borderColor: '#14B8A6' }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Total ({getBookingType() === 'day-use' ? 'Day Use' : `${calculateNights()} ${calculateNights() === 1 ? 'night' : 'nights'}`}):</Text>
                  <Text style={[styles.totalValue, { color: '#14B8A6' }]}>₹{calculateTotalPrice()}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <TouchableOpacity 
              onPress={openGoogleMaps} 
              activeOpacity={0.8}
              style={[styles.mapContainer, { borderColor: colors.border }]}
            >
              {farmhouse.coordinates ? (
                <View style={styles.mapWrapper}>
                  <MapView 
                    style={styles.map} 
                    initialRegion={{ 
                      latitude: farmhouse.coordinates.latitude, 
                      longitude: farmhouse.coordinates.longitude, 
                      latitudeDelta: 0.01, 
                      longitudeDelta: 0.01 
                    }} 
                    scrollEnabled={false} 
                    zoomEnabled={false}
                    pointerEvents="none"
                  >
                    <Marker coordinate={farmhouse.coordinates} title={farmhouse.name} />
                  </MapView>
                  <View style={[styles.mapOverlay, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                    <Navigation size={20} color={colors.buttonBackground} />
                    <Text style={[styles.mapOverlayText, { color: colors.buttonBackground }]}>Open in Google Maps</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.mapPlaceholder, { backgroundColor: colors.cardBackground }]}>
                  <MapPin size={32} color={colors.buttonBackground} />
                  <Text style={[styles.mapPlaceholderText, { color: colors.text }]}>{farmhouse.location}</Text>
                  <View style={styles.mapPlaceholderButton}>
                    <Navigation size={16} color={colors.buttonBackground} />
                    <Text style={[styles.mapPlaceholderButtonText, { color: colors.buttonBackground }]}>Open in Google Maps</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
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
              />
            )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainScroll: { flex: 1 },
  imageSection: { position: 'relative', height: 300 },
  image: { width, height: 300 },
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
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  location: { fontSize: 16 },
  ownerCard: { marginTop: 20, padding: 20, borderRadius: 16, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  ownerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  ownerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  contactMethodsContainer: { gap: 10, marginBottom: 12 },
  contactMethodButton: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  contactMethodText: { fontSize: 15, fontWeight: '600', flex: 1 },
  contactNote: { fontSize: 12, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  quickInfo: { flexDirection: 'row', gap: 12, marginTop: 20 },
  infoCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  timingCard: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timingInfo: { flex: 1 },
  timingLabel: { fontSize: 12, marginBottom: 4 },
  timingValue: { fontSize: 16, fontWeight: '600' },
  timingNote: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  timingDivider: { height: 1, marginVertical: 12 },
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
  mapContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  mapWrapper: { position: 'relative' },
  map: { width: '100%', height: 200 },
  mapOverlay: { position: 'absolute', bottom: 16, left: '50%', transform: [{ translateX: -90 }], flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  mapOverlayText: { fontSize: 14, fontWeight: '600' },
  mapPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { fontSize: 16, fontWeight: '600' },
  mapPlaceholderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  mapPlaceholderButtonText: { fontSize: 14, fontWeight: '600' },
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