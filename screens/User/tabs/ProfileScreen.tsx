import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../authContext';
import { useTheme } from '../../../context/ThemeContext';
import { useScrollHandler } from '../../../context/TabBarVisibilityContext';
import { useDialog } from '../../../components/CustomDialog';
import { Calendar, MapPin, Heart, ChevronRight, LogOut, Home } from 'lucide-react-native';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age?: number;
  address?: string;
  gender?: string;
  totalBookings: number;
  upcomingBookings: number;
  pastBookings: number;
  cancelledBookings: number;
  memberSince: string;
  wishlistCount: number;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const scrollHandler = useScrollHandler();
  const { showDialog } = useDialog();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(bookingsRef, where('userId', '==', user.uid));
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let upcoming = 0, past = 0, cancelled = 0;
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
        const checkIn = new Date(booking.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        if (booking.status === 'cancelled') cancelled++;
        else if (checkIn > now) upcoming++;
        else past++;
      });

      if (userDoc.exists()) {
        const data = userDoc.data();
        const wishlistCount = Array.isArray(data.wishlist) ? data.wishlist.length : 0;
        let memberSince = 'Recently';
        try {
          if (data.createdAt?.toDate) {
            memberSince = new Date(data.createdAt.toDate()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          } else if (data.createdAt) {
            memberSince = new Date(data.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          }
        } catch {}

        setProfile({
          name: data.name || user.displayName || 'No Name',
          email: user.email || 'No email',
          phone: data.phone || user.phoneNumber || 'Not Provided',
          age: data.age, address: data.address, gender: data.gender,
          totalBookings: bookingsSnapshot.size,
          upcomingBookings: upcoming, pastBookings: past, cancelledBookings: cancelled,
          memberSince, wishlistCount,
        });
      } else {
        setProfile({
          name: user.displayName || 'Guest User',
          email: user.email || 'No email',
          phone: user.phoneNumber || 'Not Provided',
          totalBookings: bookingsSnapshot.size,
          upcomingBookings: upcoming, pastBookings: past, cancelledBookings: cancelled,
          memberSince: 'Recently', wishlistCount: 0,
        });
      }
    } catch {
      showDialog({ title: 'Error', message: 'Could not load your profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isFocused && user) fetchUserProfile();
  }, [isFocused, user, fetchUserProfile]);

  const handleLogout = () => {
    showDialog({
      title: 'Logout',
      message: "You'll need to sign in again to continue.",
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ],
    });
  };

  const MenuItem = ({
    title, onPress, right, color,
  }: { title: string; onPress?: () => void; right?: React.ReactNode; color?: string }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Text style={[styles.menuText, { color: color || colors.text }]}>{title}</Text>
      {right ?? <ChevronRight size={18} color={colors.placeholder} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
        <Text style={{ color: colors.placeholder }}>Could not load profile.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler.onScroll}
        scrollEventThrottle={scrollHandler.scrollEventThrottle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.buttonBackground} colors={[colors.buttonBackground]} />
        }
      >
        {/* Avatar + info */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
            <Text style={[styles.avatarText, { color: colors.buttonText }]}>
              {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{profile.name}</Text>
          <View style={[styles.memberBadge, { backgroundColor: colors.surfaceOverlay }]}>
            <Calendar size={12} color={colors.primary} />
            <Text style={[styles.memberText, { color: colors.primary }]}>Member since {profile.memberSince}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: <Calendar size={20} color={colors.primary} />, value: profile.upcomingBookings, label: 'Upcoming', onPress: () => navigation.navigate('Bookings') },
            { icon: <MapPin size={20} color={colors.primary} />, value: profile.pastBookings, label: 'Completed', onPress: () => navigation.navigate('Bookings') },
            { icon: <Heart size={20} color={colors.primary} />, value: profile.wishlistCount, label: 'Wishlist', onPress: () => navigation.navigate('Wishlist') },
          ].map((stat, i) => (
            <TouchableOpacity key={i} style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={stat.onPress} activeOpacity={0.7}>
              {stat.icon}
              <Text style={[styles.statNumber, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.placeholder }]}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <MenuItem title="Edit Profile" onPress={() => navigation.navigate('EditProfile', { profile })} />

          <View style={[styles.menuItem, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#F5F5F5'}
            />
          </View>

          <View style={[styles.menuItem, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#F5F5F5'}
            />
          </View>

          {user?.roles?.includes('owner') && (
            <MenuItem
              title="Switch to Owner Dashboard"
              onPress={() => switchRole('owner')}
              right={<Home size={18} color={colors.primary} />}
            />
          )}

          <MenuItem
            title="Logout"
            onPress={handleLogout}
            color={colors.error}
            right={<LogOut size={18} color={colors.error} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  profileCard: {
    margin: 20, marginTop: 12,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    padding: 20, alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  userDetail: { fontSize: 14, marginBottom: 2 },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 10,
  },
  memberText: { fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  menuCard: {
    marginHorizontal: 20, marginBottom: 20,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuText: { fontSize: 15, fontWeight: '500' },
});
