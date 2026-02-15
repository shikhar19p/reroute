import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
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
    console.log('🔐 AuthProvider: Starting initialization...');
    let mounted = true;

    // Set a timeout to ensure we don't hang forever
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth initialization timeout - proceeding anyway');
        setLoading(false);
      }
    }, 5000); // 5 second timeout (increased for slower connections)

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

      // Try to get user roles from Firestore first
      let firestoreRole = undefined;
      let firestoreRoles: ('owner' | 'customer')[] = [];
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          firestoreRole = userData?.role; // Current active role
          // Support both old single role and new multi-role system
          if (userData?.roles && Array.isArray(userData.roles)) {
            firestoreRoles = userData.roles;
          } else if (firestoreRole) {
            firestoreRoles = [firestoreRole]; // Convert single role to array
          }
          console.log('✅ User document found in Firestore, role:', firestoreRole, 'roles:', firestoreRoles);
        } else {
          console.log('⚠️ User document not found in Firestore');
        }
      } catch (firestoreError: any) {
        console.warn('⚠️ Could not read from Firestore:', firestoreError.message);
      }

      // Check local storage for session continuity (app restart without logout)
      const localSession = await loadSession();
      const localRole = localSession?.role;
      const localRoles = localSession?.roles || [];
      const hadLocalSession = localSession !== null;
      console.log('📱 Local storage role:', localRole, 'roles:', localRoles);
      console.log('🗄️ Firestore role:', firestoreRole, 'roles:', firestoreRoles);

      // Merge roles from both sources (Firestore is source of truth)
      const mergedRoles = firestoreRoles.length > 0 ? firestoreRoles : localRoles;

      // IMPORTANT: User's role is not fixed - they choose their role every time
      // Always force role selection on fresh auth (no local session)
      // This allows users to switch between customer and owner roles
      let finalRole: string | undefined;

      if (hadLocalSession && localRole) {
        // User is resuming an existing session (app restart without logout)
        // Use the stored role to maintain session continuity
        finalRole = localRole;
        console.log('🔄 Resuming session with role:', finalRole);
      } else {
        // Fresh login or session expired - force role selection
        console.log('🆕 Login detected - user must select role');
        finalRole = undefined;
      }

      console.log('✅ Final role:', finalRole, 'available roles:', mergedRoles);

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

  const switchRole = async (newRole: 'owner' | 'customer') => {
    if (!user) return;

    try {
      console.log('🔄 Switching role to:', newRole);

      // Check if user has this role
      const userRoles = user.roles || [];
      if (!userRoles.includes(newRole)) {
        // Add the new role if they don't have it
        userRoles.push(newRole);
      }

      // Update user session with new active role
      const updatedSession: UserSession = {
        ...user,
        role: newRole,
        roles: userRoles,
      };

      // Update Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          role: newRole,
          roles: userRoles,
        }, { merge: true });
        console.log('✅ Role updated in Firestore');
      } catch (err) {
        console.warn('⚠️ Could not update role in Firestore:', err);
      }

      // Update local session
      await saveSession(updatedSession);
      setUser(updatedSession);

      console.log('✅ Role switched to:', newRole);
    } catch (err: any) {
      console.error('❌ Error switching role:', err);
      setError('Failed to switch role');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');

      // Sign out from Google first
      try {
        if (GoogleSignin) await GoogleSignin.signOut();
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