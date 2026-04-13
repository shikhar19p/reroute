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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useDialog } from '../components/CustomDialog';

// Required so expo-auth-session can close the browser after redirect
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const PRIMARY_COLOR = '#C5A565';
const TEXT_COLOR = '#333333';
const LIGHT_GREY = '#666666';

const WEB_CLIENT_ID = '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com';

// Expo Go doesn't bundle native modules — use web-based OAuth there instead.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function LoginWithRoleScreen({ navigation }: any) {
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // expo-auth-session hook — must be called unconditionally (React rules).
  // Only used when running in Expo Go; ignored otherwise.
  // androidClientId must be provided on Android to avoid a render-time throw,
  // even though native builds use @react-native-google-signin instead.
  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: WEB_CLIENT_ID,
    selectAccount: true,
  });

  // Configure and clear cached native Google account on mount (native builds only)
  useEffect(() => {
    if (!isExpoGo) {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      GoogleSignin.signOut().catch(() => {});
    }
  }, []);

  // Handle expo-auth-session response (Expo Go path)
  useEffect(() => {
    if (!isExpoGo || !response) return;

    if (response.type === 'success') {
      const { accessToken, idToken } = response.authentication ?? {};
      if (!accessToken && !idToken) {
        setError('No credentials received from Google');
        setLoading(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
      signInWithCredential(auth, credential)
        .then(() => {
          console.log('✅ Firebase sign-in successful (Expo Go)');
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Firebase sign-in failed');
          setLoading(false);
        });
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Google Sign-In failed');
      setLoading(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  useEffect(() => {
    if (error) {
      const isCancellation = error.toLowerCase().includes('cancel');
      if (!isCancellation) {
        showDialog({ title: 'Sign in failed', message: 'Please try again.', type: 'error' });
      }
    }
  }, [error, showDialog]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    if (isExpoGo) {
      // Web-based OAuth via expo-auth-session — works in Expo Go
      // Result is handled in the useEffect above
      await promptAsync();
    } else {
      // Native Google Sign-In for real builds (dev client / standalone)
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
        await GoogleSignin.hasPlayServices();
        const result = await GoogleSignin.signIn();
        const idToken = result.idToken || result.data?.idToken;
        if (!idToken) throw new Error('No ID token received');
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        console.log('✅ Firebase sign-in successful, user:', userCredential.user.uid);
        setLoading(false);
      } catch (err: any) {
        if (err.code === '-5' || err.code === '12501') {
          setError('Google Sign-In cancelled');
        } else {
          setError(err.message || 'Authentication failed');
        }
        setLoading(false);
      }
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
              <Text style={styles.googleIconPlaceholder}>G</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
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
    overflow: 'hidden',
  },
  iconImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
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
  infoText: {
    fontSize: 15,
    color: LIGHT_GREY,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '400',
    lineHeight: 22,
  },
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
