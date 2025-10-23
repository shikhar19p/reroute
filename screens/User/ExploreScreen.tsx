import React, { useState, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Modal, TextInput, FlatList, Share, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Search, SlidersHorizontal, ArrowUpDown, Bell, Share2 } from 'lucide-react-native';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollHandler } from '../../context/TabBarVisibilityContext';
import { useDialog } from '../../components/CustomDialog';
import { Farmhouse as FarmhouseType } from '../../types/navigation';
import { useAvailableFarmhouses } from '../../GlobalDataContext';
import { getResponsivePadding, getResponsiveGap, isSmallDevice } from '../../utils/responsive';

export default function ExploreScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();

  // Use the GlobalDataContext hook instead of local state
  const { data: farmhouses, loading, error } = useAvailableFarmhouses();

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

  const toggleWishlist = async (farmhouse: FarmhouseType) => {
    if (isInWishlist(farmhouse.id)) {
      await removeFromWishlist(farmhouse.id);
    } else {
      await addToWishlist(farmhouse.id);
    }
  };

  const handleShare = async (farmhouse: FarmhouseType) => {
    try {
      const shareMessage = `🏡 ${farmhouse.name}\n\n` +
        `📍 Location: ${farmhouse.location}\n` +
        `⭐ Rating: ${farmhouse.rating?.toFixed(1) || '4.5'}/5\n` +
        `👥 Capacity: Up to ${farmhouse.capacity} guests\n\n` +
        `💰 Starting from ₹${farmhouse.weeklyNight}/night\n\n` +
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

  const handleNotifications = () => {
    navigation.navigate('Bookings');
  };

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
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    return result;
  }, [searchText, filters, sortBy, farmhouses]);

  const renderFarmhouse = ({ item }: { item: FarmhouseType }) => (
    <TouchableOpacity
      style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }}
          style={styles.propertyImage}
        />

        <View style={styles.imageActions}>
          <TouchableOpacity
            onPress={() => handleShare(item)}
            style={styles.actionButton}
          >
            <Share2 size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleWishlist(item)}
            style={styles.actionButton}
          >
            <Heart
              size={18}
              color={isInWishlist(item.id) ? "#EF4444" : "#666"}
              fill={isInWishlist(item.id) ? "#EF4444" : "transparent"}
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
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: colors.text }]}>
              {item.rating?.toFixed(1) || '4.5'}
            </Text>
          </View>
        </View>
        <Text style={[styles.distance, { color: colors.placeholder }]} numberOfLines={1}>
          {item.location}
        </Text>
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
  );

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

      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={[styles.greeting, { color: colors.placeholder }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.displayName || 'User'}!
          </Text>
        </View>
        <TouchableOpacity onPress={handleNotifications} style={styles.notificationButton}>
          <Bell size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterRow}>
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
          data={filteredAndSortedFarmhouses}
          renderItem={renderFarmhouse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler.onScroll}
          scrollEventThrottle={scrollHandler.scrollEventThrottle}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No farmhouses found
              </Text>
            </View>
          }
        />
      )}

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.filterModalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>

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

            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setFilters({ location: '', minPrice: '', maxPrice: '', minCapacity: '' });
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
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(24),
    paddingVertical: 16
  },
  userInfo: { flex: 1 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 18, fontWeight: '600' },
  notificationButton: { padding: 8 },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveGap(10),
    paddingHorizontal: getResponsivePadding(16),
    paddingBottom: 16
  },
  searchBar: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: isSmallDevice() ? 8 : 12,
    paddingVertical: isSmallDevice() ? 8 : 10,
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
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  propertyCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  imageContainer: { position: 'relative' },
  propertyImage: { width: '100%', height: 200 },
  imageActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 8 },
  propertyDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  distance: { fontSize: 14, marginBottom: 8 },
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
  filterModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
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
});