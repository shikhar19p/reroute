import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdmin } from '../context/AdminContext';

export default function VacationRentalApp() {
  const { farms } = useAdmin();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Farmhouses</Text>
        <Text style={styles.subtitle}>Find your perfect getaway</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>Search location, property...</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {farms.map((farm) => (
          <TouchableOpacity key={farm.id} style={styles.card} activeOpacity={0.9}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop' }}
                style={styles.image}
              />
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(farm.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.heartIcon}>{favorites[farm.id] ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.farmName} numberOfLines={1}>{farm.name}</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>{farm.city}, {farm.area}</Text>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceTag}>
                  <Text style={styles.priceLabel}>Weekend</Text>
                  <Text style={styles.priceValue}>₹{farm.priceWeekend}</Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceLabel}>Occasional</Text>
                  <Text style={styles.priceValue}>₹{farm.priceOccasional}</Text>
                </View>
              </View>

              <View style={styles.capacityRow}>
                <Text style={styles.capacityText}>Capacity: {farm.capacity} guests</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {farms.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No farmhouses available yet</Text>
            <Text style={styles.emptySubtext}>Check back soon for amazing properties!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchIcon: {
    fontSize: 20,
  },
  searchText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 20,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  farmName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  starIcon: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceTag: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  capacityRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
