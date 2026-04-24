import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const WEB_CLIENT_ID = '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com';
const isExpoGo = Constants.executionEnvironment === 'storeClient';
// Expo Go needs the Expo auth proxy URI (fixed, registered in Google Console).
// Standalone/bare builds use their own scheme — no proxy needed.
const redirectUri = AuthSession.makeRedirectUri(
  isExpoGo ? ({ useProxy: true } as any) : {}
);

export default function WelcomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  // On web, hide ImageBackground until fully loaded to prevent top-to-bottom progressive render
  const [bgReady, setBgReady] = useState(Platform.OS !== 'web');

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: WEB_CLIENT_ID,
    selectAccount: true,
    redirectUri,
  });

  useEffect(() => {
    if (Platform.OS === 'web' || !isExpoGo || !response) return;
    if (response.type === 'success') {
      // Tokens may be in `authentication` (implicit flow) or `params` (code flow)
      const idToken =
        response.authentication?.idToken ||
        (response as any).params?.id_token ||
        null;
      const accessToken =
        response.authentication?.accessToken ||
        (response as any).params?.access_token ||
        null;

      if (!idToken && !accessToken) {
        setSignInError('Google sign-in returned no credentials. Please try again.');
        setLoading(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      signInWithCredential(auth, credential)
        .then(() => setLoading(false))
        .catch((err: any) => {
          setSignInError(err?.message || 'Sign-in failed. Please try again.');
          setLoading(false);
        });
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [response]);

  useEffect(() => {
    if (Platform.OS !== 'web' && !isExpoGo) {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      GoogleSignin.signOut().catch(() => {});
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setSignInError(null);
    setLoading(true);
    if (Platform.OS === 'web') {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        setLoading(false);
      } catch (err: any) {
        const msg = err?.code === 'auth/popup-blocked'
          ? 'Pop-up was blocked. Please allow pop-ups for this site and try again.'
          : err?.message || 'Google sign-in failed.';
        setSignInError(msg);
        setLoading(false);
      }
    } else if (isExpoGo) {
      await promptAsync();
      // credential handling done in the response useEffect above
    } else {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
        await GoogleSignin.hasPlayServices();
        const result = await GoogleSignin.signIn();
        const idToken = result.idToken || result.data?.idToken;
        if (!idToken) throw new Error('No ID token returned from Google.');
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        // Keep loading=true — onAuthStateChanged will navigate away automatically
      } catch (err: any) {
        const cancelled =
          err?.code === 'SIGN_IN_CANCELLED' ||
          err?.code === -5 ||
          err?.code === 12501 ||
          String(err?.code) === '-5' ||
          String(err?.code) === '12501' ||
          err?.message?.toLowerCase().includes('cancel');
        if (!cancelled) {
          setSignInError(err?.message || 'Google sign-in failed.');
        }
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={require('../assets/farmhouse-bg.jpg')}
        style={[styles.backgroundImage, !bgReady && { opacity: 0 }]}
        resizeMode="cover"
        onLoad={() => setBgReady(true)}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
          style={styles.gradient}
        >
          <View style={styles.topSection}>
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeText}>REROUTE AVENTURES</Text>
              <Text style={styles.premierText}>PREMIER ESCAPES</Text>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.contentCard}>
              <Text style={styles.tagline}>Find your perfect retreat.</Text>

              {signInError ? (
                <Text style={styles.errorText}>{signInError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.9}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Continue with Google</Text>
                    <ChevronRight size={20} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1.5,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  headerContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: 'Seasons-Regular',
    fontSize: 26,
    fontWeight: '400',
    color: '#D4AF37',
    letterSpacing: 3,
    textAlign: 'center',
    ...Platform.select({
      web: { textShadow: '0px 1px 3px rgba(0,0,0,0.4)' },
      default: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    }),
  },
  premierText: {
    fontFamily: 'Seasons-Light',
    fontSize: 13,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 8,
    textAlign: 'center',
    ...Platform.select({
      web: { textShadow: '0px 1px 2px rgba(0,0,0,0.4)' },
      default: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    }),
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    elevation: 5,
    ...Platform.select({
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    }),
  },
  tagline: {
    fontFamily: 'Seasons-Regular',
    fontSize: 20,
    fontWeight: '400',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  googleButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
});
