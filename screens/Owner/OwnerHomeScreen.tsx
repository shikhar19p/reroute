import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LogOut, Home, PlusCircle, Images, CalendarCheck, Banknote, ShieldCheck, FileText, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { getResponsivePadding, isSmallDevice } from '../../utils/responsive';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem(key);
}

type RootStackParamList = {
  OwnerHome: undefined;
  FarmBasicDetails: undefined;
  MyFarmhouses: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerHome'>;

export default function OwnerHomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const [draftInfo, setDraftInfo] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    storageGet(`farm_registration_draft_${user.uid}`).then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setDraftInfo({ name: parsed.name || 'Untitled property' });
        }
      } catch {
        setDraftInfo({ name: 'Untitled property' });
      }
    });
  }, [user?.uid]);

  const handleAddFarmhouse = () => {
    navigation.navigate('FarmBasicDetails' as never);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Welcome, {user?.displayName?.split(' ')[0] || 'Owner'}!
          </Text>
          <Text style={[styles.subGreeting, { color: colors.placeholder }]}>
            Start building your farmhouse business
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={24} color={colors.placeholder} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Draft Banner */}
        {draftInfo && (
          <TouchableOpacity
            style={[styles.draftBanner, { backgroundColor: isDark ? '#1c1a10' : '#FFFBEB', borderColor: '#D4AF37' }]}
            onPress={handleAddFarmhouse}
            activeOpacity={0.8}
          >
            <View style={styles.draftIconWrap}>
              <FileText size={22} color="#D4AF37" />
            </View>
            <View style={styles.draftText}>
              <Text style={[styles.draftTitle, { color: colors.text }]}>Continue Draft</Text>
              <Text style={[styles.draftSub, { color: colors.placeholder }]} numberOfLines={1}>
                {draftInfo.name}
              </Text>
            </View>
            <ChevronRight size={20} color="#D4AF37" />
          </TouchableOpacity>
        )}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroIconContainer}>
              <Home size={80} color="white" />
            </View>
            <Text style={styles.heroTitle}>
              List Your First Farmhouse
            </Text>
            <Text style={styles.heroSubtitle}>
              Share your beautiful property with travelers and start earning today
            </Text>

            {/* Add Farmhouse Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFarmhouse}
              activeOpacity={0.9}
            >
              <PlusCircle size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>
                Add Your Farmhouse
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What You Can Do
          </Text>

          <View style={styles.featuresList}>
            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Images size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Showcase Your Property
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder }]}>
                  Upload beautiful photos and detailed descriptions
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <CalendarCheck size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Manage Bookings
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder }]}>
                  Track reservations and availability in real-time
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Banknote size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Flexible Pricing
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder }]}>
                  Set different rates for weekdays, weekends, and special occasions
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <ShieldCheck size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Secure Platform
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder }]}>
                  Your information and earnings are protected with bank-level security
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={[styles.ctaText, { color: colors.placeholder }]}>
            Ready to get started? Add your farmhouse now and join our community of hosts!
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.primary }]}
            onPress={handleAddFarmhouse}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
  },
  logoutButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  draftBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftText: { flex: 1 },
  draftTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  draftSub: { fontSize: 13 },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroGradient: {
    padding: 24,
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 18,
    marginLeft: 12,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 16,
  },
  featuresList: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  secondaryButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
