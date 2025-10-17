import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  Share,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { getApprovedFarmhouses, Farmhouse as FarmhouseType } from '../../services/farmhouseService';

const { width, height } = Dimensions.get('window');

interface Farmhouse {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  amenities: string[];
  capacity: number;
  rooms: number;
  description: string;
  images: string[];
  weekendPrice: number;
  specialDates: { date: string; price: number }[];
  extraGuestPrice: number;
  coordinates: { latitude: number; longitude: number };
  rules: string[];
  terms: string[];
  bookedDates: string[];
}

type RootStackParamList = {
  FarmhouseDetail: { farmhouse: Farmhouse };
};

type Props = NativeStackScreenProps<RootStackParamList>;

export default function ExploreScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
  });
  const [farmhouses, setFarmhouses] = useState<FarmhouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadFarmhouses();
  }, []);

  const loadFarmhouses = async () => {
    try {
      setLoading(true);
      console.log('📍 Loading farmhouses from Firebase...');
      const data = await getApprovedFarmhouses();
      console.log(`✅ Loaded ${data.length} farmhouses:`, data.map(f => f.name));
      setFarmhouses(data);
    } catch (error) {
      console.error('❌ Error loading farmhouses:', error);
      Alert.alert('Error', 'Could not load farmhouses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFarmhouses();
    setRefreshing(false);
  };

  const toggleWishlist = (id: string) => {
    if (isInWishlist(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(id);
    }
  };

  const handleShare = async (farmhouse: Farmhouse) => {
    try {
      await Share.share({
        message: `Check out ${farmhouse.name} in ${farmhouse.location}! Starting from ₹${farmhouse.price}/night. Book now!`,
        title: farmhouse.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share farmhouse');
    }
  };

  const filteredAndSortedFarmhouses = useMemo(() => {
    let result = [...farmhouses];

    if (searchText) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(searchText.toLowerCase()) ||
        f.location.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filters.location) {
      result = result.filter(f =>
        f.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.minPrice) {
      result = result.filter(f => f.price >= parseInt(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(f => f.price <= parseInt(filters.maxPrice));
    }

    if (filters.minCapacity) {
      result = result.filter(f => f.capacity >= parseInt(filters.minCapacity));
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'capacity-low':
        result.sort((a, b) => a.capacity - b.capacity);
        break;
      case 'capacity-high':
        result.sort((a, b) => b.capacity - a.capacity);
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    return result;
  }, [searchText, filters, sortBy, farmhouses]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderCarouselItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={styles.carouselCard}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
      activeOpacity={0.95}
    >
      <Image
        source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }}
        style={styles.carouselImage}
      />
      <LinearGradient
        colors={colors.overlayGradient}
        style={styles.carouselOverlay}
      >
        <View style={styles.carouselContent}>
          <View style={styles.featuredBadge}>
            <MaterialCommunityIcons name="star" size={14} color={colors.primary} />
            <Text style={[styles.featuredText, { fontFamily: typography.fontFamily.semiBold }]}>
              Featured
            </Text>
          </View>
          <Text style={[styles.carouselTitle, { fontFamily: typography.fontFamily.bold }]}>
            {item.name}
          </Text>
          <View style={styles.carouselMeta}>
            <MaterialCommunityIcons name="map-marker" size={16} color="white" />
            <Text style={[styles.carouselLocation, { fontFamily: typography.fontFamily.regular }]}>
              {item.location}
            </Text>
          </View>
          <View style={styles.carouselPrice}>
            <Text style={[styles.priceLabel, { fontFamily: typography.fontFamily.regular }]}>
              Starting from
            </Text>
            <Text style={[styles.priceAmount, { fontFamily: typography.fontFamily.bold }]}>
              ₹{item.price}
            </Text>
            <Text style={[styles.priceNight, { fontFamily: typography.fontFamily.regular }]}>
              /night
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSkeletonCard = () => (
    <View style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[styles.propertyImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <View style={styles.propertyDetails}>
        <View style={{ width: '70%', height: 20, marginBottom: 8, borderRadius: 4, backgroundColor: colors.border }} />
        <View style={{ width: '50%', height: 16, marginBottom: 8, borderRadius: 4, backgroundColor: colors.border }} />
        <View style={{ width: '40%', height: 18, borderRadius: 4, backgroundColor: colors.border }} />
      </View>
    </View>
  );

  const renderFarmhouse = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, ...shadows.md }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }} style={styles.propertyImage} />

        <View style={styles.imageActions}>
          <TouchableOpacity
            onPress={() => handleShare(item)}
            style={[styles.actionButton, { ...shadows.sm }]}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleWishlist(item.id)}
            style={[styles.actionButton, { ...shadows.sm }]}
          >
            <MaterialCommunityIcons
              name={isInWishlist(item.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={isInWishlist(item.id) ? colors.favorite : colors.text}
            />
          </TouchableOpacity>
        </View>

        {(item.rating > 0) && (
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="star" size={14} color="white" />
            <Text style={[styles.ratingText, { fontFamily: typography.fontFamily.semiBold }]}>
              {item.rating}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.propertyDetails}>
        <Text style={[styles.propertyTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
          {item.name}
        </Text>

        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
          <Text style={[styles.distance, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {item.location}
          </Text>
        </View>

        <View style={styles.amenitiesRow}>
          <View style={styles.amenityItem}>
            <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
            <Text style={[styles.amenityText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {item.capacity} guests
            </Text>
          </View>
          {item.rooms > 0 && (
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="bed" size={16} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {item.rooms} rooms
              </Text>
            </View>
          )}
        </View>

        <View style={styles.priceCapacityRow}>
          <View>
            <Text style={[styles.price, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>
              ₹{item.price}
            </Text>
            <Text style={[styles.perNight, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
              per night
            </Text>
          </View>
          <TouchableOpacity style={[styles.bookButton, { backgroundColor: colors.primary, ...shadows.sm }]}>
            <Text style={[styles.bookButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            {user?.displayName || 'User'}!
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: colors.errorLight, ...shadows.sm }]}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Carousel */}
        {loading ? (
          <View style={styles.carouselContainer}>
            <View style={[styles.carouselSkeleton, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        ) : farmhouses.length > 0 ? (
          <View style={styles.carouselContainer}>
            <FlatList
              data={farmhouses.slice(0, 5)}
              renderItem={renderCarouselItem}
              keyExtractor={(item) => `carousel-${item.id}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
                setCurrentSlide(index);
              }}
              snapToAlignment="center"
              decelerationRate="fast"
            />
            <View style={styles.pagination}>
              {farmhouses.slice(0, 5).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor: currentSlide === index ? colors.primary : 'rgba(255,255,255,0.5)',
                      width: currentSlide === index ? 24 : 8,
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border, ...shadows.sm }]}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontFamily: typography.fontFamily.regular }]}
              placeholder="Search farmhouses..."
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, ...shadows.sm }]}
              onPress={() => setShowSortModal(true)}
            >
              <MaterialCommunityIcons name="sort" size={20} color={colors.text} />
              <Text style={[styles.filterButtonText, { color: colors.text, fontFamily: typography.fontFamily.medium }]}>
                Sort
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, ...shadows.sm }]}
              onPress={() => setShowFilterModal(true)}
            >
              <MaterialCommunityIcons name="filter-variant" size={20} color={colors.text} />
              <Text style={[styles.filterButtonText, { color: colors.text, fontFamily: typography.fontFamily.medium }]}>
                Filter
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Properties List */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            Available Properties
          </Text>
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <View key={i}>{renderSkeletonCard()}</View>
              ))}
            </>
          ) : filteredAndSortedFarmhouses.length > 0 ? (
            filteredAndSortedFarmhouses.map((item) => (
              <View key={item.id}>{renderFarmhouse({ item })}</View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="home-search" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                No farmhouses found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
                Try adjusting your filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderRadius: borderRadius.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
                Sort By
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Name (A-Z)', value: 'name', icon: 'sort-alphabetical-ascending' },
              { label: 'Price: Low to High', value: 'price-low', icon: 'currency-inr' },
              { label: 'Price: High to Low', value: 'price-high', icon: 'currency-inr' },
              { label: 'Capacity: Low to High', value: 'capacity-low', icon: 'account-group' },
              { label: 'Capacity: High to Low', value: 'capacity-high', icon: 'account-group' },
              { label: 'Rating', value: 'rating', icon: 'star' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  sortBy === option.value && { backgroundColor: colors.primaryLight }
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={20}
                  color={sortBy === option.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.modalOptionText,
                  { color: sortBy === option.value ? colors.primary : colors.text, fontFamily: typography.fontFamily.medium }
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
          <ScrollView style={[styles.filterModalContent, { backgroundColor: colors.cardBackground, borderRadius: borderRadius.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
                Filters
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterLabelContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color={colors.text} />
              <Text style={[styles.filterLabel, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                Location
              </Text>
            </View>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, fontFamily: typography.fontFamily.regular }]}
              placeholder="e.g. Bangalore"
              placeholderTextColor={colors.textTertiary}
              value={filters.location}
              onChangeText={(text) => setFilters({...filters, location: text})}
            />

            <View style={styles.filterLabelContainer}>
              <MaterialCommunityIcons name="currency-inr" size={16} color={colors.text} />
              <Text style={[styles.filterLabel, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                Price Range
              </Text>
            </View>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.filterInputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, fontFamily: typography.fontFamily.regular }]}
                placeholder="Min"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={(text) => setFilters({...filters, minPrice: text})}
              />
              <TextInput
                style={[styles.filterInputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, fontFamily: typography.fontFamily.regular }]}
                placeholder="Max"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(text) => setFilters({...filters, maxPrice: text})}
              />
            </View>

            <View style={styles.filterLabelContainer}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.text} />
              <Text style={[styles.filterLabel, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                Minimum Capacity
              </Text>
            </View>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, fontFamily: typography.fontFamily.regular }]}
              placeholder="e.g. 15"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={filters.minCapacity}
              onChangeText={(text) => setFilters({...filters, minCapacity: text})}
            />

            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setFilters({ location: '', minPrice: '', maxPrice: '', minCapacity: '' });
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.text} />
                <Text style={[styles.filterButtonTextModal, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary, ...shadows.md }]}
                onPress={() => setShowFilterModal(false)}
              >
                <MaterialCommunityIcons name="check" size={20} color="white" />
                <Text style={[styles.filterButtonTextModal, { color: 'white', fontFamily: typography.fontFamily.semiBold }]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  userInfo: { flex: 1 },
  greeting: { fontSize: 14, marginBottom: 2 },
  userName: { fontSize: 22, letterSpacing: 0.3 },
  logoutButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  carouselContainer: { marginBottom: 20, paddingHorizontal: 16 },
  carouselCard: { width: width - 32, height: 240, borderRadius: 20, overflow: 'hidden', marginRight: 0 },
  carouselImage: { width: '100%', height: '100%' },
  carouselOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20 },
  carouselContent: { },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
  featuredText: { fontSize: 12, color: '#D4AF37', marginLeft: 4 },
  carouselTitle: { fontSize: 24, color: 'white', marginBottom: 6 },
  carouselMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  carouselLocation: { fontSize: 14, color: 'white', marginLeft: 4, opacity: 0.9 },
  carouselPrice: { flexDirection: 'row', alignItems: 'baseline' },
  priceLabel: { fontSize: 12, color: 'white', opacity: 0.8, marginRight: 6 },
  priceAmount: { fontSize: 28, color: 'white' },
  priceNight: { fontSize: 14, color: 'white', opacity: 0.8, marginLeft: 2 },
  carouselSkeleton: { width: width - 32, height: 240, borderRadius: 20 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
  paginationDot: { height: 8, borderRadius: 4, transition: 'all 0.3s' },
  searchSection: { paddingHorizontal: 16, marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  filterButtonText: { fontSize: 14 },
  listSection: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: 20, marginBottom: 16 },
  propertyCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1 },
  imageContainer: { position: 'relative' },
  propertyImage: { width: '100%', height: 220 },
  imageActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ratingBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  ratingText: { fontSize: 13, color: 'white' },
  propertyDetails: { padding: 16 },
  propertyTitle: { fontSize: 18, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  distance: { fontSize: 14 },
  amenitiesRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amenityText: { fontSize: 13 },
  priceCapacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 22 },
  perNight: { fontSize: 12, marginTop: 2 },
  bookButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bookButtonText: { color: 'white', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { padding: 24, maxHeight: '70%' },
  filterModalContent: { padding: 24, maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 16 },
  filterLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 15, marginTop: 16, marginBottom: 8 },
  filterInput: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  priceRow: { flexDirection: 'row', gap: 12 },
  filterInputHalf: { flex: 1, height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  filterButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 },
  clearButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
  applyButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
  filterButtonTextModal: { fontSize: 16 },
});
