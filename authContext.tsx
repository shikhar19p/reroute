import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
    // Try to restore session on app start
    loadSession()
      .then((session) => {
        if (session) {
          setUser(session);
        }
      })
      .catch((err) => {
        console.error('Failed to restore session:', err);
      });

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await handleUserSignIn(firebaseUser);
        } else {
          // User signed out
          await clearSession();
          setUser(null);
          setError(null);
        }
      } catch (err: any) {
        console.error('Auth state change error:', err);
        setError(err.message);
        await clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUserSignIn = async (firebaseUser: User) => {
    try {
      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please contact support.');
      }

      const userData = userDoc.data();
      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: userData.role,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
      };

      // Save session to AsyncStorage
      await saveSession(userSession);
      setUser(userSession);
      setError(null);
    } catch (err: any) {
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
