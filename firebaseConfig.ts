import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables (via expo-constants)
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || 'rustique-6b7c4.firebaseapp.com',
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || 'rustique-6b7c4',
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || '272634614965',
  appId: Constants.expoConfig?.extra?.firebaseAppId || '1:272634614965:web:82bb8ef1772cac9c019afc',
};

// Validate that all required config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('Firebase configuration is incomplete. Please check your .env file.');
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
