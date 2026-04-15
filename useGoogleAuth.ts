import { useState } from 'react';
import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// This hook is for native builds only.
// On web, Google sign-in is handled via signInWithPopup in LoginWithRoleScreen.
export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (role: 'customer' | 'owner') => {
    if (Platform.OS === 'web') {
      setError('Use the login screen for web sign-in');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      // Completely revoke access to get a truly fresh token
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
        }
      } catch (revokeError) {
        try { await GoogleSignin.signOut(); } catch {}
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.idToken || response.data?.idToken;
      if (!idToken) throw new Error('No ID token received');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Check if user document exists
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      try {
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            role,
            createdAt: new Date().toISOString(),
          });
        } else {
          const userData = userDoc.data();
          await setDoc(userDocRef, {
            ...userData,
            role,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (firestoreError: any) {
        console.warn('Could not save to Firestore (permissions), using local role only:', firestoreError.message);
        const { saveSession } = await import('./sessionManager');
        await saveSession({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          role,
          displayName: userCredential.user.displayName || undefined,
          photoURL: userCredential.user.photoURL || undefined,
        });
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);

      if (err.code === 'auth/invalid-credential' && err.message?.includes('stale')) {
        setError('Session expired. Please try again.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please try again.');
      } else if (err.code === '-5' || err.code === '12501') {
        setError('Google Sign-In cancelled');
      } else {
        setError(err.message || 'Authentication failed');
      }
      setLoading(false);
    }
  };

  return { signIn, loading, error };
}
