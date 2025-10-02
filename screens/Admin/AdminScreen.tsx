import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAdmin } from '../../context/AdminContext';

type AdminScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const { farms, removeFarm } = useAdmin();

  const confirmRemove = useCallback(
    (id: string, name: string) => {
      Alert.alert('Remove Farm', `Are you sure you want to remove ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFarm(id) },
      ]);
    },
    [removeFarm]
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.farmName}>{item.name}</Text>
        <View style={styles.capacityBadge}>
          <Text style={styles.usersIcon}>👥</Text>
          <Text style={styles.capacityText}>{item.capacity}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText}>{item.city} • {item.area}</Text>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Weekly</Text>
          <Text style={styles.priceValue}>₹{item.priceWeekly}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Occasional</Text>
          <Text style={styles.priceValue}>₹{item.priceOccasional}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Weekend</Text>
          <Text style={styles.priceValue}>₹{item.priceWeekend}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AdminEditFarm', { id: item.id })}
          activeOpacity={0.7}
        >
          <Text style={styles.editIcon}>✏️</Text>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => confirmRemove(item.id, item.name)}
          activeOpacity={0.7}
        >
          <Text style={styles.trashIcon}>🗑️</Text>
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Farm Management</Text>
        <Text style={styles.subtitle}>Manage all registered farmhouses</Text>
      </View>

      <FlatList
        data={farms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No farms registered yet</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  listContent: {
    padding: 20,
  },
  separator: {
    height: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  farmName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usersIcon: {
    fontSize: 14,
  },
  capacityText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 16,
  },
  locationText: {
    fontSize: 15,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  editIcon: {
    fontSize: 18,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  trashIcon: {
    fontSize: 18,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
