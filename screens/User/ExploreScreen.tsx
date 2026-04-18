import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Modal, TextInput, FlatList, Share, ActivityIndicator, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import AnimatedImage from '../../components/AnimatedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Search, SlidersHorizontal, ArrowUpDown, Bell, Share2, Star, MapPin, LogOut, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useDialog } from '../../components/CustomDialog';
import { Farmhouse as FarmhouseType } from '../../types/navigation';
import { useAvailableFarmhouses, useMyBookings } from '../../GlobalDataContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResponsivePadding, getResponsiveGap, isSmallDevice } from '../../utils/responsive';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Memoized Farmhouse Card Component for performance
const FarmhouseCard = React.memo(({
  item,
  colors,
  farmhouseRating,
  isInWishlist,
  onPress,
  onShare,
  onToggleWishlist
}: {
  item: FarmhouseType;
  colors: any;
  farmhouseRating: number | undefined;
  isInWishlist: boolean;
  onPress: () => void;
  onShare: () => void;
  onToggleWishlist: () => void;
}) => (
  <TouchableOpacity
    style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    onPress={onPress}
  >
    <View style={styles.imageContainer}>
      <AnimatedImage
        uri={item.photos?.[0] || ''}
        style={styles.propertyImage}
        resizeMode="cover"
      />

      <View style={styles.imageActions}>
        <TouchableOpacity
          onPress={onShare}
          style={styles.actionButton}
        >
          <Share2 size={18} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleWishlist}
          style={styles.actionButton}
        >
          <Heart
            size={18}
            color={isInWishlist ? colors.favorite : colors.placeholder}
            fill={isInWishlist ? colors.favorite : "transparent"}
          />
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.propertyDetails}>
      <View style={styles.titleRow}>
        <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.ratingContainer}>
          <Star size={14} color={colors.rating} fill={colors.rating} />
          <Text style={[styles.rating, { color: colors.text }]}>
            {farmhouseRating ? farmhouseRating.toFixed(1) : 'New'}
          </Text>
        </View>
      </View>
      <View style={[styles.propertyTypeBadge, { backgroundColor: item.propertyType === 'resort' ? '#7C3AED22' : '#16A34A22' }]}>
        <Text style={[styles.propertyTypeBadgeText, { color: item.propertyType === 'resort' ? '#7C3AED' : '#16A34A' }]}>
          {item.propertyType === 'resort' ? 'Resort' : 'Farmhouse'}
        </Text>
      </View>
      <View style={styles.locationChip}>
        <MapPin size={11} color={colors.placeholder} />
        <Text style={[styles.locationText, { color: colors.placeholder }]} numberOfLines={1}>
          {item.location}
        </Text>
      </View>
      <View style={styles.priceCapacityRow}>
        <Text style={[styles.price, { color: colors.buttonBackground }]}>
          ₹{item.weekendNight}/night
        </Text>
        <Text style={[styles.capacity, { color: colors.placeholder }]}>
          Up to {item.capacity} guests
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

const CONTENT_MAX_WIDTH = 1440;
const GRID_BREAKPOINTS = { md: 768, lg: 1200, xl: 1440 };

export default function ExploreScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();

  // Use the GlobalDataContext hook instead of local state
  const { data: farmhouses, loading, error, refreshing, refresh } = useAvailableFarmhouses();
  const { data: myBookings } = useMyBookings();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [clearedBefore, setClearedBefore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('notifications_cleared_at').then(val => {
      if (val) setClearedBefore(parseInt(val, 10));
    }).catch(() => {});
  }, []);

  // Responsive grid layout
  const numColumns = useMemo(() => {
    if (windowWidth > GRID_BREAKPOINTS.xl) return 4;
    if (windowWidth >= GRID_BREAKPOINTS.xl) return 3;
    if (windowWidth >= GRID_BREAKPOINTS.md) return 2;
    return 1;
  }, [windowWidth]);

  const isLargeScreen = windowWidth > GRID_BREAKPOINTS.lg;
  const hPad = isLargeScreen ? 32 : 16;
  const cardGap = numColumns > 1 ? 16 : 0;

  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
    propertyType: '' as '' | 'farmhouse' | 'resort',
  });
  const [farmhouseRatings, setFarmhouseRatings] = useState<Record<string, number>>({});

  // Fetch average ratings for all farmhouses — parallel fetches via Promise.all
  useEffect(() => {
    if (farmhouses.length === 0) return;

    const fetchRatings = async () => {
      const results = await Promise.all(
        farmhouses.map(async (farmhouse) => {
          try {
            const reviewsRef = collection(db, 'farmhouses', farmhouse.id, 'reviews');
            const reviewsSnapshot = await getDocs(reviewsRef);
            if (!reviewsSnapshot.empty) {
              let total = 0;
              reviewsSnapshot.forEach(doc => { total += doc.data().rating || 0; });
              return [farmhouse.id, total / reviewsSnapshot.size] as [string, number];
            }
          } catch (error) {
            console.error(`Error fetching ratings for ${farmhouse.id}:`, error);
          }
          return null;
        })
      );
      const ratingsMap: Record<string, number> = {};
      results.forEach(r => { if (r) ratingsMap[r[0]] = r[1]; });
      setFarmhouseRatings(ratingsMap);
    };

    fetchRatings();
  }, [farmhouses]);

  const toggleWishlist = async (farmhouse: FarmhouseType) => {
    if (isInWishlist(farmhouse.id)) {
      await removeFromWishlist(farmhouse.id);
    } else {
      await addToWishlist(farmhouse.id);
    }
  };

  const handleShare = async (farmhouse: FarmhouseType) => {
    try {
      const actualRating = farmhouseRatings[farmhouse.id];
      const ratingText = actualRating ? actualRating.toFixed(1) : 'New';
      
      const shareMessage = `${farmhouse.name}\n\n` +
        `Location: ${farmhouse.location}\n` +
        `Rating: ${ratingText}${actualRating ? '/5' : ''}\n` +
        `Capacity: Up to ${farmhouse.capacity} guests\n\n` +
        `Starting from Rs. ${farmhouse.weeklyNight}/night\n\n` +
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

  const handleNotifications = () => {
    setShowNotificationsModal(true);
  };

  const handleLogout = () => {
    showDialog({
      title: 'Logout',
      message: "You'll need to sign in again to continue.",
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ],
    });
  };

  const clearNotifications = () => {
    const now = Date.now();
    setClearedBefore(now);
    AsyncStorage.setItem('notifications_cleared_at', String(now)).catch(() => {});
    setShowNotificationsModal(false);
  };

  const notificationItems = useMemo(() => {
    return [...myBookings]
      .sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      })
      .filter(b => {
        const t = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return t > clearedBefore;
      })
      .slice(0, 20)
      .map(b => {
        const statusLabel =
          b.status === 'confirmed' ? 'Booking Confirmed' :
          b.status === 'cancelled' ? 'Booking Cancelled' :
          b.status === 'completed' ? 'Stay Completed' : 'Booking Pending';
        const statusColor =
          b.status === 'confirmed' ? '#10B981' :
          b.status === 'cancelled' ? '#EF4444' :
          b.status === 'completed' ? '#3B82F6' : '#F59E0B';
        const icon = b.status === 'cancelled' ? 'alert' : b.status === 'confirmed' || b.status === 'completed' ? 'check' : 'clock';
        return { ...b, statusLabel, statusColor, icon };
      });
  }, [myBookings, clearedBefore]);

  const filteredAndSortedFarmhouses = useMemo(() => {
    let result = [...farmhouses];

    if (searchText) {
      result = result.filter(f =>
        (f.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (f.location || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (f.city || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filters.location) {
      result = result.filter(f =>
        (f.location || '').toLowerCase().includes(filters.location.toLowerCase()) ||
        (f.city || '').toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.minPrice) {
      result = result.filter(f => f.weeklyNight >= parseInt(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(f => f.weeklyNight <= parseInt(filters.maxPrice));
    }

    if (filters.minCapacity) {
      result = result.filter(f => f.capacity >= parseInt(filters.minCapacity));
    }

    if (filters.propertyType) {
      result = result.filter(f => (f.propertyType || 'farmhouse') === filters.propertyType);
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.weeklyNight - b.weeklyNight);
        break;
      case 'price-high':
        result.sort((a, b) => b.weeklyNight - a.weeklyNight);
        break;
      case 'capacity-low':
        result.sort((a, b) => a.capacity - b.capacity);
        break;
      case 'capacity-high':
        result.sort((a, b) => b.capacity - a.capacity);
        break;
      case 'rating':
        result.sort((a, b) => (farmhouseRatings[b.id] || 0) - (farmhouseRatings[a.id] || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    return result;
  }, [searchText, filters, sortBy, farmhouses, farmhouseRatings]);

  const renderFarmhouse = React.useCallback(({ item }: { item: FarmhouseType }) => (
    <FarmhouseCard
      item={item}
      colors={colors}
      farmhouseRating={farmhouseRatings[item.id]}
      isInWishlist={isInWishlist(item.id)}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
      onShare={() => handleShare(item)}
      onToggleWishlist={() => toggleWishlist(item)}
    />
  ), [colors, farmhouseRatings, isInWishlist, navigation]);

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Failed to load farmhouses</Text>
          <Text style={[styles.errorSubText, { color: colors.placeholder }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Centered max-width wrapper for large screens */}
      <View style={[styles.innerContainer, isLargeScreen && styles.innerContainerLarge]}>

        <View style={[styles.header, { paddingHorizontal: hPad }]}>
          <View style={styles.userInfo}>
            <Text style={[styles.greeting, { color: colors.placeholder }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}!
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleNotifications} style={styles.notificationButton}>
              {notificationItems.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationItems.length > 9 ? '9+' : notificationItems.length}</Text>
                </View>
              )}
              <Bell size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.notificationButton}>
              <LogOut size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchFilterRow, { paddingHorizontal: hPad }]}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#F3F4F6', borderColor: colors.border }]}>
            <Search size={20} color={colors.placeholder} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name or area..."
              placeholderTextColor={colors.placeholder}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => setShowSortModal(true)}
          >
            <ArrowUpDown size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <SlidersHorizontal size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBackground} />
            <Text style={[styles.loadingText, { color: colors.placeholder }]}>Loading farmhouses...</Text>
          </View>
        ) : (
          <FlatList
            key={`farmhouse-list-${numColumns}`}
            data={filteredAndSortedFarmhouses}
            renderItem={renderFarmhouse}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: cardGap, paddingHorizontal: hPad } : undefined}
            contentContainerStyle={[
              styles.listContent,
              numColumns === 1 && { paddingHorizontal: hPad },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler.onScroll}
            scrollEventThrottle={scrollHandler.scrollEventThrottle}
            maxToRenderPerBatch={10}
            windowSize={21}
            removeClippedSubviews={false}
            updateCellsBatchingPeriod={50}
            initialNumToRender={numColumns * 6}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                colors={[colors.buttonBackground]}
                tintColor={colors.buttonBackground}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                  No farmhouses found
                </Text>
              </View>
            }
          />
        )}

      </View>{/* end innerContainer */}

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNotificationsModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, paddingBottom: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Notifications</Text>
                {notificationItems.length > 0 && (
                  <TouchableOpacity onPress={clearNotifications}>
                    <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
              {notificationItems.length === 0 ? (
                <Text style={{ color: colors.placeholder, textAlign: 'center', paddingVertical: 20 }}>No notifications yet</Text>
              ) : (
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {notificationItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.notifItem, { borderColor: colors.border }]}
                      onPress={() => { setShowNotificationsModal(false); navigation.navigate('BookingDetails', { bookingId: item.id }); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifIcon, { backgroundColor: item.statusColor + '22' }]}>
                        {item.icon === 'check' ? <CheckCircle size={18} color={item.statusColor} /> :
                         item.icon === 'alert' ? <AlertCircle size={18} color={item.statusColor} /> :
                         <Clock size={18} color={item.statusColor} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: item.statusColor }]}>{item.statusLabel}</Text>
                        <Text style={[{ fontSize: 14, fontWeight: '500', color: colors.text }]} numberOfLines={1}>{item.farmhouseName}</Text>
                        <Text style={[{ fontSize: 12, color: colors.placeholder }]}>{item.checkInDate}{item.checkOutDate && item.checkOutDate !== item.checkInDate ? ` → ${item.checkOutDate}` : ''}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.border, marginTop: 12 }]} onPress={() => setShowNotificationsModal(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
            {[
              { label: 'Name (A-Z)', value: 'name' },
              { label: 'Price: Low to High', value: 'price-low' },
              { label: 'Price: High to Low', value: 'price-high' },
              { label: 'Capacity: Low to High', value: 'capacity-low' },
              { label: 'Capacity: High to Low', value: 'capacity-high' },
              { label: 'Rating', value: 'rating' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  sortBy === option.value && { backgroundColor: colors.buttonBackground }
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { color: sortBy === option.value ? colors.buttonText : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.border }]}
                onPress={() => setShowSortModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.filterModalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>

              <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Location</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Hyderabad"
                  placeholderTextColor={colors.placeholder}
                  value={filters.location}
                  onChangeText={(text) => setFilters({...filters, location: text})}
                />

                <Text style={[styles.filterLabel, { color: colors.text }]}>Price Range</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={[styles.filterInputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Min"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({...filters, minPrice: text.replace(/[^0-9]/g, '')})}
                  />
                  <TextInput
                    style={[styles.filterInputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Max"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({...filters, maxPrice: text.replace(/[^0-9]/g, '')})}
                  />
                </View>

                <Text style={[styles.filterLabel, { color: colors.text }]}>Minimum Capacity</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 15"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={filters.minCapacity}
                  onChangeText={(text) => setFilters({...filters, minCapacity: text.replace(/[^0-9]/g, '')})}
                />

                <Text style={[styles.filterLabel, { color: colors.text }]}>Property Type</Text>
                <View style={styles.typeFilterRow}>
                  {(['', 'farmhouse', 'resort'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeFilterChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        filters.propertyType === type && { borderColor: colors.buttonBackground, backgroundColor: colors.buttonBackground + '22' }
                      ]}
                      onPress={() => setFilters({...filters, propertyType: type})}
                    >
                      <Text style={[
                        styles.typeFilterText,
                        { color: colors.placeholder },
                        filters.propertyType === type && { color: colors.buttonBackground, fontWeight: '700' }
                      ]}>
                        {type === '' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setFilters({ location: '', minPrice: '', maxPrice: '', minCapacity: '', propertyType: '' });
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, { color: colors.text }]}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.filterButtonText, { color: colors.buttonText }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },
  innerContainerLarge: {
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  userInfo: { flex: 1 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notificationButton: { padding: 8, position: 'relative' },
  notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  notificationBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveGap(10),
    paddingBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: isSmallDevice() ? 40 : 44,
    borderRadius: 8,
    paddingHorizontal: isSmallDevice() ? 8 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallDevice() ? 6 : 10,
    borderWidth: 1,
    minWidth: 0, // Allow shrinking
  },
  searchInput: { flex: 1, fontSize: 14, minWidth: 0 },
  iconButton: {
    width: isSmallDevice() ? 40 : 44,
    height: isSmallDevice() ? 40 : 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Prevent shrinking
  },
  listContent: { paddingBottom: 100 },
  propertyCard: { flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  imageContainer: { position: 'relative' },
  propertyImage: { width: '100%', aspectRatio: 16 / 10 },
  imageActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 8 },
  propertyDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  propertyTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  propertyTypeBadgeText: { fontSize: 11, fontWeight: '700' },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 10 },
  locationText: { fontSize: 12, flex: 1 },
  priceCapacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '600' },
  capacity: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  errorSubText: { fontSize: 14, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  filterModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  filterScrollView: { flexGrow: 0, flexShrink: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalOption: { padding: 15, borderRadius: 8, marginBottom: 10 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  closeButton: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  closeButtonText: { fontSize: 16, fontWeight: '600' },
  filterLabel: { fontSize: 14, fontWeight: '600', marginTop: 15, marginBottom: 8 },
  filterInput: { height: 45, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, borderWidth: 1 },
  priceRow: { flexDirection: 'row', gap: 10 },
  filterInputHalf: { flex: 1, height: 45, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, borderWidth: 1 },
  filterButtons: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  clearButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  applyButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  filterButtonText: { fontSize: 16, fontWeight: '600' },
  typeFilterRow: { flexDirection: 'row', gap: 10 },
  typeFilterChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  typeFilterText: { fontSize: 14 },
});