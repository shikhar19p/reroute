// Native platforms use expo-firebase-recaptcha's native modal (WebView-based), which
// doesn't touch the compat SDK — this is a no-op there. See recaptchaCompat.web.ts.
export function ensureCompatFirebaseApp(_config: Record<string, unknown>) {}
