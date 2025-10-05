import React, { useState, useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Users } from 'lucide-react-native';
import { useWishlist } from '../../../context/WishlistContext';
import { useTheme } from '../../../context/ThemeContext';
import { getApprovedFarmhouses, Farmhouse } from '../../../services/farmhouseService';

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { wishlist, removeFromWishlist } = useWishlist();
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
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
    } finally {
      setLoading(false);
    }
  };

  const wishlistFarmhouses = farmhouses.filter(f => wishlist.includes(f.id));

  const renderItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }} style={styles.image} />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => removeFromWishlist(item.id)}
        >
          <Heart size={20} color="#EF4444" fill="#EF4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.placeholder} />
          <Text style={[styles.location, { color: colors.placeholder }]}>{item.location}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.price, { color: colors.buttonBackground }]}>₹{item.price}/night</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: colors.text }]}>{item.rating || 4.5}</Text>
          </View>
        </View>
        <View style={styles.capacityRow}>
          <Users size={14} color={colors.placeholder} />
          <Text style={[styles.capacity, { color: colors.placeholder }]}>Up to {item.capacity} guests</Text>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
          <Text style={[styles.loadingText, { color: colors.placeholder }]}>Loading wishlist...</Text>
        </View>
      ) : (
        <FlatList
          data={wishlistFarmhouses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Heart size={64} color={colors.placeholder} />
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No properties in your wishlist yet
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => navigation.navigate('Explore')}
              >
                <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>
                  Browse Farmhouses
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  count: { fontSize: 14 },
  list: { padding: 20, paddingTop: 0 },
  card: { borderRadius: 15, marginBottom: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 180 },
  heartButton: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 15 },
  title: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  location: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 18, fontWeight: '600' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: '#FCD34D', fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '500' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  capacity: { fontSize: 13 },
  emptyContainer: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24 },
  browseButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  browseButtonText: { fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16 },
});