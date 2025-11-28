import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { getSession, saveSession, clearSession } from '../sessionManager';
import { measureAsync } from '../utils/performance';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'customer' | 'owner';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize logout function to prevent recreating on every render
  const logout = useCallback(async () => {
    try {
      await measureAsync('Logout', async () => {
        await signOut(auth);
        await clearSession();
        setUser(null);
      });
    } catch (err: any) {
      console.error('Error during logout:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Refresh user data from Firestore
  const refreshUser = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await measureAsync('Refresh User', async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedUser: User = {
            ...user,
            role: userData.role,
          };
          setUser(updatedUser);
          await saveSession(updatedUser);
        }
      });
    } catch (err: any) {
      console.error('Error refreshing user:', err);
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    let userDocUnsubscribe: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          await measureAsync('Load User Session', async () => {
            // First try to get from session
            const sessionUser = await getSession();
            if (sessionUser && sessionUser.uid === firebaseUser.uid) {
              setUser(sessionUser);
              setLoading(false);

              // Set up real-time listener for user role changes
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              userDocUnsubscribe = onSnapshot(
                userDocRef,
                (docSnapshot) => {
                  if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const updatedUser: User = {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      displayName: firebaseUser.displayName,
                      photoURL: firebaseUser.photoURL,
                      role: userData.role,
                    };
                    setUser(updatedUser);
                    saveSession(updatedUser);
                  }
                },
                (err) => {
                  console.error('Error listening to user doc:', err);
                }
              );
            } else {
              // Fetch from Firestore
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);

              const newUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: userDoc.exists() ? userDoc.data()?.role : undefined,
              };

              setUser(newUser);
              await saveSession(newUser);
              setLoading(false);

              // Set up real-time listener
              userDocUnsubscribe = onSnapshot(
                userDocRef,
                (docSnapshot) => {
                  if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const updatedUser: User = {
                      ...newUser,
                      role: userData.role,
                    };
                    setUser(updatedUser);
                    saveSession(updatedUser);
                  }
                },
                (err) => {
                  console.error('Error listening to user doc:', err);
                }
              );
            }
          });
        } else {
          setUser(null);
          await clearSession();
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in auth state change:', err);
        setError(err.message);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      logout,
      refreshUser,
    }),
    [user, loading, error, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
