import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../authContext';
import { useTheme } from '../../context/ThemeContext';
import { getResponsivePadding, isSmallDevice } from '../../utils/responsive';

type RootStackParamList = {
  OwnerHome: undefined;
  FarmBasicDetails: undefined;
  MyFarmhouses: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerHome'>;

export default function OwnerHomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors, typography, isDark } = useTheme();

  const handleAddFarmhouse = () => {
    navigation.navigate('FarmBasicDetails' as never);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
            Welcome, {user?.displayName?.split(' ')[0] || 'Owner'}!
          </Text>
          <Text style={[styles.subGreeting, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
            Start building your farmhouse business
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.placeholder} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroIconContainer}>
              <MaterialCommunityIcons name="home-heart" size={80} color="white" />
            </View>
            <Text style={[styles.heroTitle, { fontFamily: typography.fontFamily.bold }]}>
              List Your First Farmhouse
            </Text>
            <Text style={[styles.heroSubtitle, { fontFamily: typography.fontFamily.regular }]}>
              Share your beautiful property with travelers and start earning today
            </Text>

            {/* Add Farmhouse Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFarmhouse}
              activeOpacity={0.9}
            >
              <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
              <Text style={[styles.addButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
                Add Your Farmhouse
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
            What You Can Do
          </Text>

          <View style={styles.featuresList}>
            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <MaterialCommunityIcons name="image-multiple" size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                  Showcase Your Property
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
                  Upload beautiful photos and detailed descriptions
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.secondary}20` }]}>
                <MaterialCommunityIcons name="calendar-check" size={28} color={colors.secondary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                  Manage Bookings
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
                  Track reservations and availability in real-time
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}20` }]}>
                <MaterialCommunityIcons name="cash-multiple" size={28} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                  Flexible Pricing
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
                  Set different rates for weekdays, weekends, and special occasions
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.secondary}20` }]}>
                <MaterialCommunityIcons name="shield-check" size={28} color={colors.secondary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text, fontFamily: typography.fontFamily.semiBold }]}>
                  Secure Platform
                </Text>
                <Text style={[styles.featureDescription, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
                  Your information and earnings are protected with bank-level security
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={[styles.ctaText, { color: colors.placeholder, fontFamily: typography.fontFamily.regular }]}>
            Ready to get started? Add your farmhouse now and join our community of hosts!
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.primary }]}
            onPress={handleAddFarmhouse}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
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
    paddingBottom: 40,
  },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroGradient: {
    padding: 32,
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
    marginBottom: 30,
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
