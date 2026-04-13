import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get Firebase config from environment variables (via expo-constants)
// SECURITY: All values MUST come from environment variables in production
// Development fallback is only for local testing

const isDevelopment = __DEV__;
const environment = Constants.expoConfig?.extra?.environment || 'development';

// Development-only fallback config (replace with your dev Firebase project)
const devConfig = isDevelopment ? {
  apiKey: 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: 'rustique-6b7c4.firebaseapp.com',
  projectId: 'rustique-6b7c4',
  storageBucket: 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: '272634614965',
  appId: '1:272634614965:web:82bb8ef1772cac9c019afc',
} : null;

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || devConfig?.apiKey || '',
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || devConfig?.authDomain || '',
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || devConfig?.projectId || '',
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || devConfig?.storageBucket || '',
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || devConfig?.messagingSenderId || '',
  appId: Constants.expoConfig?.extra?.firebaseAppId || devConfig?.appId || '',
};

// Validate that all required config values are present
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  const errorMsg = `Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`;
  
  if (environment === 'production') {
    // In production, this is a critical error
    console.error('❌ CRITICAL:', errorMsg);
    throw new Error('Firebase not configured for production. Check environment variables.');
  } else {
    // In development, warn but allow to continue
    console.warn('⚠️  WARNING:', errorMsg);
    console.warn('Set Firebase credentials in .env file for full functionality');
  }
}

const app = initializeApp(firebaseConfig);

// Web: use getAuth which includes browser popup/redirect resolvers
// Native: use initializeAuth with AsyncStorage persistence
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(
        require('@react-native-async-storage/async-storage').default
      ),
    });

// Firestore's default WebChannel (HTTP/2) transport is unreliable in React Native.
// experimentalForceLongPolling switches to plain HTTP which works on all platforms.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });

export const storage = getStorage(app);
