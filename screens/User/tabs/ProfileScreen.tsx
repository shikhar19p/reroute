import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../authContext';
import { useTheme } from '../../../context/ThemeContext';
import { useScrollHandler } from '../../../context/TabBarVisibilityContext';
import { useDialog } from '../../../components/CustomDialog';
import { Calendar, MapPin, Heart, Bell, Shield, HelpCircle, LogOut as LogOutIcon } from 'lucide-react-native';

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
  const { user, logout } = useAuth();
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

      // Fetch booking statistics
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

        if (booking.status === 'cancelled') {
          cancelled++;
        } else if (checkIn > now) {
          upcoming++;
        } else {
          past++;
        }
      });

      if (userDoc.exists()) {
        const data = userDoc.data();
        
        // Get wishlist count from user document's wishlist array
        const wishlistCount = Array.isArray(data.wishlist) ? data.wishlist.length : 0;
        
        let memberSince = 'Recently';
        try {
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            memberSince = new Date(data.createdAt.toDate()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          } else if (data.createdAt) {
            memberSince = new Date(data.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          }
        } catch (error) {
          console.log('Error parsing createdAt:', error);
        }

        setProfile({
          name: data.name || user.displayName || 'No Name',
          email: user.email || 'No email',
          phone: data.phone || user.phoneNumber || 'Not Provided',
          age: data.age,
          address: data.address,
          gender: data.gender,
          totalBookings: bookingsSnapshot.size,
          upcomingBookings: upcoming,
          pastBookings: past,
          cancelledBookings: cancelled,
          memberSince: memberSince,
          wishlistCount: wishlistCount,
        });
      } else {
        setProfile({
          name: user.displayName || 'Guest User',
          email: user.email || 'No email',
          phone: user.phoneNumber || 'Not Provided',
          totalBookings: bookingsSnapshot.size,
          upcomingBookings: upcoming,
          pastBookings: past,
          cancelledBookings: cancelled,
          memberSince: 'Recently',
          wishlistCount: 0, // No wishlist if user document doesn't exist
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      showDialog({
        title: "Error",
        message: "Could not load your profile.",
        type: "error"
      });
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
    if (isFocused && user) {
      fetchUserProfile();
    }
  }, [isFocused, user, fetchUserProfile]);

  const handleLogout = () => {
    showDialog({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    });
  };

  const MenuButton = ({ title, onPress, color = colors.text }: { title: string; onPress: () => void; color?: string }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuText, { color }]}>{title}</Text>
      <Text style={[styles.menuArrow, { color: colors.placeholder }]}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
     return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
        <Text style={{ color: colors.text }}>Could not load profile. Please try again.</Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.buttonBackground]}
            tintColor={colors.buttonBackground}
          />
        }
      >
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
              <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{profile.name}</Text>
            <Text style={[styles.userEmail, { color: colors.placeholder }]}>{profile.email}</Text>
            <Text style={[styles.userPhone, { color: colors.placeholder }]}>{profile.phone}</Text>
            <View style={[styles.memberBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.1)' }]}>
              <Calendar size={14} color={colors.primary} />
              <Text style={[styles.memberText, { color: colors.primary }]}>Member since {profile.memberSince}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Calendar size={24} color="#10B981" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile.upcomingBookings}</Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <MapPin size={24} color="#3B82F6" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile.pastBookings}</Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Heart size={24} color="#EF4444" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile.wishlistCount}</Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>Wishlist</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.cardBackground }]}>
          <View style={{ borderBottomColor: isDark ? colors.border : '#E5E7EB' }}>
            <MenuButton title="Edit Profile" onPress={() => navigation.navigate('EditProfile', { profile })} />
          </View>

          <View style={[styles.menuItem, { borderBottomColor: isDark ? colors.border : '#E5E7EB' }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: isDark ? '#555' : '#D1D5DB', true: '#D4AF37' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? '#555' : '#D1D5DB'}
            />
          </View>

          <View style={[styles.menuItem, { borderBottomColor: isDark ? colors.border : '#E5E7EB' }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: isDark ? '#555' : '#D1D5DB', true: '#D4AF37' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? '#555' : '#D1D5DB'}
            />
          </View>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Text style={[styles.menuText, { color: '#F44336' }]}>Logout</Text>
            <Text style={[styles.menuArrow, { color: '#F44336' }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  profileCard: { margin: 20, marginTop: 0, borderRadius: 15, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold' },
  userInfo: { alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  userEmail: { fontSize: 14, marginBottom: 3 },
  userPhone: { fontSize: 14, marginBottom: 10 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12
  },
  memberText: { fontSize: 12, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, textAlign: 'center' },
  menuCard: { margin: 20, marginTop: 0, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  menuText: { fontSize: 16, fontWeight: '500' },
  menuArrow: { fontSize: 20, fontWeight: 'bold' },
});