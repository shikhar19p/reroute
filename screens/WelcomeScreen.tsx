import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Premium gradient background */}
      <LinearGradient
        colors={colors.goldGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />
      <View style={[styles.decorativeCircle, styles.circle3]} />

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontFamily: typography.fontFamily.bold }]}>
            Reroute
          </Text>
          <View style={styles.titleUnderline} />
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.medium }]}>
          Find your perfect countryside escape
        </Text>

        {/* Icon with Glassmorphism */}
        <View style={styles.iconWrapper}>
          <BlurView intensity={40} tint="light" style={styles.glassContainer}>
            <MaterialCommunityIcons
              name="home-variant"
              size={80}
              color={colors.primary}
            />
          </BlurView>
        </View>

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
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGradient, { borderRadius: borderRadius.xl }]}
          >
            <Text style={[styles.buttonText, { fontFamily: typography.fontFamily.semiBold }]}>
              Get Started
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color="white"
              style={styles.buttonIcon}
            />
          </LinearGradient>
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
    backgroundColor: '#D4AF37',
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  iconWrapper: {
    marginVertical: 40,
  },
  glassContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
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
  buttonText: {
    color: 'white',
    fontSize: 18,
    marginRight: 8,
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
