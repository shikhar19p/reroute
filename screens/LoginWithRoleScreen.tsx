import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useDialog } from '../components/CustomDialog';

const { width } = Dimensions.get('window');

// Define the primary color for accents (the gold/ochre color in the design)
const PRIMARY_COLOR = '#C5A565';
const TEXT_COLOR = '#333333';
const LIGHT_GREY = '#666666';

export default function LoginWithRoleScreen({ navigation }: any) {
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear cached Google account when screen loads to force account selection
    GoogleSignin.signOut().catch(() => {
      // Ignore errors if not signed in
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

      // The AuthContext will handle the user state and navigation
      console.log('✅ Authentication complete, waiting for navigation...');
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

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>

        {/* --- 1. Logo Icon --- */}
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.iconImage}
            resizeMode="cover"
          />
        </View>

        {/* --- 2 & 3. Titles and Subtitle --- */}
        <Text style={styles.title}>Welcome to Reroute</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

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

              <Text style={styles.googleButtonText}>Sign in with Google</Text>

              {/* Arrow Icon Placeholder */}
              <Text style={styles.arrowIconPlaceholder}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>You'll choose your role after signing in</Text>

      </View>

      {/* --- Back Button (Fixed at Bottom) --- */}
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
    overflow: 'hidden', // Important for clipping the image to circular shape
  },
  iconImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
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
    marginBottom: 24,
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

  // --- Info Text ---
  infoText: {
    fontSize: 15,
    color: LIGHT_GREY,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '400',
    lineHeight: 22,
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