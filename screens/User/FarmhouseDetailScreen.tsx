import React, { useState, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, Linking, Alert, Share, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Users, Home, Star, Clock, Share2 } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
// Corrected imports to use the definitive types from navigation
import { RootStackScreenProps, Farmhouse } from '../../types/navigation';

const { width } = Dimensions.get('window');

// This can be replaced with fetched data later
interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
}

type Props = RootStackScreenProps<'FarmhouseDetail'>;

const SAMPLE_REVIEWS: Review[] = [
  { id: '1', userName: 'Priya Sharma', rating: 5, date: '2 weeks ago', comment: 'Absolutely loved this place! The pool was amazing and the host was very accommodating. Perfect for a family weekend getaway.' },
  { id: '2', userName: 'Rahul Mehta', rating: 4, date: '1 month ago', comment: 'Great farmhouse with all amenities. The bonfire area was fantastic. Only issue was the WiFi was a bit slow, but overall excellent experience.' },
];

export default function FarmhouseDetailScreen({ route, navigation }: Props) {
  const { farmhouse } = route.params;
  const { colors, isDark } = useTheme();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<{ start?: string; end?: string }>({});
  const [guestCount, setGuestCount] = useState(farmhouse.capacity);
  const [guestInputValue, setGuestInputValue] = useState(farmhouse.capacity.toString());
  const [showPricingInfo, setShowPricingInfo] = useState<'overnight' | 'day-use'>('overnight');

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
  // Combined both booked and owner-blocked dates for availability
  const unavailableDates: string[] = [...new Set([...(farmhouse.blockedDates || []), ...(farmhouse.bookedDates || [])])];
  const specialDates = farmhouse.customPricing?.map(p => ({ date: p.label, price: p.price })) || [];
  const extraGuestPrice = farmhouse.extraGuestPrice || 500;

  const rulesList = useMemo(() => {
    const rules = farmhouse.rules;
    if (!rules) return ['House rules will be provided by the owner.'];
    const list: string[] = [];
    if (!rules.unmarriedCouples) list.push('Unmarried couples not allowed');
    else list.push('Unmarried couples are welcome');
    if (rules.pets) list.push('Pets allowed');
    else list.push('No pets allowed');
    if (rules.quietHours) list.push('Quiet hours enforced');
    return list;
  }, [farmhouse.rules]);

  const terms = [
    '50% advance payment required at booking',
    'Cancellation 48 hours before check-in for full refund',
    'No refund for cancellations within 48 hours',
    'Property damage will be charged separately',
    'Check-in: 2 PM, Check-out: 12 PM'
  ];

  const updateGuestCount = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(1, Math.min(50, numValue));
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
      await Share.share({
        message: `Check out ${farmhouse.name} in ${farmhouse.location}! Starting from ₹${farmhouse.weeklyNight}/night.`,
        title: farmhouse.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share farmhouse');
    }
  };

  const getMinimumDate = () => {
    const now = new Date();
    // Allow same-day booking only before noon
    if (now.getHours() < 12) {
      return now.toISOString().split('T')[0];
    }
    // Otherwise, booking starts from tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaximumDate = () => {
    const now = new Date();
    // Set booking window to 3 months
    now.setMonth(now.getMonth() + 3);
    return now.toISOString().split('T')[0];
  };

  const isDateBooked = (dateString: string) => unavailableDates.includes(dateString);

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    // Weekends are Saturday and Sunday
    return day === 0 || day === 6;
  };

  const getSpecialPrice = (dateString: string) => {
    const special = specialDates.find(s => s.date === dateString);
    return special ? special.price : null;
  };

  const getPriceForDate = (dateString: string) => {
    const specialPrice = getSpecialPrice(dateString);
    if (specialPrice) return specialPrice;
    return isWeekend(dateString) ? farmhouse.weekendNight : farmhouse.weeklyNight;
  };

  const getDayUsePrice = (dateString: string) => {
    const specialPrice = getSpecialPrice(dateString);
    if (specialPrice) return Math.floor(specialPrice * 0.6); // 60% of special price for day use
    const basePrice = isWeekend(dateString) ? farmhouse.weekendNight : farmhouse.weeklyNight;
    return Math.floor(basePrice * 0.6); // 60% of regular price for day use
  };

  const handleDateSelect = (day: DateData) => {
    const dateString = day.dateString;
    if (isDateBooked(dateString)) {
      Alert.alert('Unavailable', 'This date is already booked or blocked.');
      return;
    }

    if (!selectedDates.start) {
      // First tap: select start and end as the same day
      setSelectedDates({ start: dateString, end: dateString });
    } else if (selectedDates.start && selectedDates.start === selectedDates.end) {
      // Second tap
      if (dateString === selectedDates.start) {
        // Tapping the same day again deselects it
        setSelectedDates({});
      } else if (dateString < selectedDates.start) {
        // Tapping a day before the start date resets the selection
        setSelectedDates({ start: dateString, end: dateString });
      } else {
        // Tapping a day after creates a range
        setSelectedDates({ start: selectedDates.start, end: dateString });
      }
    } else {
      // A range is already selected, so reset to a new single day
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
          container: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
          text: { color: '#EF4444', fontWeight: '600' }
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
          Alert.alert("Invalid Range", "Your selection includes an unavailable date. Please choose a different end date.");
          setSelectedDates({ start: selectedDates.start, end: selectedDates.start });
          return marked; // Return immediately to prevent marking an invalid range
        }
        
        if (!marked[dateString]) { // Do not overwrite disabled dates
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
      Alert.alert('Select Dates', 'Please select your desired dates on the calendar.');
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
        url = `http://googleusercontent.com/maps.google.com/8{farmhouse.coordinates.latitude},${farmhouse.coordinates.longitude}`;
    } else {
        Alert.alert("Location not available", "Map link or coordinates are not available for this farmhouse.");
        return;
    }
    Linking.canOpenURL(url).then(supported => {
        if (supported) Linking.openURL(url);
        else Alert.alert('Error', `Could not open the map link.`);
    }).catch(err => console.error('An error occurred opening the map', err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
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
              Tap a date for day use, or two dates for an overnight stay.
            </Text>
            
            <View style={[styles.guestSelector, { borderColor: colors.border }]}>
              <View style={styles.guestInfoContainer}><Text style={[styles.guestLabel, { color: colors.text }]}>Number of Guests</Text><Text style={[styles.guestSubLabel, { color: colors.placeholder }]}>Capacity: {farmhouse.capacity}</Text></View>
              <View style={styles.guestControls}>
                <TouchableOpacity style={[styles.guestButton, { backgroundColor: colors.buttonBackground, opacity: guestCount <= 1 ? 0.5 : 1 }]} onPress={() => updateGuestCount((guestCount - 1).toString())} disabled={guestCount <= 1}>
                  <Text style={[styles.guestButtonText, { color: colors.buttonText }]}>−</Text>
                </TouchableOpacity>
                <TextInput style={[styles.guestInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={guestInputValue} onChangeText={handleGuestInputChange} onBlur={handleGuestInputBlur} keyboardType="number-pad" maxLength={2} />
                <TouchableOpacity style={[styles.guestButton, { backgroundColor: colors.buttonBackground, opacity: guestCount >= 50 ? 0.5 : 1 }]} onPress={() => updateGuestCount((guestCount + 1).toString())} disabled={guestCount >= 50}>
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
            <TouchableOpacity onPress={openGoogleMaps} activeOpacity={0.8}>
              {farmhouse.coordinates ? (
                <MapView style={styles.map} initialRegion={{ latitude: farmhouse.coordinates.latitude, longitude: farmhouse.coordinates.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}>
                  <Marker coordinate={farmhouse.coordinates} title={farmhouse.name} />
                </MapView>
              ) : (
                <View style={[styles.map, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={[{ color: colors.text, fontSize: 16, marginBottom: 8 }]}>📍 {farmhouse.location}</Text>
                  <Text style={[{ color: colors.buttonBackground, fontSize: 14 }]}>Tap to open in Google Maps</Text>
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
  pricingNote: { fontSize: 12, marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
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
  calendarLegend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingVertical: 12, paddingHorizontal: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 4 },
  legendText: { fontSize: 12 },
  bookingSummary: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 16, fontWeight: 'bold' },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryDivider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  map: { width: '100%', height: 200, borderRadius: 12 },
  ruleText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  termText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  overallRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  overallRatingText: { fontSize: 18, fontWeight: 'bold' },
  totalReviews: { fontSize: 14 },
  reviewCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  reviewerName: { fontSize: 15, fontWeight: '600' },
  reviewDate: { fontSize: 12, marginTop: 2 },
  reviewRating: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, paddingBottom: 24 },
  bottomLabel: { fontSize: 12, marginBottom: 4 },
  bottomPrice: { fontSize: 22, fontWeight: 'bold' },
  priceQualifier: { fontSize: 14, fontWeight: 'normal' },
  bookButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  bookButtonText: { fontSize: 16, fontWeight: '600' },
});