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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { getApprovedFarmhouses, Farmhouse as FarmhouseType } from '../../services/farmhouseService';

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

const SAMPLE_FARMHOUSES: Farmhouse[] = [
  { id: '1', name: 'Green Valley Farmhouse', location: 'Bangalore Rural', price: 5000, rating: 4.8, reviews: 73, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', amenities: ['Pool', 'BBQ', 'WiFi', 'Parking'], capacity: 20, rooms: 4, description: 'Beautiful farmhouse with scenic valley views, perfect for family gatherings and weekend getaways.', images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop'], weekendPrice: 7000, specialDates: [{ date: '2025-12-25', price: 10000 }], extraGuestPrice: 500, coordinates: { latitude: 12.9716, longitude: 77.5946 }, rules: ['No smoking inside', 'Pets allowed with notification', 'Music until 10 PM'], terms: ['50% advance required', 'Cancellation 48hrs before'], bookedDates: ['2025-10-05', '2025-10-06'] },
  { id: '2', name: 'Sunset Hills Resort', location: 'Mysore Outskirts', price: 7500, rating: 4.6, reviews: 45, image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop', amenities: ['Lake View', 'Bonfire', 'Kitchen', 'Games'], capacity: 15, rooms: 3, description: 'Luxurious resort offering stunning sunset views and premium amenities.', images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop'], weekendPrice: 9000, specialDates: [], extraGuestPrice: 600, coordinates: { latitude: 12.3051, longitude: 76.6553 }, rules: ['No loud music after 10 PM'], terms: ['Full payment on booking'], bookedDates: [] },
  { id: '3', name: 'Palm Grove Retreat', location: 'Coorg Valley', price: 6200, rating: 4.9, reviews: 102, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop', amenities: ['Garden', 'Spa', 'Restaurant', 'Nature Walk'], capacity: 25, rooms: 5, description: 'Serene retreat nestled in nature with spa facilities.', images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop'], weekendPrice: 8000, specialDates: [], extraGuestPrice: 400, coordinates: { latitude: 12.4244, longitude: 75.7382 }, rules: ['Check-in 2 PM, Check-out 12 PM'], terms: ['Security deposit ₹5000'], bookedDates: ['2025-10-01'] },
];

export default function ExploreScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
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

  useEffect(() => {
    loadFarmhouses();
  }, []);

  const loadFarmhouses = async () => {
    try {
      setLoading(true);
      const data = await getApprovedFarmhouses();
      setFarmhouses(data);
    } catch (error) {
      console.error('Error loading farmhouses:', error);
      Alert.alert('Error', 'Could not load farmhouses');
    } finally {
      setLoading(false);
    }
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
        (f.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (f.location || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filters.location) {
      result = result.filter(f =>
        (f.location || '').toLowerCase().includes(filters.location.toLowerCase())
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

  const renderFarmhouse = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.propertyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }} style={styles.propertyImage} />

        <View style={styles.imageActions}>
          <TouchableOpacity
            onPress={() => handleShare(item)}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleWishlist(item.id)}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>
              {isInWishlist(item.id) ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.propertyDetails}>
        <View style={styles.titleRow}>
          <Text style={[styles.propertyTitle, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: colors.text }]}>{item.rating}</Text>
          </View>
        </View>
        <Text style={[styles.distance, { color: colors.placeholder }]}>{item.location}</Text>
        <View style={styles.priceCapacityRow}>
          <Text style={[styles.price, { color: colors.buttonBackground }]}>₹{item.price}/night</Text>
          <Text style={[styles.capacity, { color: colors.placeholder }]}>Up to {item.capacity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={[styles.greeting, { color: colors.placeholder }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'User'}!</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterRow}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#F3F4F6', borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search farmhouses..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <Text style={[styles.buttonIcon, { color: colors.text }]}>↕️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.buttonIcon, { color: colors.text }]}>⚙️</Text>
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No farmhouses found
              </Text>
            </View>
          }
        />
      )}

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

      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.filterModalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Bangalore"
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
                onChangeText={(text) => setFilters({...filters, minPrice: text})}
              />
              <TextInput
                style={[styles.filterInputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Max"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(text) => setFilters({...filters, maxPrice: text})}
              />
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Minimum Capacity</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 15"
              placeholderTextColor={colors.placeholder}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  userInfo: { flex: 1 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 18, fontWeight: '600' },
  logoutButton: { padding: 8 },
  logoutIcon: { fontSize: 20 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  searchBar: { flex: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonIcon: { fontSize: 18 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  propertyCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1 },
  imageContainer: { position: 'relative' },
  propertyImage: { width: '100%', height: 200 },
  imageActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 8 },
  actionIcon: { fontSize: 18 },
  propertyDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  distance: { fontSize: 14, marginBottom: 8 },
  priceCapacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '600' },
  capacity: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
});
