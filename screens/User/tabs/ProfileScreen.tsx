import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../authContext';
import { useTheme } from '../../../context/ThemeContext';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age?: number;
  address?: string;
  gender?: string;
  
  totalBookings: number;
  memberSince: string;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          name: data.name || user.displayName || 'No Name',
          email: user.email,
          phone: data.phone || user.phoneNumber || 'Not Provided',
          age: data.age,
          address: data.address,
          gender: data.gender,
         
          totalBookings: data.totalBookings || 0,
          memberSince: data.memberSince || 'N/A',
        });
      } else {
        // Create a default profile if one doesn't exist
        setProfile({
          name: user.displayName || 'Guest User',
          email: user.email,
          phone: user.phoneNumber || 'Not Provided',
          totalBookings: 0,
          memberSince: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      Alert.alert("Error", "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFocused && user) {
      fetchUserProfile();
    }
  }, [isFocused, user, fetchUserProfile]);

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'uploaded': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getKYCStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'VERIFIED';
      case 'uploaded': return 'PENDING';
      default: return 'NOT UPLOADED';
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }]);
  };

  const MenuButton = ({ title, onPress, color = colors.text }: { title: string; onPress: () => void; color?: string }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuText, { color }]}>{title}</Text>
      <Text style={[styles.menuArrow, { color: colors.placeholder }]}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
     return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Could not load profile. Please try again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
              <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                {(profile.name).split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{profile.name}</Text>
            <Text style={[styles.userEmail, { color: colors.placeholder }]}>{profile.email}</Text>
            <Text style={[styles.userPhone, { color: colors.placeholder }]}>{profile.phone}</Text>
          </View>
        </View>

        

        <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.buttonBackground }]}>{profile.totalBookings}</Text>
              <Text style={[styles.statLabel, { color: colors.placeholder }]}>Total Bookings</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.buttonBackground }]}>{profile.memberSince}</Text>
              <Text style={[styles.statLabel, { color: colors.placeholder }]}>Member Since</Text>
            </View>
        </View>
        {/* --- End KYC and Stats Cards --- */}

        <View style={[styles.menuCard, { backgroundColor: colors.cardBackground }]}>
          <MenuButton title="Edit Profile" onPress={() => navigation.navigate('EditProfile', { profile })} />

          <View style={styles.menuItem}>
            <Text style={[styles.menuText, { color: colors.text }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: colors.buttonBackground }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Text>
            <Text style={[styles.menuArrow, { color: colors.placeholder }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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
  statsCard: { margin: 20, marginTop: 0, borderRadius: 15, padding: 20, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  statLabel: { fontSize: 14, textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 20 },
  menuCard: { margin: 20, marginTop: 0, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { fontSize: 16, fontWeight: '500' },
  menuArrow: { fontSize: 20, fontWeight: 'bold' },
});