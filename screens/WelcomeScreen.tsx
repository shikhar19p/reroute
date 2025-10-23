import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PremiumLogo from '../components/PremiumLogo';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Premium gradient background */}
      <LinearGradient
        colors={['#0F766E', '#0D9488', '#14B8A6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />
      <View style={[styles.decorativeCircle, styles.circle3]} />

      <View style={styles.content}>
        {/* Premium Logo */}
        <View style={styles.logoContainer}>
          <PremiumLogo size="large" variant="light" />
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.medium }]}>
          Find your perfect countryside escape
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem icon="map-marker" text="Premium Locations" colors={colors} typography={typography} />
          <FeatureItem icon="shield-check" text="Verified Hosts" colors={colors} typography={typography} />
          <FeatureItem icon="calendar-heart" text="Easy Booking" colors={colors} typography={typography} />
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={[styles.button, { borderRadius: borderRadius.xl, ...shadows.lg }]}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.9}
        >
          <View style={[styles.buttonGradient, styles.whiteButton, { borderRadius: borderRadius.xl }]}>
            <Text style={[styles.buttonText, styles.buttonTextDark, { fontFamily: typography.fontFamily.semiBold }]}>
              Get Started
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color="#0D9488"
              style={styles.buttonIcon}
            />
          </View>
        </TouchableOpacity>

        <Text style={[styles.footerText, { fontFamily: typography.fontFamily.regular }]}>
          Your journey to tranquility begins here
        </Text>
      </View>
    </View>
  );
}

// Feature Item Component
function FeatureItem({ icon, text, colors, typography }: any) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons name={icon} size={20} color="rgba(255, 255, 255, 0.9)" />
      <Text style={[styles.featureText, { fontFamily: typography.fontFamily.medium }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D9488',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.3,
    left: -75,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 8,
    lineHeight: 26,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
    textAlign: 'center',
  },
  button: {
    width: width - 60,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteButton: {
    backgroundColor: 'white',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    marginRight: 8,
  },
  buttonTextDark: {
    color: '#0D9488',
  },
  buttonIcon: {
    marginLeft: 4,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 24,
    textAlign: 'center',
  },
});
