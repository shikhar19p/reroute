import React, { useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import AnimatedImage from '../../../components/AnimatedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Users, Star } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useWishlist } from '../../../context/WishlistContext';
import { useTheme } from '../../../context/ThemeContext';
import { useScrollHandler } from '../../../context/TabBarVisibilityContext';
import { useDialog } from '../../../components/CustomDialog';
import { getFarmhouseById } from '../../../services/farmhouseService';
import { Farmhouse } from '../../../types/navigation';

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { wishlist, removeFromWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();
  const [wishlistFarmhouses, setWishlistFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWishlistFarmhouses = useCallback(async () => {
    setLoading(true);
    if (wishlist.length > 0) {
      try {
        const results = await Promise.all(wishlist.map(id => getFarmhouseById(id)));
        setWishlistFarmhouses(results.filter((f): f is Farmhouse => f !== null && f.status === 'approved'));
      } catch {
        showDialog({ title: 'Error', message: 'Could not load your wishlist.', type: 'error' });
      }
    } else {
      setWishlistFarmhouses([]);
    }
    setLoading(false);
  }, [wishlist, showDialog]);

  useFocusEffect(useCallback(() => { loadWishlistFarmhouses(); }, [loadWishlistFarmhouses]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWishlistFarmhouses();
    setRefreshing(false);
  }, [loadWishlistFarmhouses]);

  const renderItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <AnimatedImage
          uri={item.photos?.[0] || ''}
          style={styles.image}
        />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => removeFromWishlist(item.id)}
        >
          <Heart size={18} color={colors.favorite} fill={colors.favorite} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>

        <View style={styles.locationRow}>
          <MapPin size={13} color={colors.placeholder} />
          <Text style={[styles.location, { color: colors.placeholder }]} numberOfLines={1}>{item.location}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.buttonBackground }]}>
            ₹{item.weekendNight || item.weeklyNight || 0}/night
          </Text>
          <View style={styles.ratingRow}>
            <Star size={13} color={colors.rating} fill={colors.rating} />
            <Text style={[styles.rating, { color: colors.text }]}>{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>

        <View style={styles.capacityRow}>
          <Users size={13} color={colors.placeholder} />
          <Text style={[styles.capacity, { color: colors.placeholder }]}>Up to {item.capacity} guests</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wishlist</Text>
        <Text style={[styles.count, { color: colors.placeholder }]}>
          {wishlistFarmhouses.length} {wishlistFarmhouses.length === 1 ? 'property' : 'properties'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
        </View>
      ) : (
        <FlatList
          data={wishlistFarmhouses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler.onScroll}
          scrollEventThrottle={scrollHandler.scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.buttonBackground]}
              tintColor={colors.buttonBackground}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Heart size={52} color={colors.placeholder} />
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No saved properties yet
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => navigation.navigate('Explore')}
              >
                <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>Browse</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  count: { fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    borderRadius: 12, marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 180 },
  heartButton: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { padding: 14 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  location: { fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 16, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 13, fontWeight: '500' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  capacity: { fontSize: 13 },
  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  browseButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 4 },
  browseButtonText: { fontSize: 15, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
