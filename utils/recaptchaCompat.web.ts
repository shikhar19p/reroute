import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// expo-firebase-recaptcha's web implementation (FirebaseRecaptchaVerifierModal.web.tsx)
// calls firebase.auth() from the legacy compat namespace directly, which is a separate
// app registry from the modular `firebase/app` instance initialized in firebaseConfig.ts.
// Without this, it throws "No Firebase App '[DEFAULT]' has been created" on web.
export function ensureCompatFirebaseApp(config: Record<string, unknown>) {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(config);
  }
}
