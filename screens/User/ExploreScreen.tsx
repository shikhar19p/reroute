import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Modal, TextInput, FlatList, Share, ActivityIndicator, RefreshControl,
  useWindowDimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import AnimatedImage from '../../components/AnimatedImage';
import { FilterChip } from '../../components/FilterChip';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Search, SlidersHorizontal, ArrowUpDown, Bell, Share2, Star, MapPin, LogOut, Calendar, CheckCircle, AlertCircle, Clock, Building2, X as XIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollHandler, useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { useDialog } from '../../components/CustomDialog';
import { Farmhouse as FarmhouseType } from '../../types/navigation';
import { useAvailableFarmhouses, useMyBookings } from '../../GlobalDataContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResponsivePadding, getResponsiveGap, isSmallDevice } from '../../utils/responsive';
import { sessionRatings, resolveRatings } from '../../utils/ratingsCache';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Memoized Farmhouse Card Component for performance
const FarmhouseCard = React.memo(({
  item,
  colors,
  farmhouseRating,
  isInWishlist,
  onPress,
  onShare,
  onToggleWishlist,
  cardStyle,
}: {
  item: FarmhouseType;
  colors: any;
  farmhouseRating: number | undefined;
  isInWishlist: boolean;
  onPress: () => void;
  onShare: () => void;
  onToggleWishlist: () => void;
  cardStyle?: object;
}) => (
  <TouchableOpacity
    style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, cardStyle]}
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
      <View style={styles.badgeLocationRow}>
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

const GRID_BREAKPOINTS = { md: 768, lg: 1200, xl: 1440 };

export default function ExploreScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showTabBar } = useTabBarVisibility();

  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));
  const { showDialog } = useDialog();

  // Use the GlobalDataContext hook instead of local state
  const { data: farmhouses, loading, error, refreshing, refresh } = useAvailableFarmhouses();
  const { data: myBookings } = useMyBookings();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [clearedBefore, setClearedBefore] = useState(0);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [isOwnerWithFarms, setIsOwnerWithFarms] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('notifications_cleared_at').then(val => {
      if (val) setClearedBefore(parseInt(val, 10));
    }).catch(() => {});
  }, []);

  // Check if this customer-mode user is also an owner with any farmhouses
  useEffect(() => {
    if (!user?.uid || !user?.roles?.includes('owner')) {
      setIsOwnerWithFarms(false);
      return;
    }
    getDocs(query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', user.uid),
      limit(1)
    )).then(snap => setIsOwnerWithFarms(!snap.empty)).catch(() => {});
  }, [user?.uid, user?.roles]);

  // Responsive grid layout
  const numColumns = useMemo(() => {
    if (windowWidth > GRID_BREAKPOINTS.lg) return 4;
    if (windowWidth >= 1024) return 3;
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
  const insets = useSafeAreaInsets();
  const AMENITY_OPTIONS: { key: string; label: string }[] = [
    { key: 'pool', label: 'Pool' },
    { key: 'wifi', label: 'WiFi' },
    { key: 'ac', label: 'AC' },
    { key: 'parking', label: 'Parking' },
    { key: 'kitchen', label: 'Kitchen' },
    { key: 'bbq', label: 'BBQ' },
    { key: 'bonfire', label: 'Bonfire' },
    { key: 'hotTub', label: 'Hot Tub' },
    { key: 'djMusicSystem', label: 'DJ System' },
    { key: 'projector', label: 'Projector' },
    { key: 'outdoorSeating', label: 'Outdoor Seating' },
    { key: 'restaurant', label: 'Restaurant' },
  ];

  const [filters, setFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
    propertyType: '' as '' | 'farmhouse' | 'resort',
    checkIn: '',
    checkOut: '',
    amenities: [] as string[],
  });
  const [calPickerFor, setCalPickerFor] = useState<'checkIn' | 'checkOut' | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const maxFilterDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }, []);
  const filtersActive = filters.location !== '' || filters.minPrice !== '' || filters.maxPrice !== '' || filters.minCapacity !== '' || filters.propertyType !== '' || filters.checkIn !== '' || filters.amenities.length > 0;
  const clearFilters = () => setFilters({ location: '', minPrice: '', maxPrice: '', minCapacity: '', propertyType: '', checkIn: '', checkOut: '', amenities: [] });

  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);

  const fetchAdminNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setAdminNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [user]);

  useEffect(() => { fetchAdminNotifications(); }, [fetchAdminNotifications]);
  const [farmhouseRatings, setFarmhouseRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    resolveRatings(farmhouses, (incoming) => {
      setFarmhouseRatings(prev => ({ ...prev, ...incoming }));
    });
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
    const bookingItems = [...myBookings]
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
        const ts = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return { ...b, statusLabel, statusColor, icon, _ts: ts, _isAdmin: false };
      });

    const adminItems = adminNotifications
      .filter(n => {
        const t = n.createdAt?.toMillis ? n.createdAt.toMillis() : new Date(n.createdAt || 0).getTime();
        return t > clearedBefore;
      })
      .map(n => {
        const ts = n.createdAt?.toMillis ? n.createdAt.toMillis() : new Date(n.createdAt || 0).getTime();
        return {
          id: n.id,
          statusLabel: n.title || 'Notification',
          statusColor: '#6366F1',
          icon: 'bell' as 'check' | 'alert' | 'clock' | 'bell',
          farmhouseName: n.body || '',
          checkInDate: '',
          checkOutDate: '',
          _ts: ts,
          _isAdmin: true,
        };
      });

    return [...bookingItems, ...adminItems]
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 30);
  }, [myBookings, clearedBefore, adminNotifications]);

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

    if (filters.amenities.length > 0) {
      result = result.filter(f =>
        filters.amenities.every(key => !!(f.amenities as any)?.[key])
      );
    }

    if (filters.checkIn && filters.checkOut && filters.checkIn <= filters.checkOut) {
      const toLocalDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      result = result.filter(f => {
        const booked = new Set([...(f.bookedDates || []), ...(f.blockedDates || [])]);
        // Parse as local midnight to avoid UTC offset shifting the date
        const [sy, sm, sd] = filters.checkIn.split('-').map(Number);
        const [ey, em, ed] = filters.checkOut.split('-').map(Number);
        const cur = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        while (cur <= end) {
          if (booked.has(toLocalDate(cur))) return false;
          cur.setDate(cur.getDate() + 1);
        }
        return true;
      });
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

  // Pad last row with null spacers so final-row cards don't stretch
  const paddedFarmhouses = useMemo(() => {
    if (numColumns <= 1) return filteredAndSortedFarmhouses as (FarmhouseType | null)[];
    const remainder = filteredAndSortedFarmhouses.length % numColumns;
    if (remainder === 0) return filteredAndSortedFarmhouses as (FarmhouseType | null)[];
    const pads = numColumns - remainder;
    return [...filteredAndSortedFarmhouses, ...Array<null>(pads).fill(null)] as (FarmhouseType | null)[];
  }, [filteredAndSortedFarmhouses, numColumns]);

  const renderFarmhouse = React.useCallback(({ item }: { item: FarmhouseType | null }) => {
    if (!item) return <View style={{ flex: 1 }} />;
    return (
      <FarmhouseCard
        item={item}
        colors={colors}
        farmhouseRating={farmhouseRatings[item.id]}
        isInWishlist={isInWishlist(item.id)}
        onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
        onShare={() => handleShare(item)}
        onToggleWishlist={() => toggleWishlist(item)}
      />
    );
  }, [colors, farmhouseRatings, isInWishlist, navigation]);

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

      <View style={styles.innerContainer}>

        <View style={[styles.header, { paddingHorizontal: hPad }]}>
          <View style={styles.userInfo}>
            <Text style={[styles.greeting, { color: colors.placeholder }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}!
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isOwnerWithFarms && (
              <TouchableOpacity
                onPress={() => switchRole('owner')}
                style={[styles.notificationButton, styles.ownerSwitchBtn]}
                accessibilityLabel="Switch to owner view"
              >
                <Building2 size={18} color={colors.primary} />
                <Text style={[styles.ownerSwitchLabel, { color: colors.primary }]}>Owner</Text>
              </TouchableOpacity>
            )}
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
            style={[styles.iconButton, { backgroundColor: filtersActive ? colors.buttonBackground : colors.cardBackground, borderColor: filtersActive ? colors.buttonBackground : colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <SlidersHorizontal size={20} color={filtersActive ? colors.buttonText : colors.text} />
          </TouchableOpacity>
        </View>

        {filtersActive && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: hPad, marginBottom: 8 }}
            contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          >
            {filters.location !== '' && (
              <FilterChip
                label={`📍 ${filters.location}`}
                onRemove={() => setFilters(f => ({ ...f, location: '' }))}
                color={colors.buttonBackground}
                textColor={colors.buttonText}
                small
              />
            )}
            {(filters.minPrice !== '' || filters.maxPrice !== '') && (
              <FilterChip
                label={`₹${filters.minPrice || '0'}–${filters.maxPrice || '∞'}`}
                onRemove={() => setFilters(f => ({ ...f, minPrice: '', maxPrice: '' }))}
                color={colors.buttonBackground}
                textColor={colors.buttonText}
                small
              />
            )}
            {filters.minCapacity !== '' && (
              <FilterChip
                label={`${filters.minCapacity}+ guests`}
                onRemove={() => setFilters(f => ({ ...f, minCapacity: '' }))}
                color={colors.buttonBackground}
                textColor={colors.buttonText}
                small
              />
            )}
            {filters.propertyType !== '' && (
              <FilterChip
                label={filters.propertyType === 'resort' ? 'Resort' : 'Farmhouse'}
                onRemove={() => setFilters(f => ({ ...f, propertyType: '' }))}
                color={colors.buttonBackground}
                textColor={colors.buttonText}
                small
              />
            )}
            {filters.checkIn !== '' && (
              <FilterChip
                label={`${filters.checkIn}${filters.checkOut ? ` → ${filters.checkOut}` : ''}`}
                onRemove={() => setFilters(f => ({ ...f, checkIn: '', checkOut: '' }))}
                color={colors.buttonBackground}
                textColor={colors.buttonText}
                small
              />
            )}
            {filters.amenities.map(key => {
              const opt = AMENITY_OPTIONS.find(a => a.key === key);
              return opt ? (
                <FilterChip
                  key={key}
                  label={opt.label}
                  onRemove={() => setFilters(f => ({ ...f, amenities: f.amenities.filter(a => a !== key) }))}
                  color={colors.buttonBackground}
                  textColor={colors.buttonText}
                  small
                />
              ) : null;
            })}
            <TouchableOpacity onPress={clearFilters} style={[styles.clearFilterBtn, { borderColor: '#EF4444' }]}>
              <Text style={[styles.clearFilterBtnText, { color: '#EF4444' }]}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBackground} />
            <Text style={[styles.loadingText, { color: colors.placeholder }]}>Loading farmhouses...</Text>
          </View>
        ) : (
          <FlatList
            key={`farmhouse-list-${numColumns}`}
            data={paddedFarmhouses}
            renderItem={renderFarmhouse}
            keyExtractor={(item, index) => item?.id ?? `pad-${index}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: cardGap } : undefined}
            contentContainerStyle={[styles.listContent, { paddingHorizontal: hPad }]}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler.onScroll}
            scrollEventThrottle={scrollHandler.scrollEventThrottle}
            maxToRenderPerBatch={6}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={30}
            initialNumToRender={numColumns * 4}
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
                      onPress={() => {
                        if ((item as any)._isAdmin) {
                          setExpandedNotifId(prev => prev === item.id ? null : item.id);
                        } else {
                          setShowNotificationsModal(false);
                          navigation.navigate('BookingDetails', { bookingId: item.id });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifIcon, { backgroundColor: item.statusColor + '22' }]}>
                        {item.icon === 'check' ? <CheckCircle size={18} color={item.statusColor} /> :
                         item.icon === 'alert' ? <AlertCircle size={18} color={item.statusColor} /> :
                         item.icon === 'bell' ? <Bell size={18} color={item.statusColor} /> :
                         <Clock size={18} color={item.statusColor} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: item.statusColor }]}>{item.statusLabel}</Text>
                        <Text
                          style={[{ fontSize: 14, fontWeight: '500', color: colors.text }]}
                          numberOfLines={(item as any)._isAdmin && expandedNotifId !== item.id ? 2 : undefined}
                        >{item.farmhouseName}</Text>
                        {!(item as any)._isAdmin && (
                          <Text style={[{ fontSize: 12, color: colors.placeholder }]}>{item.checkInDate}{item.checkOutDate && item.checkOutDate !== item.checkInDate ? ` → ${item.checkOutDate}` : ''}</Text>
                        )}
                        {(item as any)._isAdmin && item.farmhouseName.length > 80 && (
                          <Text style={{ fontSize: 11, color: item.statusColor, marginTop: 2 }}>
                            {expandedNotifId === item.id ? 'Show less' : 'Show more'}
                          </Text>
                        )}
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
            <View style={[styles.filterModalContent, { backgroundColor: colors.cardBackground, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>

              <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

                <Text style={[styles.filterLabel, { color: colors.text }]}>Availability</Text>
                <View style={styles.priceRow}>
                  <TouchableOpacity
                    style={[styles.filterInputHalf, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10 }]}
                    onPress={() => setCalPickerFor('checkIn')}
                  >
                    <Calendar size={14} color={filters.checkIn ? colors.text : colors.placeholder} />
                    <Text style={{ color: filters.checkIn ? colors.text : colors.placeholder, fontSize: 13 }}>
                      {filters.checkIn || 'Check-in'}
                    </Text>
                    {filters.checkIn ? (
                      <TouchableOpacity onPress={() => setFilters({ ...filters, checkIn: '', checkOut: '' })} style={{ marginLeft: 'auto' }}>
                        <XIcon size={12} color={colors.placeholder} />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterInputHalf, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10 }]}
                    onPress={() => setCalPickerFor('checkOut')}
                  >
                    <Calendar size={14} color={filters.checkOut ? colors.text : colors.placeholder} />
                    <Text style={{ color: filters.checkOut ? colors.text : colors.placeholder, fontSize: 13 }}>
                      {filters.checkOut || 'Check-out'}
                    </Text>
                    {filters.checkOut ? (
                      <TouchableOpacity onPress={() => setFilters({ ...filters, checkOut: '' })} style={{ marginLeft: 'auto' }}>
                        <XIcon size={12} color={colors.placeholder} />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.filterLabel, { color: colors.text }]}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {AMENITY_OPTIONS.map(({ key, label }) => {
                    const selected = filters.amenities.includes(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.amenityChip,
                          { borderColor: colors.border, backgroundColor: colors.background },
                          selected && { borderColor: colors.buttonBackground, backgroundColor: colors.buttonBackground + '22' },
                        ]}
                        onPress={() =>
                          setFilters(f => ({
                            ...f,
                            amenities: selected
                              ? f.amenities.filter(a => a !== key)
                              : [...f.amenities, key],
                          }))
                        }
                      >
                        <Text style={[
                          styles.amenityChipText,
                          { color: colors.placeholder },
                          selected && { color: colors.buttonBackground, fontWeight: '700' },
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

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
                  onPress={() => { clearFilters(); setShowFilterModal(false); }}
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Availability date picker modal */}
      <Modal visible={calPickerFor !== null} transparent animationType="fade" onRequestClose={() => setCalPickerFor(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setCalPickerFor(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, width: 320, elevation: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
                {calPickerFor === 'checkIn' ? 'Select Check-in Date' : 'Select Check-out Date'}
              </Text>
              {(() => {
                const effectiveMin = calPickerFor === 'checkOut' && filters.checkIn
                  ? (() => { const d = new Date(filters.checkIn); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
                  : todayStr;
                return (
                  <RNCalendar
                    minDate={effectiveMin}
                    maxDate={maxFilterDate}
                    current={calPickerFor === 'checkOut' && filters.checkIn ? filters.checkIn : todayStr}
                    onDayPress={(day: DateData) => {
                      if (calPickerFor === 'checkIn') {
                        setFilters(f => ({ ...f, checkIn: day.dateString, checkOut: f.checkOut && f.checkOut <= day.dateString ? '' : f.checkOut }));
                        setCalPickerFor('checkOut');
                      } else {
                        setFilters(f => ({ ...f, checkOut: day.dateString }));
                        setCalPickerFor(null);
                      }
                    }}
                    markedDates={{
                      ...(filters.checkIn ? { [filters.checkIn]: { selected: true, selectedColor: colors.buttonBackground } } : {}),
                      ...(filters.checkOut ? { [filters.checkOut]: { selected: true, selectedColor: colors.buttonBackground } } : {}),
                    }}
                    pastScrollRange={0}
                    renderArrow={(direction) =>
                      direction === 'left'
                        ? <ChevronLeft size={20} color="#D4AF37" />
                        : <ChevronRight size={20} color="#D4AF37" />
                    }
                    dayComponent={({ date, state, marking, onPress }: any) => {
                      const outOfRange = date.dateString < effectiveMin || date.dateString > maxFilterDate;
                      const selected = marking?.selected;
                      const isToday = state === 'today';
                      return (
                        <TouchableOpacity
                          onPress={() => { if (!outOfRange && onPress) onPress(date); }}
                          disabled={outOfRange}
                          style={{
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: selected ? colors.buttonBackground : 'transparent',
                            justifyContent: 'center', alignItems: 'center',
                          }}
                        >
                          <Text style={{
                            fontSize: 14, textAlign: 'center',
                            color: selected ? colors.buttonText
                              : outOfRange ? colors.placeholder
                              : isToday ? colors.buttonBackground
                              : colors.text,
                            fontWeight: selected || isToday ? '700' : '400',
                          }}>
                            {date.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                    theme={{
                      backgroundColor: colors.cardBackground,
                      calendarBackground: colors.cardBackground,
                      textSectionTitleColor: colors.text,
                      monthTextColor: colors.text,
                    }}
                  />
                );
              })()}
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
  ownerSwitchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  ownerSwitchLabel: { fontSize: 12, fontWeight: '700' },
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
  searchInput: { flex: 1, fontSize: Platform.OS === 'web' ? 16 : 14, minWidth: 0 },
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
  imageContainer: { width: '100%', height: 220, overflow: 'hidden', position: 'relative' },
  propertyImage: { width: '100%', height: 220 },
  imageActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 8 },
  propertyDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  badgeLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'nowrap' },
  propertyTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  propertyTypeBadgeText: { fontSize: 11, fontWeight: '700' },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
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
  activeFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  activeFilterText: { fontSize: 13 },
  clearFilterBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  clearFilterBtnText: { fontSize: 13, fontWeight: '600' },
  filterButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  clearButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  applyButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  filterButtonText: { fontSize: 16, fontWeight: '600' },
  typeFilterRow: { flexDirection: 'row', gap: 10 },
  typeFilterChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  typeFilterText: { fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5 },
  amenityChipText: { fontSize: 13 },
});