import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { auth, db } from './firebaseConfig';

let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}

export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !GoogleSignin) return;

    try {
      const webClientId = Constants.expoConfig?.extra?.googleWebClientId ||
        '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com';

      GoogleSignin.configure({
        webClientId,
      });
    } catch (error) {
      console.warn('Google Sign-In not available - requires development build');
    }
  }, []);

  const signIn = async (role: 'customer' | 'owner') => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting Google Sign-In with role:', role);

      let userCredential;

      if (Platform.OS === 'web') {
        // Web: Use Firebase's built-in Google sign-in popup
        const provider = new GoogleAuthProvider();
        userCredential = await signInWithPopup(auth, provider);
      } else {
        // Native: Use Google Sign-In SDK
        // Completely revoke access to get a truly fresh token
        try {
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (isSignedIn) {
            await GoogleSignin.revokeAccess();
            await GoogleSignin.signOut();
          }
        } catch (revokeError) {
          try {
            await GoogleSignin.signOut();
          } catch (e) {
            // Ignore
          }
        }

        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));

        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        // Handle different response structures
        const idToken = response.idToken || response.data?.idToken;

        if (!idToken) {
          throw new Error('No ID token received');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        userCredential = await signInWithCredential(auth, credential);
      }

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
