import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { getFarmhousesByOwner, Farmhouse } from '../../services/farmhouseService';

type RootStackParamList = {
  MyFarmhouses: undefined;
  FarmBasicDetails: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyFarmhouses'>;

export default function MyFarmhousesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmhouses();
  }, []);

  const loadFarmhouses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getFarmhousesByOwner(user.uid);
      setFarmhouses(data);
    } catch (error) {
      console.error('Error loading farmhouses:', error);
      Alert.alert('Error', 'Failed to load your farmhouses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return colors.placeholder;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderFarmhouse = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.farmCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => Alert.alert('Edit Farmhouse', `View/Edit ${item.name} - Coming soon!`)}
    >
      <Image
        source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/400x300' }}
        style={styles.farmImage}
      />

      <View style={styles.farmInfo}>
        <View style={styles.farmHeader}>
          <Text style={[styles.farmName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <Text style={[styles.farmLocation, { color: colors.placeholder }]} numberOfLines={1}>
          📍 {item.location}
        </Text>

        <View style={styles.farmDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.placeholder }]}>Price</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>₹{item.price}/night</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.placeholder }]}>Capacity</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.capacity} guests</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.placeholder }]}>Rooms</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.bedrooms}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏡</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Farmhouses Yet</Text>
      <Text style={[styles.emptyText, { color: colors.placeholder }]}>
        Start by adding your first farmhouse property
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
        onPress={() => navigation.navigate('FarmBasicDetails' as never)}
      >
        <Text style={[styles.addButtonText, { color: colors.buttonText }]}>
          + Add Farmhouse
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Farmhouses</Text>
          <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
            {farmhouses.length} {farmhouses.length === 1 ? 'property' : 'properties'}
          </Text>
        </View>

        {farmhouses.length > 0 && (
          <TouchableOpacity
            style={[styles.addIconButton, { backgroundColor: colors.buttonBackground }]}
            onPress={() => navigation.navigate('FarmBasicDetails' as never)}
          >
            <Text style={[styles.addIcon, { color: colors.buttonText }]}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {farmhouses.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={farmhouses}
          renderItem={renderFarmhouse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  farmCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  farmImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  farmInfo: {
    padding: 16,
  },
  farmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  farmName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  farmLocation: {
    fontSize: 14,
    marginBottom: 12,
  },
  farmDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
