import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore — getReactNativePersistence is exported at runtime but missing from some type versions
import { getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables (via expo-constants).
// No hardcoded fallback values — a real project's Firebase keys must never live in source,
// since source is committed to git regardless of environment.
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  throw new Error(
    `Firebase configuration is incomplete. Missing: ${missingFields.join(', ')}. ` +
    'Set FIREBASE_* vars in .env (see .env.example).'
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
