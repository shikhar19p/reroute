import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, db } from './firebaseConfig';
import { saveSession, loadSession, clearSession, UserSession } from './sessionManager';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔐 AuthProvider: Starting initialization...');
    let mounted = true;

    // Set a timeout to ensure we don't hang forever
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth initialization timeout - proceeding anyway');
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    // Try to restore session on app start
    loadSession()
      .then((session) => {
        if (session && mounted) {
          console.log('✅ Restored session from storage:', session.email);
          setUser(session);
        }
      })
      .catch((err) => {
        console.error('❌ Failed to restore session:', err);
      });

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('🔄 Auth state changed:', firebaseUser ? firebaseUser.email : 'signed out');
        if (firebaseUser) {
          await handleUserSignIn(firebaseUser);
        } else {
          // User signed out
          await clearSession();
          if (mounted) {
            setUser(null);
            setError(null);
          }
        }
      } catch (err: any) {
        console.error('❌ Auth state change error:', err);
        if (mounted) {
          setError(err.message);
          await clearSession();
          setUser(null);
        }
      } finally {
        clearTimeout(loadingTimeout);
        if (mounted) {
          console.log('✅ Auth initialization complete');
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  const handleUserSignIn = async (firebaseUser: User) => {
    try {
      console.log('🔄 Auth state changed, loading user data for:', firebaseUser.uid);

      // Try to get user role from Firestore first
      let firestoreRole = undefined;
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          firestoreRole = userData?.role;
          console.log('✅ User document found in Firestore, role:', firestoreRole);
        } else {
          console.log('⚠️ User document not found in Firestore');
        }
      } catch (firestoreError: any) {
        console.warn('⚠️ Could not read from Firestore:', firestoreError.message);
      }

      // Check local storage for role
      const localSession = await loadSession();
      const localRole = localSession?.role;
      const hadLocalSession = localSession !== null;
      console.log('📱 Local storage role:', localRole, '| Had session:', hadLocalSession);

      // If this is a fresh sign-in (no local session), force role selection
      // Otherwise, use local role first, then fall back to Firestore
      let finalRole = undefined;
      if (hadLocalSession) {
        // User had a session before, use local or Firestore role
        finalRole = localRole || firestoreRole;
        console.log('✅ Using role:', finalRole, '(source:', localRole ? 'LocalStorage' : 'Firestore', ')');
      } else {
        // Fresh sign-in, force role selection (ignore Firestore)
        console.log('🆕 Fresh sign-in detected - forcing role selection');
        finalRole = undefined;
      }

      // Create user session
      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: finalRole,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined, // <-- Added phone number
      };

      console.log('💾 Saving user session with role:', userSession.role);

      // Save session to AsyncStorage
      await saveSession(userSession);
      setUser(userSession);
      setError(null);

      console.log('✅ User session updated in context with role:', userSession.role);
    } catch (err: any) {
      console.error('❌ Error in handleUserSignIn:', err);
      // Handle user deleted in Firebase
      if (err.code === 'permission-denied' || err.code === 'not-found') {
        await logout();
        throw new Error('User account no longer exists. Please sign in again.');
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');

      // Sign out from Google first
      try {
        await GoogleSignin.signOut();
        console.log('✅ Signed out from Google');
      } catch (err) {
        // Ignore if GoogleSignin not configured yet
        console.log('⚠️ Google sign-out skipped (not configured)');
      }

      // Sign out from Firebase
      await auth.signOut();
      console.log('✅ Signed out from Firebase');

      // Clear local session
      await clearSession();
      console.log('✅ Cleared local session');

      setUser(null);
      setError(null);
      console.log('✅ Logout complete');
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      setError('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to check if user has required role
export function requireRole(user: UserSession | null, requiredRole: 'owner' | 'customer'): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}