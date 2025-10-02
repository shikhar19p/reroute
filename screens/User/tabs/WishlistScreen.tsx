import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useWishlist } from '../../../context/WishlistContext';
import { useTheme } from '../../../context/ThemeContext';

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

const SAMPLE_FARMHOUSES: Farmhouse[] = [
  { id: '1', name: 'Green Valley Farmhouse', location: 'Bangalore Rural', price: 5000, rating: 4.8, reviews: 73, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', amenities: ['Pool', 'BBQ', 'WiFi', 'Parking'], capacity: 20, rooms: 4, description: 'Beautiful farmhouse with scenic valley views.', images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop'], weekendPrice: 7000, specialDates: [], extraGuestPrice: 500, coordinates: { latitude: 12.9716, longitude: 77.5946 }, rules: ['No smoking inside'], terms: ['50% advance required'], bookedDates: [] },
  { id: '2', name: 'Sunset Hills Resort', location: 'Mysore Outskirts', price: 7500, rating: 4.6, reviews: 45, image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop', amenities: ['Lake View', 'Bonfire', 'Kitchen', 'Games'], capacity: 15, rooms: 3, description: 'Luxurious resort with sunset views.', images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop'], weekendPrice: 9000, specialDates: [], extraGuestPrice: 600, coordinates: { latitude: 12.3051, longitude: 76.6553 }, rules: ['Quiet after 10 PM'], terms: ['Full payment on booking'], bookedDates: [] },
  { id: '3', name: 'Palm Grove Retreat', location: 'Coorg Valley', price: 6200, rating: 4.9, reviews: 102, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop', amenities: ['Garden', 'Spa', 'Restaurant', 'Nature Walk'], capacity: 25, rooms: 5, description: 'Serene retreat with spa.', images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop'], weekendPrice: 8000, specialDates: [], extraGuestPrice: 400, coordinates: { latitude: 12.4244, longitude: 75.7382 }, rules: ['Check-in 2 PM'], terms: ['Security deposit required'], bookedDates: [] }
];

export default function WishlistScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { wishlist, removeFromWishlist } = useWishlist();
  const wishlistFarmhouses = SAMPLE_FARMHOUSES.filter(f => wishlist.includes(f.id));

  const renderItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => (navigation as any).navigate('FarmhouseDetail', { farmhouse: item })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => removeFromWishlist(item.id)}
        >
          <Text style={styles.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.location, { color: colors.placeholder }]}>📍 {item.location}</Text>
        <View style={styles.row}>
          <Text style={[styles.price, { color: colors.buttonBackground }]}>₹{item.price}/night</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: colors.text }]}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Wishlist</Text>
        <Text style={[styles.count, { color: colors.placeholder }]}>
          {wishlist.length} {wishlist.length === 1 ? 'property' : 'properties'}
        </Text>
      </View>
      <FlatList
        data={wishlistFarmhouses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>
              No properties in your wishlist yet
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => (navigation as any).navigate('Explore')}
            >
              <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>
                Browse Farmhouses
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  count: { fontSize: 14 },
  list: { padding: 20 },
  card: { borderRadius: 15, marginBottom: 15, borderWidth: 1, overflow: 'hidden' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 180 },
  heartButton: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heartIcon: { fontSize: 20 },
  cardContent: { padding: 15 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  location: { fontSize: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '600' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, marginBottom: 20 },
  browseButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  browseButtonText: { fontSize: 16, fontWeight: '600' },
});
