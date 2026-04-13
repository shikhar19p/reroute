import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { ArrowLeft, Edit, MapPin, Users, Home, Star } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { getFarmhouseById, Farmhouse } from '../../services/farmhouseService';
import { useDialog } from '../../components/CustomDialog';
import { getStatusColor, getStatusText } from '../../utils/statusColors';

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
  const [farmhouse, setFarmhouse] = useState<Farmhouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadFarmhouse();
  }, [farmhouseId]);

  // Reload when screen regains focus to reflect edits
  useFocusEffect(
    useCallback(() => {
      loadFarmhouse();
    }, [farmhouseId])
  );

  const loadFarmhouse = async () => {
    try {
      setLoading(true);
      const data = await getFarmhouseById(farmhouseId);
      if (data) {
        setFarmhouse(data);
      } else {
        showDialog({
          title: 'Error',
          message: 'Farmhouse not found',
          type: 'error'
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading farmhouse:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to load farmhouse details',
        type: 'error'
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const amenitiesList = useMemo(() => {
    if (!farmhouse) return [];
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
  }, [farmhouse?.amenities]);

  const rulesList = useMemo(() => {
    if (!farmhouse) return [];
    const rules = farmhouse.rules;
    const list: string[] = [];
    if (!rules.unmarriedCouples) list.push('Unmarried couples not allowed');
    if (rules.pets) list.push('Pets allowed');
    if (!rules.pets) list.push('No pets allowed');
    if (rules.quietHours) list.push('Quiet hours enforced');
    return list;
  }, [farmhouse?.rules]);

  const handleEdit = () => {
    if (farmhouse) {
      navigation.navigate('EditFarmhouse', { farmhouse });
    }
  };

  const openGoogleMaps = () => {
    if (farmhouse?.mapLink) {
      const url = farmhouse.mapLink;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        Linking.openURL(url);
      } else {
        showDialog({
          title: 'Invalid URL',
          message: 'The map link is not a valid URL. It must start with http:// or https://.',
          type: 'error',
        });
      }
    }
  };

  const goToBookings = () => {
    navigation.navigate('OwnerBookings' as never, { farmhouseId } as never);
  };

  const goToBlockedDates = () => {
    navigation.navigate('ManageBlockedDates' as never, { farmhouseId } as never);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
            {farmhouse.customPricing && farmhouse.customPricing.length > 0 && (
              <>
                <Text style={[styles.priceCategoryTitle, { color: colors.text, marginTop: 16 }]}>Special Occasions</Text>
                {farmhouse.customPricing.map((custom, index) => (
                  <View key={index} style={[styles.customPriceRow, { borderColor: colors.border }]}>
                    <Text style={[styles.customPriceLabel, { color: colors.text }]}>{custom.label}</Text>
                    <Text style={[styles.customPriceValue, { color: colors.buttonBackground }]}>₹{custom.price}</Text>
                  </View>
                ))}
              </>
            )}
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
            <TouchableOpacity onPress={openGoogleMaps} activeOpacity={0.8}>
              <View
                style={[
                  styles.map,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderWidth: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MapPin size={16} color={colors.text} />
                  <Text style={[{ color: colors.text, fontSize: 15 }]}>{farmhouse.location}</Text>
                </View>
                <Text style={[{ color: colors.buttonBackground, fontSize: 14 }]}>
                  Tap to open in Google Maps
                </Text>
              </View>
            </TouchableOpacity>
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

          <View style={{ height: 100 }} />
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
