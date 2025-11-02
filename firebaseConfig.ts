import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables (via expo-constants)
// SECURITY: In production, all values must come from environment variables.
// In development, fallback values are allowed for convenience.

const isDevelopment = !__DEV__ ? false : true;

// Development fallback values (only used if env vars are not set)
const developmentFallbacks = {
  apiKey: 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: 'rustique-6b7c4.firebaseapp.com',
  projectId: 'rustique-6b7c4',
  storageBucket: 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: '272634614965',
  appId: '1:272634614965:web:82bb8ef1772cac9c019afc',
};

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || (isDevelopment ? developmentFallbacks.apiKey : undefined),
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || (isDevelopment ? developmentFallbacks.authDomain : undefined),
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || (isDevelopment ? developmentFallbacks.projectId : undefined),
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || (isDevelopment ? developmentFallbacks.storageBucket : undefined),
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || (isDevelopment ? developmentFallbacks.messagingSenderId : undefined),
  appId: Constants.expoConfig?.extra?.firebaseAppId || (isDevelopment ? developmentFallbacks.appId : undefined),
};

// Validate that all required config values are present
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  if (isDevelopment) {
    console.warn(
      '⚠️  WARNING: Using fallback Firebase configuration for development.\n' +
      `Missing environment variables: ${missingFields.join(', ')}\n` +
      'For production, please set up your .env file. See .env.example for reference.'
    );
  } else {
    throw new Error(
      `❌ PRODUCTION ERROR: Firebase configuration is incomplete.\n` +
      `Missing required environment variables: ${missingFields.join(', ')}.\n` +
      'Please ensure your .env file contains all required Firebase configuration values.\n' +
      'See .env.example for required fields.'
    );
  }
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
