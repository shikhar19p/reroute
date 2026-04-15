import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let GoogleSignin: any = null;
const _isExpoGo = Constants.executionEnvironment === 'storeClient';
if (Platform.OS !== 'web' && !_isExpoGo) {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}
import { auth, db } from './firebaseConfig';
import { saveSession, loadSession, clearSession, UserSession } from './sessionManager';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  switchRole: (role: 'owner' | 'customer') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout - Firebase did not respond');
        setLoading(false);
      }
    }, 15000);

    loadSession()
      .then((session) => {
        if (session && mounted) setUser(session);
      })
      .catch((err) => {
        console.error('Failed to restore session:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(loadingTimeout);
      try {
        if (firebaseUser) {
          await handleUserSignIn(firebaseUser);
        } else {
          await clearSession();
          if (mounted) {
            setUser(null);
            setError(null);
          }
        }
      } catch (err: any) {
        console.error('Auth state change error:', err);
        if (mounted) {
          setError(err.message);
          await clearSession();
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
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
      let firestoreRole = undefined;
      let firestoreRoles: ('owner' | 'customer')[] = [];
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          firestoreRole = userData?.role;
          if (userData?.roles && Array.isArray(userData.roles)) {
            firestoreRoles = userData.roles;
          } else if (firestoreRole) {
            firestoreRoles = [firestoreRole];
          }
        }
      } catch (firestoreError: any) {
        console.warn('Could not read user from Firestore:', firestoreError.message);
      }

      const localSession = await loadSession();
      const localRole = localSession?.role;
      const localRoles = localSession?.roles || [];
      const hadLocalSession = localSession !== null;

      const mergedRoles = firestoreRoles.length > 0 ? firestoreRoles : localRoles;
      const finalRole: string | undefined = hadLocalSession && localRole ? localRole : undefined;

      // Create user session
      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: finalRole,
        roles: mergedRoles.length > 0 ? mergedRoles : undefined,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined,
      };

      await saveSession(userSession);
      setUser(userSession);
      setError(null);
    } catch (err: any) {
      console.error('Error in handleUserSignIn:', err);
      // Handle user deleted in Firebase
      if (err.code === 'permission-denied' || err.code === 'not-found') {
        await logout();
        throw new Error('User account no longer exists. Please sign in again.');
      }
      throw err;
    }
  };

  const switchRole = async (newRole: 'owner' | 'customer') => {
    if (!user) return;

    try {
      const userRoles = user.roles || [];
      if (!userRoles.includes(newRole)) {
        userRoles.push(newRole);
      }

      const updatedSession: UserSession = {
        ...user,
        role: newRole,
        roles: userRoles,
      };

      try {
        await setDoc(doc(db, 'users', user.uid), {
          role: newRole,
          roles: userRoles,
        }, { merge: true });
      } catch (err) {
        console.warn('Could not update role in Firestore:', err);
      }

      await saveSession(updatedSession);
      setUser(updatedSession);
    } catch (err: any) {
      console.error('Error switching role:', err);
      setError('Failed to switch role');
    }
  };

  const logout = async () => {
    try {
      try {
        if (GoogleSignin) await GoogleSignin.signOut();
      } catch (err) {
        // Ignore if GoogleSignin not configured
      }

      await auth.signOut();
      await clearSession();

      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, switchRole }}>
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