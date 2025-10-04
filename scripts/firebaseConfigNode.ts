import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCQXQO_QXDB4Aj-w-TaBDQ-UZbD1hNiuxE",
  authDomain: "rustique-6b7c4.firebaseapp.com",
  projectId: "rustique-6b7c4",
  storageBucket: "rustique-6b7c4.firebasestorage.app",
  messagingSenderId: "272634614965",
  appId: "1:272634614965:web:11d0e05cd1ba8cb55177b0",
  measurementId: "G-HFGGLP47EZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
