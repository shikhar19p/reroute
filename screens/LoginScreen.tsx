import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useGoogleAuth } from '../useGoogleAuth';
import { useDialog } from '../components/CustomDialog';

const { width } = Dimensions.get('window');

// Define the primary color for accents (the gold/ochre color in the design)
const PRIMARY_COLOR = '#C5A565';
const TEXT_COLOR = '#333333';
const LIGHT_GREY = '#666666';

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading, error } = useGoogleAuth();
  const { showDialog } = useDialog();

  useEffect(() => {
    if (error) {
      showDialog({
        title: 'Login Error',
        message: error,
        type: 'error'
      });
    }
  }, [error, showDialog]);

  const handleGoogleSignIn = async () => {
    await signIn();
  };

  const handleEmailSignIn = () => {
    showDialog({
      title: 'Coming Soon',
      message: 'Email authentication will be available soon!',
      type: 'info'
    });
  };

  const handleSignUp = () => {
    showDialog({
      title: 'Coming Soon',
      message: 'Sign up feature will be available soon!',
      type: 'info'
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>

        {/* --- 1. Logo Icon (White) --- */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconPlaceholder}>🏠</Text>
        </View>

        {/* --- 2 & 3. Titles and Subtitle --- */}
        <Text style={styles.title}>Welcome to Reroute</Text>
        <Text style={styles.subtitle}>Your journey to tranquility begins</Text>

        {/* --- 4. Google Sign In Button --- */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={PRIMARY_COLOR} size="small" />
          ) : (
            <View style={styles.buttonContent}>
              {/* Google Logo Placeholder */}
              <Text style={styles.googleIconPlaceholder}>G</Text>

              <Text style={styles.googleButtonText}>Continue with Google</Text>

              {/* Arrow Icon Placeholder */}
              <Text style={styles.arrowIconPlaceholder}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* --- 5. 'or' Separator --- */}
        <Text style={styles.orText}>or</Text>

        {/* --- 6. Email Sign In Link --- */}
        <TouchableOpacity onPress={handleEmailSignIn}>
          <Text style={styles.emailLinkText}>Continue with email</Text>
        </TouchableOpacity>

        {/* --- 7. Sign Up Link --- */}
        <View style={styles.signUpContainer}>
          <Text style={styles.smallText}>Don't have you account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* --- 8. Back Button (Fixed at Bottom) --- */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonContent}>
          <Text style={styles.backArrow}>&lt;</Text>
          <Text style={styles.backText}>Back</Text>
        </View>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.08,
    paddingTop: 20,
  },

  // --- Icon Styles ---
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconPlaceholder: {
    fontSize: 50,
    color: PRIMARY_COLOR,
  },

  // --- Title Styles ---
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: LIGHT_GREY,
    marginBottom: 50,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },

  // --- Google Button Styles ---
  googleButton: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderColor: PRIMARY_COLOR,
    borderWidth: 1.5,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 28,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  googleIconPlaceholder: {
    fontSize: 20,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_COLOR,
    letterSpacing: 0.3,
  },
  arrowIconPlaceholder: {
    fontSize: 20,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },

  // --- Links and Separator ---
  orText: {
    fontSize: 13,
    color: LIGHT_GREY,
    marginBottom: 28,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  emailLinkText: {
    fontSize: 16,
    color: TEXT_COLOR,
    fontWeight: '500',
    marginBottom: 32,
  },
  signUpContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: {
    fontSize: 15,
    color: LIGHT_GREY,
    fontWeight: '400',
  },
  signUpLink: {
    fontSize: 15,
    color: PRIMARY_COLOR,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // --- Back Button Styles (Footer) ---
  backButton: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backArrow: {
    fontSize: 22,
    color: PRIMARY_COLOR,
    marginRight: 6,
    fontWeight: '400',
  },
  backText: {
    fontSize: 17,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
