import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PremiumLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark' | 'gradient';
}

export default function PremiumLogo({ size = 'medium', variant = 'light' }: PremiumLogoProps) {
  const dimensions = {
    small: { logoSize: 50, fontSize: 20, iconSize: 24 },
    medium: { logoSize: 70, fontSize: 28, iconSize: 32 },
    large: { logoSize: 100, fontSize: 40, iconSize: 48 },
  };

  const { logoSize, fontSize, iconSize } = dimensions[size];

  const colors = {
    light: { primary: '#FFFFFF', secondary: 'rgba(255, 255, 255, 0.8)', accent: '#D4AF37' },
    dark: { primary: '#1F2937', secondary: '#6B7280', accent: '#D4AF37' },
    gradient: { primary: '#D4AF37', secondary: '#F59E0B', accent: '#FFFFFF' },
  };

  const logoColors = colors[variant];

  return (
    <View style={styles.container}>
      {/* Premium circle background with gradient */}
      <LinearGradient
        colors={variant === 'gradient' ? ['#D4AF37', '#F59E0B'] : [logoColors.accent, logoColors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logoCircle, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}
      >
        <MaterialCommunityIcons
          name="home-variant"
          size={iconSize}
          color={variant === 'gradient' ? '#FFFFFF' : logoColors.primary}
        />
      </LinearGradient>

      {/* App name with premium styling */}
      <View style={styles.textContainer}>
        <Text style={[styles.appName, { fontSize, color: logoColors.primary }]}>
          Reroute
        </Text>
        <View style={[styles.underline, { backgroundColor: logoColors.accent }]} />
        <Text style={[styles.tagline, { color: logoColors.secondary }]}>
          Premium Escapes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  appName: {
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  underline: {
    width: 60,
    height: 3,
    marginTop: 4,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
