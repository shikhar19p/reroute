import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../authContext';
import { useTheme } from '../../../context/ThemeContext';
import { useScrollHandler, useTabBarVisibility } from '../../../context/TabBarVisibilityContext';
import { useDialog } from '../../../components/CustomDialog';
import { ChevronRight, LogOut, Home, HelpCircle, FileText, Shield, Phone, Mail } from 'lucide-react-native';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age?: number;
  address?: string;
  gender?: string;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const scrollHandler = useScrollHandler();
  const { showTabBar } = useTabBarVisibility();
  const { showDialog } = useDialog();
  const isFocused = useIsFocused();

  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          name: data.name || user.displayName || 'No Name',
          email: user.email || 'No email',
          phone: data.phone || user.phoneNumber || 'Not Provided',
          age: data.age, address: data.address, gender: data.gender,
        });
      } else {
        setProfile({
          name: user.displayName || 'Guest User',
          email: user.email || 'No email',
          phone: user.phoneNumber || 'Not Provided',
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
    title, onPress, right, color, icon,
  }: { title: string; onPress?: () => void; right?: React.ReactNode; color?: string; icon?: React.ReactNode }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      {icon && <View style={styles.menuIcon}>{icon}</View>}
      <Text style={[styles.menuText, { color: color || colors.text, flex: 1 }]}>{title}</Text>
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
          <View style={styles.contactRow}>
            <Mail size={13} color={colors.placeholder} />
            <Text style={[styles.contactText, { color: colors.placeholder }]}>{profile.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <Phone size={13} color={colors.placeholder} />
            <Text style={[styles.contactText, { color: colors.placeholder }]}>{profile.phone}</Text>
          </View>
        </View>

        {/* Account */}
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

          {/* Theme Preview */}
          <View style={[styles.themePreviewRow, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity
              style={[
                styles.themePreviewCard,
                { backgroundColor: '#F7F7F7', borderColor: !isDark ? colors.primary : '#E8E8E8', borderWidth: !isDark ? 2 : StyleSheet.hairlineWidth },
              ]}
              onPress={() => isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <View style={styles.themePreviewSwatch}>
                <View style={[styles.swatchBar, { backgroundColor: '#C5A565' }]} />
                <View style={[styles.swatchLine, { backgroundColor: '#111111', width: '70%' }]} />
                <View style={[styles.swatchLine, { backgroundColor: '#555555', width: '50%' }]} />
              </View>
              <Text style={[styles.themePreviewLabel, { color: '#111111' }]}>Light</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themePreviewCard,
                { backgroundColor: '#111111', borderColor: isDark ? colors.primary : '#1F1F1F', borderWidth: isDark ? 2 : StyleSheet.hairlineWidth },
              ]}
              onPress={() => !isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <View style={styles.themePreviewSwatch}>
                <View style={[styles.swatchBar, { backgroundColor: '#C5A565' }]} />
                <View style={[styles.swatchLine, { backgroundColor: '#FFFFFF', width: '70%' }]} />
                <View style={[styles.swatchLine, { backgroundColor: '#A0A0A0', width: '50%' }]} />
              </View>
              <Text style={[styles.themePreviewLabel, { color: '#FFFFFF' }]}>Dark</Text>
            </TouchableOpacity>
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

        {/* Support & Legal */}
        <Text style={[styles.sectionLabel, { color: colors.placeholder }]}>Support & Legal</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <MenuItem
            title="FAQs"
            icon={<HelpCircle size={17} color={colors.primary} />}
            onPress={() => navigation.navigate('FAQs')}
          />
          <MenuItem
            title="Contact Us"
            icon={<Phone size={17} color={colors.primary} />}
            onPress={() => navigation.navigate('ContactUs')}
          />
          <MenuItem
            title="Privacy Policy"
            icon={<Shield size={17} color={colors.primary} />}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <MenuItem
            title="Terms & Conditions"
            icon={<FileText size={17} color={colors.primary} />}
            onPress={() => navigation.navigate('TermsAndConditions')}
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
  userName: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  contactText: { fontSize: 13 },
  menuCard: {
    marginHorizontal: 20, marginBottom: 20,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuText: { fontSize: 15, fontWeight: '500' },
  menuIcon: { marginRight: 10 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.8, marginHorizontal: 20, marginTop: 8, marginBottom: 6,
  },
  themePreviewRow: {
    flexDirection: 'row', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themePreviewCard: {
    flex: 1, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 8,
  },
  themePreviewSwatch: { width: '100%', gap: 5 },
  swatchBar: { height: 6, borderRadius: 3, width: '100%' },
  swatchLine: { height: 4, borderRadius: 2 },
  themePreviewLabel: { fontSize: 12, fontWeight: '700' },
});
