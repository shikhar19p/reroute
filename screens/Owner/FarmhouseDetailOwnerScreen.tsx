import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Edit, MapPin, Users, Home, Star, Plus, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import LocationMapView from '../../components/LocationMapView';
import { useTheme } from '../../context/ThemeContext';
import { Farmhouse } from '../../services/farmhouseService';
import { useDialog } from '../../components/CustomDialog';
import { getStatusColor, getStatusText } from '../../utils/statusColors';
import { useMyFarmhouses } from '../../GlobalDataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MyFarmhouses: undefined;
  FarmhouseDetailOwner: { farmhouseId: string };
  EditFarmhouse: { farmhouse: Farmhouse };
};

type Props = NativeStackScreenProps<RootStackParamList, 'FarmhouseDetailOwner'>;

export default function FarmhouseDetailOwnerScreen({ route, navigation }: Props) {
  const { farmhouseId } = route.params;
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const { data: myFarmhouses, loading, refreshing, refresh: onRefresh } = useMyFarmhouses();
  const farmhouse = myFarmhouses.find(f => f.id === farmhouseId) || null;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAddSpecialDate, setShowAddSpecialDate] = useState(false);
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDatePrice, setNewDatePrice] = useState('');
  const [savingSpecialDate, setSavingSpecialDate] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    const formatted = `${day} ${MONTH_SHORT[selected.getMonth()]} ${selected.getFullYear()}`;
    setNewDateLabel(formatted);
    setCalendarVisible(false);
  };

  const saveSpecialDate = async () => {
    if (!newDateLabel || !newDatePrice || !farmhouse) return;
    setSavingSpecialDate(true);
    try {
      const existing = farmhouse.customPricing || [];
      const newEntry = { name: newDateLabel, price: parseInt(newDatePrice) || 0 };
      const updated = [...existing.map(cp => ({ name: cp.label, price: cp.price })), newEntry];
      await updateDoc(doc(db, 'farmhouses', farmhouse.id), {
        'pricing.customPricing': updated,
      });
      setNewDateLabel('');
      setNewDatePrice('');
      setShowAddSpecialDate(false);
    } catch (e) {
      console.error('Failed to save special date:', e);
    } finally {
      setSavingSpecialDate(false);
    }
  };

  const removeSpecialDate = async (index: number) => {
    if (!farmhouse) return;
    const existing = farmhouse.customPricing || [];
    const updated = existing
      .filter((_, i) => i !== index)
      .map(cp => ({ name: cp.label, price: cp.price }));
    try {
      await updateDoc(doc(db, 'farmhouses', farmhouse.id), {
        'pricing.customPricing': updated,
      });
    } catch (e) {
      console.error('Failed to remove special date:', e);
    }
  };

  const renderCalendarModal = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return (
      <Modal visible={calendarVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.calModalOverlay} activeOpacity={1} onPress={() => setCalendarVisible(false)}>
          <View style={[styles.calModalBox, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => setCalendarViewDate(new Date(year, month - 1, 1))}>
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.calMonthTitle, { color: colors.text }]}>
                {MONTH_SHORT[month]} {year}
              </Text>
              <TouchableOpacity onPress={() => setCalendarViewDate(new Date(year, month + 1, 1))}>
                <ChevronRight size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.calDayRow}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <Text key={i} style={[styles.calDayLabel, { color: colors.placeholder }]}>{d}</Text>
              ))}
            </View>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.calDayRow}>
                {row.map((day, di) => (
                  <TouchableOpacity
                    key={di}
                    style={[styles.calDayCell, day ? { backgroundColor: colors.buttonBackground + '15' } : {}]}
                    onPress={() => day && handleDateSelect(day)}
                    disabled={!day}
                  >
                    <Text style={[styles.calDayNum, { color: day ? colors.text : 'transparent' }]}>{day || ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };


  const amenitiesList = useMemo(() => {
    if (!farmhouse) return [];
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
  }, [farmhouse?.amenities]);

  const rulesList = useMemo(() => {
    if (!farmhouse) return [];
    const rules = farmhouse.rules as any;
    const list: string[] = [];
    if (rules.pets) list.push('Pets allowed');
    else list.push('No pets allowed');
    if (rules.alcohol === false || rules.alcoholNotAllowed === true) list.push('No alcohol allowed');
    if (rules.additionalRules) list.push(rules.additionalRules);
    return list;
  }, [farmhouse?.rules]);

  const handleEdit = () => {
    if (farmhouse) {
      navigation.navigate('EditFarmhouse', { farmhouse });
    }
  };

  const goToBookings = () => {
    (navigation as any).navigate('OwnerBookings', { farmhouseId });
  };

  const goToBlockedDates = () => {
    (navigation as any).navigate('ManageBlockedDates', { farmhouseId });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  if (!farmhouse) {
    return null;
  }

  const images = farmhouse.photos || [];
  const mainImage = images[0] || 'https://via.placeholder.com/400x300';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 24 }}
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
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.floor(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {images.length}
            </Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Edit size={22} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header with Status */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: colors.text }]}>{farmhouse.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(farmhouse.status) }]}>
                <Text style={styles.statusText}>{getStatusText(farmhouse.status)}</Text>
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Star size={16} color="#FCD34D" fill="#FCD34D" />
              <Text style={[styles.rating, { color: colors.text }]}>
                {farmhouse.rating || '4.5'}
              </Text>
              <Text style={[styles.reviews, { color: colors.placeholder }]}>
                ({farmhouse.reviews || 0} reviews)
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={18} color={colors.placeholder} />
            <Text style={[styles.location, { color: colors.placeholder }]}>
              {farmhouse.location}
            </Text>
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Users size={20} color={colors.buttonBackground} />
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Capacity</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{farmhouse.capacity}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Home size={20} color={colors.buttonBackground} />
              <Text style={[styles.infoLabel, { color: colors.placeholder }]}>Bedrooms</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{farmhouse.bedrooms}</Text>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.description, { color: colors.placeholder }]}>
              {farmhouse.description}
            </Text>
          </View>

        {/* Pricing Information */}
        <View style={[styles.pricingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing Information</Text>

            {/* Weekday Rates */}
            <Text style={[styles.priceCategoryTitle, { color: colors.text }]}>Weekday Rates</Text>
            <View style={styles.priceGrid}>
              <View style={styles.priceBox}>
                <Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Day Use</Text>
                <Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weeklyDay}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Night Stay</Text>
                <Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weeklyNight}</Text>
              </View>
            </View>

            {/* Weekend Rates */}
            <Text style={[styles.priceCategoryTitle, { color: colors.text, marginTop: 16 }]}>Weekend Rates</Text>
            <View style={styles.priceGrid}>
              <View style={styles.priceBox}>
                <Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Day Use</Text>
                <Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weekendDay}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={[styles.priceBoxLabel, { color: colors.placeholder }]}>Night Stay</Text>
                <Text style={[styles.priceBoxValue, { color: colors.text }]}>₹{farmhouse.weekendNight}</Text>
              </View>
            </View>

            {/* Custom Pricing */}
            <View style={styles.specialOccasionsHeader}>
              <Text style={[styles.priceCategoryTitle, { color: colors.text, marginTop: 16 }]}>Special Occasions</Text>
              <TouchableOpacity
                style={[styles.addSpecialBtn, { backgroundColor: colors.buttonBackground }]}
                onPress={() => setShowAddSpecialDate(v => !v)}
              >
                <Plus size={14} color={colors.buttonText} />
                <Text style={[styles.addSpecialBtnText, { color: colors.buttonText }]}>Add</Text>
              </TouchableOpacity>
            </View>

            {farmhouse.customPricing && farmhouse.customPricing.map((custom, index) => (
              <View key={index} style={[styles.customPriceRow, { borderColor: colors.border }]}>
                <Text style={[styles.customPriceLabel, { color: colors.text }]}>{custom.label}</Text>
                <View style={styles.customPriceRight}>
                  <Text style={[styles.customPriceValue, { color: colors.buttonBackground }]}>₹{custom.price}</Text>
                  <TouchableOpacity onPress={() => removeSpecialDate(index)} style={styles.removeSpecialBtn}>
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {showAddSpecialDate && (
              <View style={[styles.addSpecialForm, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => { setCalendarViewDate(new Date()); setCalendarVisible(true); }}
                >
                  <Calendar size={14} color={newDateLabel ? colors.text : colors.placeholder} />
                  <Text style={[styles.datePickerText, { color: newDateLabel ? colors.text : colors.placeholder }]}>
                    {newDateLabel || 'Select date'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.addSpecialRow}>
                  <TextInput
                    style={[styles.specialPriceInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    value={newDatePrice}
                    onChangeText={(t) => setNewDatePrice(t.replace(/[^0-9]/g, ''))}
                    placeholder="₹ Price"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={[styles.saveSpecialBtn, { backgroundColor: !newDateLabel || !newDatePrice ? colors.border : colors.buttonBackground, opacity: savingSpecialDate ? 0.6 : 1 }]}
                    onPress={saveSpecialDate}
                    disabled={!newDateLabel || !newDatePrice || savingSpecialDate}
                  >
                    {savingSpecialDate
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: colors.buttonText, fontWeight: '600', fontSize: 13 }}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {renderCalendarModal()}
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {amenitiesList.map((amenity, index) => (
                <View
                  key={index}
                  style={[styles.amenityChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Location Map */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <LocationMapView
              location={farmhouse.location}
              mapLink={farmhouse.mapLink}
            />
          </View>

          {/* House Rules */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>House Rules</Text>
            {rulesList.map((rule, idx) => (
              <Text key={idx} style={[styles.ruleText, { color: colors.placeholder }]}>
                • {rule}
              </Text>
            ))}
          </View>

        </View>

        {/* Owner Quick Actions (no title) */}
        <View style={[styles.section, { gap: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.actionButtonOwner, { backgroundColor: colors.buttonBackground }]} onPress={goToBookings}>
              <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>View Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonOwner, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }]} onPress={goToBlockedDates}>
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Manage Blocked Dates</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    position: 'relative',
    height: 300,
  },
  image: {
    width,
    height: 300,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  topActions: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviews: {
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  location: {
    fontSize: 16,
  },
  quickInfo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timingCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timingInfo: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timingDivider: {
    height: 1,
    marginVertical: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  pricingCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceBox: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(2,68,77,0.05)',
    alignItems: 'center',
  },
  priceBoxLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  priceBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceBoxSub: {
    fontSize: 11,
  },
  actionButtonOwner: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '800',
  },
  specialOccasionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  addSpecialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addSpecialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customPriceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeSpecialBtn: {
    padding: 4,
  },
  addSpecialForm: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerText: {
    fontSize: 14,
  },
  addSpecialRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  specialPriceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveSpecialBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calModalBox: {
    borderRadius: 16,
    padding: 16,
    width: 300,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calDayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDayNum: {
    fontSize: 14,
  },
  customPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(2,68,77,0.03)',
    marginBottom: 8,
  },
  customPriceLabel: {
    fontSize: 14,
    flex: 1,
  },
  customPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 14,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  ruleText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  bottomLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  bottomPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
