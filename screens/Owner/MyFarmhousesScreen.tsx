import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LogOut, MapPin, Home, ChevronRight, Compass, Bell } from 'lucide-react-native';
import { useAuth } from '../../authContext';
import { useOwnerBookings } from '../../GlobalDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Farmhouse } from '../../services/farmhouseService';
import { getResponsivePadding, isSmallDevice } from '../../utils/responsive';
import { useDialog } from '../../components/CustomDialog';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { getStatusColor, getStatusText } from '../../utils/statusColors';
import { useMyFarmhouses } from '../../GlobalDataContext';

type RootStackParamList = {
  MyFarmhouses: undefined;
  FarmBasicDetails: undefined;
  FarmhouseDetailOwner: { farmhouseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyFarmhouses'>;

export default function MyFarmhousesScreen({ navigation }: Props) {
  const { user, logout, switchRole } = useAuth();
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const { hasDraft, loadDraft, clearDraft } = useFarmRegistration();
  const { data: farmhouses, loading, refreshing, refresh: onRefresh } = useMyFarmhouses();
  const { data: ownerBookings } = useOwnerBookings();
  const pendingCount = ownerBookings.filter(b => b.status === 'pending').length;

  const handleLogout = () => {
    showDialog({
      title: 'Logout',
      message: "You'll need to sign in again to continue.",
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              showDialog({
                title: 'Error',
                message: 'Failed to logout',
                type: 'error'
              });
            }
          }
        }
      ]
    });
  };

  const renderFarmhouse = ({ item }: { item: Farmhouse }) => (
    <TouchableOpacity
      style={[styles.farmCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('FarmhouseDetailOwner', { farmhouseId: item.id })}
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

        <View style={styles.locationRow}>
          <MapPin size={12} color={colors.placeholder} />
          <Text style={[styles.farmLocation, { color: colors.placeholder }]} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.farmDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.placeholder }]}>Capacity</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.capacity} guests</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.placeholder }]}>Bedrooms</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.bedrooms}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Home size={52} color={colors.placeholder} style={{ marginBottom: 16 }} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Farmhouses</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.switchButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => switchRole('customer')}
            >
              <Compass size={16} color={colors.primary} />
              <Text style={[styles.switchButtonText, { color: colors.primary }]}>Explorer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => navigation.navigate('OwnerNotifications' as never)}
            >
              <Bell size={20} color={colors.text} />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRow}>
          <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
            {farmhouses.length} {farmhouses.length === 1 ? 'property' : 'properties'}
          </Text>
          {farmhouses.length > 0 && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.smallPillButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => navigation.navigate('OwnerBookings' as never)}
              >
                <Text style={[styles.smallPillText, { color: colors.text }]}>Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addIconButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => navigation.navigate('FarmBasicDetails' as never)}
              >
                <Text style={[styles.addIcon, { color: colors.buttonText }]}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Draft Resume Banner */}
      {hasDraft && (
        <TouchableOpacity
          style={[styles.draftBanner, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}
          onPress={async () => {
            showDialog({
              title: 'Resume Draft?',
              message: 'You have a saved draft of your farmhouse registration. Would you like to continue where you left off?',
              type: 'info',
              buttons: [
                {
                  text: 'Delete Draft',
                  style: 'destructive',
                  onPress: async () => {
                    await clearDraft();
                  }
                },
                {
                  text: 'Resume',
                  style: 'default',
                  onPress: async () => {
                    await loadDraft();
                    navigation.navigate('FarmBasicDetails' as never);
                  }
                }
              ]
            });
          }}
        >
          <View style={styles.draftContent}>
            <View style={[styles.draftIconBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.draftIconText, { color: colors.primary }]}>Draft</Text>
            </View>
            <View style={styles.draftTextContainer}>
              <Text style={[styles.draftTitle, { color: colors.text }]}>
                Continue Registration
              </Text>
              <Text style={[styles.draftSubtitle, { color: colors.placeholder }]}>
                You have an incomplete farmhouse registration
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.placeholder} />
        </TouchableOpacity>
      )}

      {farmhouses.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={farmhouses}
          renderItem={renderFarmhouse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.buttonBackground]}
              tintColor={colors.buttonBackground}
            />
          }
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
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallDevice() ? 24 : 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: isSmallDevice() ? 12 : 14,
    marginTop: 4,
  },
  addIconButton: {
    width: isSmallDevice() ? 32 : 36,
    height: isSmallDevice() ? 32 : 36,
    borderRadius: isSmallDevice() ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addIcon: {
    fontSize: isSmallDevice() ? 20 : 22,
    fontWeight: '300',
  },
  smallPillButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: isSmallDevice() ? 8 : 12,
    paddingVertical: isSmallDevice() ? 6 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0, // Prevent shrinking
  },
  smallPillText: { fontSize: isSmallDevice() ? 11 : 12, fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: isSmallDevice() ? 40 : 44,
    borderRadius: isSmallDevice() ? 20 : 22,
    borderWidth: 1,
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  iconButton: {
    width: isSmallDevice() ? 40 : 44,
    height: isSmallDevice() ? 40 : 44,
    borderRadius: isSmallDevice() ? 20 : 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: getResponsivePadding(20),
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  draftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  draftTextContainer: {
    flex: 1,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  draftSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  draftArrow: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    flexShrink: 1,
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
    fontSize: 13,
    flex: 1,
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
  draftIconBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  draftIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
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
