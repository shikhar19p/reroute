import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@user_session';

export interface UserSession {
  uid: string;
  email: string;
  role?: 'owner' | 'customer';
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string | null; // Added phoneNumber
}

export async function saveSession(user: UserSession): Promise<void> {
  try {
    // Clear any existing session before saving new one
    await clearSession();
    
    const sessionData = JSON.stringify({
      ...user,
      timestamp: new Date().toISOString(),
    });
    
    await AsyncStorage.setItem(SESSION_KEY, sessionData);
  } catch (error) {
    console.error('Failed to save session:', error);
    throw new Error('Could not save session data');
  }
}

export async function loadSession(): Promise<UserSession | null> {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    
    if (!sessionData) {
      return null;
    }

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
      displayName: parsed.displayName,
      photoURL: parsed.photoURL,
      phoneNumber: parsed.phoneNumber, // Added phoneNumber
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    // Clear corrupted session
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
    throw new Error('Could not clear session data');
  }
}