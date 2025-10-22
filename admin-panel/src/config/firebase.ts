import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: These should match your mobile app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'rustique-6b7c4.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'rustique-6b7c4',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '272634614965',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:272634614965:web:82bb8ef1772cac9c019afc',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;