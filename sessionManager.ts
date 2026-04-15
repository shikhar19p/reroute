import { Platform } from 'react-native';

const SESSION_KEY = '@user_session';

export interface UserSession {
  uid: string;
  email: string;
  role?: 'owner' | 'customer'; // Current active role (for backward compatibility)
  roles?: ('owner' | 'customer')[]; // All roles user has
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string | null;
}

// Platform-aware key-value storage.
// Web uses localStorage; native uses AsyncStorage.
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem(key);
}

export async function saveSession(user: UserSession): Promise<void> {
  try {
    await clearSession();
    const sessionData = JSON.stringify({
      ...user,
      timestamp: new Date().toISOString(),
    });
    await storageSet(SESSION_KEY, sessionData);
  } catch (error) {
    console.error('Failed to save session:', error);
    throw new Error('Could not save session data');
  }
}

export async function loadSession(): Promise<UserSession | null> {
  try {
    const sessionData = await storageGet(SESSION_KEY);

    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);

    // Validate required fields
    if (!parsed.uid || !parsed.email) {
      console.warn('Corrupted session data detected');
      await clearSession();
      return null;
    }

    return {
      uid: parsed.uid,
      email: parsed.email,
      role: parsed.role,
      roles: parsed.roles || (parsed.role ? [parsed.role] : []), // Support multi-role
      displayName: parsed.displayName,
      photoURL: parsed.photoURL,
      phoneNumber: parsed.phoneNumber,
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await storageRemove(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
    throw new Error('Could not clear session data');
  }
}
