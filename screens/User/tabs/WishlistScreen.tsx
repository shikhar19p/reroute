import React, { useState, useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWishlist } from '../../../context/WishlistContext';
import { useTheme } from '../../../context/ThemeContext';
import { getApprovedFarmhouses, Farmhouse } from '../../../services/farmhouseService';

export default function WishlistScreen() {
  const navigation = useNavigation();
  const { colors, typography, shadows } = useTheme();
  const { wishlist, removeFromWishlist } = useWishlist();
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFarmhouses();
    setRefreshing(false);
  };

  const handleRemove = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFromWishlist(id);
  };

  const wishlistFarmhouses = farmhouses.filter(f => wishlist.includes(f.id));

  const renderItem = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, ...shadows.md }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        (navigation as any).navigate('FarmhouseDetail', { farmhouse: item });
      }}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }} style={styles.image} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.imageGradient}
        />
        <TouchableOpacity
          style={[styles.heartButton, { ...shadows.sm }]}
          onPress={() => handleRemove(item.id)}
        >
          <MaterialCommunityIcons name="heart" size={22} color={colors.favorite} />
        </TouchableOpacity>
        {(item.rating > 0) && (
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="star" size={14} color="white" />
            <Text style={[styles.ratingText, { fontFamily: typography.fontFamily.semiBold }]}>
              {item.rating}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
          {item.name}
        </Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
          <Text style={[styles.location, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {item.location}
          </Text>
        </View>
        <View style={styles.amenitiesRow}>
          <View style={styles.amenityItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={colors.primary} />
            <Text style={[styles.amenityText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {item.capacity}
            </Text>
          </View>
          {item.rooms > 0 && (
            <View style={styles.amenityItem}>
              <MaterialCommunityIcons name="bed" size={14} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {item.rooms}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.row}>
          <View>
            <Text style={[styles.price, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>
              ₹{item.price}
            </Text>
            <Text style={[styles.perNight, { color: colors.textTertiary, fontFamily: typography.fontFamily.regular }]}>
              per night
            </Text>
          </View>
          <TouchableOpacity style={[styles.viewButton, { backgroundColor: colors.primary, ...shadows.sm }]}>
            <Text style={[styles.viewButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
              View
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            My Wishlist
          </Text>
          <Text style={[styles.count, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {wishlist.length} {wishlist.length === 1 ? 'property' : 'properties'} saved
          </Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name="heart-multiple" size={24} color={colors.primary} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Loading wishlist...
          </Text>
        </View>
      ) : (
        <FlatList
          data={wishlistFarmhouses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, wishlistFarmhouses.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="heart-outline" size={64} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
                Your wishlist is empty
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Start adding properties you love to save them for later
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.primary, ...shadows.md }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  (navigation as any).navigate('Explore');
                }}
              >
                <MaterialCommunityIcons name="compass" size={20} color="white" />
                <Text style={[styles.browseButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
                  Explore Farmhouses
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, marginBottom: 4 },
  count: { fontSize: 14 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: { marginTop: 16, fontSize: 16 },
  list: { padding: 20, paddingBottom: 100 },
  emptyList: { flex: 1 },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden'
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200, resizeMode: 'cover' },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: { fontSize: 13, color: 'white' },
  cardContent: { padding: 16 },
  title: { fontSize: 18, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  location: { fontSize: 14 },
  amenitiesRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amenityText: { fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 22 },
  perNight: { fontSize: 12, marginTop: 2 },
  viewButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20
  },
  viewButtonText: { color: 'white', fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 16, marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  browseButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24
  },
  browseButtonText: { color: 'white', fontSize: 16 },
});
