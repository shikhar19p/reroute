import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore — getReactNativePersistence is exported at runtime but missing from some type versions
import { getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables (via expo-constants)
// SECURITY: In production, all values must come from environment variables.
// In development, fallback values are allowed for convenience.

const isDevelopment = __DEV__;

// Firebase configuration values
// These can be overridden by environment variables via expo-constants
const defaultConfig = {
  apiKey: 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: 'rustique-6b7c4.firebaseapp.com',
  projectId: 'rustique-6b7c4',
  storageBucket: 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: '272634614965',
  appId: '1:272634614965:web:82bb8ef1772cac9c019afc',
};

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || defaultConfig.apiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || defaultConfig.authDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || defaultConfig.projectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || defaultConfig.storageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || defaultConfig.messagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId || defaultConfig.appId,
};

// Validate that all required config values are present
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  console.warn(
    '⚠️  WARNING: Firebase configuration is incomplete.\n' +
    `Missing fields: ${missingFields.join(', ')}\n` +
    'Using default configuration.'
  );
}

const app = initializeApp(firebaseConfig);

export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
// Persistent cache on web (IndexedDB); memory cache on native (JS SDK lacks RN persistence)
export const db = initializeFirestore(app, {
  localCache: Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache(),
});
export const storage = getStorage(app);
