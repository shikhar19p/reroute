import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../components/CustomDialog';
import Constants from 'expo-constants';

export default function LoginWithRoleScreen({ navigation }: any) {
  const { colors, typography, borderRadius } = useTheme();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configure Google Sign-In
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId ||
      '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com';

    GoogleSignin.configure({
      webClientId,
    });
  }, []);

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
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Starting Google Sign-In...');

      // Clear any existing session
      try {
        await GoogleSignin.signOut();
        console.log('📤 Signed out to get fresh token');
      } catch (e) {
        // Ignore if not signed in
      }

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.idToken || response.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received');
      }

      console.log('✅ Google Sign-In successful');
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      console.log('✅ Firebase sign-in successful, user:', userCredential.user.uid);

      setLoading(false);

      // Navigate to role selection screen (already authenticated)
      // The AuthContext will handle the user state
      console.log('🚀 Navigating to role selection...');
    } catch (err: any) {
      console.error('❌ Google Sign-In Error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please try again.');
      } else if (err.code === '-5' || err.code === '12501') {
        setError('Google Sign-In cancelled');
      } else {
        setError(err.message || 'Authentication failed');
      }
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="account-circle" size={100} color="white" />
          </View>
          <Text style={[styles.title, { fontFamily: typography.fontFamily.bold }]}>
            Welcome to Reroute
          </Text>
          <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.medium }]}>
            Sign in to continue
          </Text>
        </View>

        {/* Google Sign-In Button */}
        <View style={styles.cardWrapper}>
          <BlurView
            intensity={20}
            tint="light"
            style={[styles.glassCard, { borderRadius: borderRadius.lg }]}
          >
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <MaterialCommunityIcons name="google" size={32} color="#4285F4" />
                  </View>
                  <Text style={[styles.googleButtonText, { fontFamily: typography.fontFamily.semiBold }]}>
                    Sign in with Google
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={28} color="white" />
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        <Text style={[styles.infoText, { fontFamily: typography.fontFamily.regular }]}>
          You'll choose your role after signing in
        </Text>

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
    marginBottom: 50,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  googleIconContainer: {
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 20,
    color: 'white',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
});
