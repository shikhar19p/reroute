import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAdmin } from '../../context/AdminContext';

type AdminScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const { farms, loading, approveFarm, rejectFarm, removeFarm } = useAdmin();

  const handleApprove = useCallback(
    async (id: string, name: string) => {
      Alert.alert('Approve Farm', `Approve ${name} for listing?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await approveFarm(id);
              Alert.alert('Success', `${name} has been approved!`);
            } catch (error) {
              Alert.alert('Error', 'Failed to approve farm');
            }
          }
        },
      ]);
    },
    [approveFarm]
  );

  const handleReject = useCallback(
    async (id: string, name: string) => {
      Alert.alert('Reject Farm', `Reject ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectFarm(id);
              Alert.alert('Success', `${name} has been rejected`);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject farm');
            }
          }
        },
      ]);
    },
    [rejectFarm]
  );

  const confirmRemove = useCallback(
    async (id: string, name: string) => {
      Alert.alert('Delete Farm', `Are you sure you want to delete ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFarm(id);
              Alert.alert('Success', `${name} has been deleted`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete farm');
            }
          }
        },
      ]);
    },
    [removeFarm]
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.farmName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FEF3C7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'pending' ? '#92400E' : '#991B1B' }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText}>{item.city} • {item.area}</Text>
      </View>

      <View style={styles.capacityRow}>
        <Text style={styles.usersIcon}>👥</Text>
        <Text style={styles.capacityText}>{item.capacity} guests</Text>
        <Text style={styles.separator}>•</Text>
        <Text style={styles.bedroomsText}>🏠 {item.bedrooms} bedrooms</Text>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Weekday</Text>
          <Text style={styles.priceValue}>₹{item.price}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Weekend</Text>
          <Text style={styles.priceValue}>₹{item.weekendPrice}</Text>
        </View>
      </View>

      <View style={styles.ownerInfo}>
        <Text style={styles.ownerLabel}>Owner:</Text>
        <Text style={styles.ownerEmail}>{item.ownerEmail}</Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleApprove(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>✓</Text>
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleReject(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>✕</Text>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmRemove(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmRemove(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.trashIcon}>🗑️</Text>
            <Text style={styles.removeButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Farms</Text>
        <Text style={styles.subtitle}>Review and approve farmhouse registrations</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading farms...</Text>
        </View>
      ) : (
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
      )}
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  usersIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  capacityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  separator: {
    marginHorizontal: 8,
    color: '#D1D5DB',
  },
  bedroomsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ownerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  ownerEmail: {
    fontSize: 13,
    color: '#1F2937',
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
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    width: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonIcon: {
    fontSize: 18,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
