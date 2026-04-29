import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import AnimatedImage from '../../../components/AnimatedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Users, Star } from 'lucide-react-native';
import { useWishlist } from '../../../context/WishlistContext';
import { useTheme } from '../../../context/ThemeContext';
import { useScrollHandler, useTabBarVisibility } from '../../../context/TabBarVisibilityContext';
import { useFocusEffect } from '@react-navigation/native';
import { Farmhouse } from '../../../types/navigation';
import { useAvailableFarmhouses } from '../../../GlobalDataContext';
import { resolveRatings } from '../../../utils/ratingsCache';

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { wishlist, removeFromWishlist } = useWishlist();
  const scrollHandler = useScrollHandler();
  const { showTabBar } = useTabBarVisibility();
  const { data: allFarmhouses, loading, refreshing, refresh } = useAvailableFarmhouses();
  const [wishlistRatings, setWishlistRatings] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));

  // Filter from live onSnapshot-backed list — auto-updates when ratings change
  const wishlistFarmhouses = useMemo(
    () => allFarmhouses.filter(f => wishlist.includes(f.id)),
    [allFarmhouses, wishlist]
  );

  useEffect(() => {
    resolveRatings(wishlistFarmhouses, (incoming) => {
      setWishlistRatings(prev => ({ ...prev, ...incoming }));
    });
  }, [wishlistFarmhouses]);

  const onRefresh = useCallback(() => { refresh(); }, [refresh]);

  const renderItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetail', { farmhouse: item })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <AnimatedImage uri={item.photos?.[0] || ''} style={styles.image} />
        <TouchableOpacity style={styles.heartButton} onPress={() => removeFromWishlist(item.id)}>
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
            <Text style={[styles.rating, { color: colors.text }]}>
              {(wishlistRatings[item.id] ?? item.rating) > 0
                ? (wishlistRatings[item.id] ?? item.rating).toFixed(1)
                : 'New'}
            </Text>
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
          loading ? null : (
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
          )
        }
      />
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
});
