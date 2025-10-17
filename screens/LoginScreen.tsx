import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGoogleAuth } from '../useGoogleAuth';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading, error } = useGoogleAuth();
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
    }
  }, [error]);

  const handleSignIn = async () => {
    await signIn();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Premium gradient background */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name="home-heart"
              size={80}
              color="white"
            />
          </View>
          <Text style={[styles.title, { fontFamily: typography.fontFamily.bold }]}>
            Welcome to Reroute
          </Text>
          <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.medium }]}>
            Your gateway to unforgettable farmhouse experiences
          </Text>
        </View>

        {/* Google Sign-In Button */}
        <View style={styles.buttonWrapper}>
          <BlurView intensity={20} tint="light" style={[styles.glassCard, { borderRadius: borderRadius.lg }]}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <MaterialCommunityIcons name="google" size={28} color="#4285F4" />
                  </View>
                  <Text style={[styles.signInText, { fontFamily: typography.fontFamily.semiBold }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
          <Text style={[styles.backButtonText, { fontFamily: typography.fontFamily.medium }]}>
            Back to Welcome
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
  },
  circle1: {
    width: 250,
    height: 250,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 180,
    height: 180,
    bottom: 60,
    left: -40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 70,
  },
  googleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  signInText: {
    fontSize: 18,
    color: 'white',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
});
