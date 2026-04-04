import { useState } from 'react';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// Detect if running inside Expo Go — Google Sign-In won't work there
// because Expo Go uses package 'host.exp.exponent', not our app's package name
const isExpoGo = Constants.appOwnership === 'expo';

// Safely import and configure GoogleSignin only in native builds
let GoogleSignin: any = null;
if (!isExpoGo) {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    const webClientId =
      Constants.expoConfig?.extra?.googleWebClientId ||
      '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com';
    GoogleSignin.configure({ webClientId });
  } catch (e) {
    console.warn('⚠️ RNGoogleSignin native module not available. Use a dev build.');
  }
} else {
  console.warn('⚠️ Running in Expo Go — Google Sign-In disabled. Install the dev APK for full functionality.');
}

export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (role: 'customer' | 'owner') => {
    if (!GoogleSignin) {
      setError('Google Sign-In is not available in Expo Go. Please use the ReRoute Aventures app.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Starting Google Sign-In with role:', role);

      // Completely revoke access to get a truly fresh token
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          console.log('📤 Revoking Google access to force fresh token...');
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          console.log('✅ Google access revoked');
        } else {
          console.log('📤 No active Google session');
        }
      } catch (revokeError) {
        console.log('⚠️ Could not revoke access:', revokeError);
        // Try regular sign out as fallback
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          // Ignore
        }
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🔄 Starting fresh Google Sign-In...');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // Handle different response structures
      const idToken = response.idToken || response.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received');
      }

      console.log('✅ Google Sign-In successful, got fresh token');
      console.log('🔐 Signing in to Firebase...');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      console.log('✅ Firebase sign-in successful, user:', userCredential.user.uid);

      // Check if user document exists
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      try {
        if (!userDoc.exists()) {
          // Create new user document with selected role
          console.log('📝 Creating NEW user document with role:', role);
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            role,
            createdAt: new Date().toISOString(),
          });
          console.log('✅ User document created successfully with role:', role);
        } else {
          // Update existing user with role - ALWAYS update with the selected role
          const userData = userDoc.data();
          console.log('📝 Updating EXISTING user document with role:', role);
          console.log('   Previous role:', userData.role);

          await setDoc(userDocRef, {
            ...userData,
            role, // Always update role with the newly selected one
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          console.log('✅ User document updated successfully with role:', role);
        }
      } catch (firestoreError: any) {
        // If Firestore permissions error, continue anyway with local-only role
        console.warn('⚠️ Could not save to Firestore (permissions), using local role only:', firestoreError.message);
        console.log('💡 To fix: Update Firestore security rules to allow users to write their own documents');

        // Save role to local storage directly since Firestore failed
        const { saveSession } = await import('./sessionManager');
        await saveSession({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          role,
          displayName: userCredential.user.displayName || undefined,
          photoURL: userCredential.user.photoURL || undefined,
        });
        console.log('✅ Role saved to local storage (AsyncStorage)');
      }

      setLoading(false);
      console.log('✅ Sign-in complete!');
    } catch (err: any) {
      console.error('❌ Google Sign-In Error:', err);

      // Handle stale token error specifically
      if (err.code === 'auth/invalid-credential' && err.message?.includes('stale')) {
        console.log('🔄 Token was stale, please try signing in again');
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
