import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: 'rustique-6b7c4.firebaseapp.com',
  projectId: 'rustique-6b7c4',
  storageBucket: 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: '272634614965',
  appId: '1:272634614965:web:82bb8ef1772cac9c019afc',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
