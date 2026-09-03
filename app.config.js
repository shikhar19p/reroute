const appJson = require('./app.json');

const IS_PROD = process.env.ENVIRONMENT === 'production';
const IS_PREVIEW = process.env.ENVIRONMENT === 'preview';
// Signal on FIREBASE_PROJECT_ID (not ENVIRONMENT) so this works whether the value
// came from .env.staging locally or from the EAS "development" environment's vars —
// both set FIREBASE_PROJECT_ID to the staging project regardless of ENVIRONMENT's value.
const IS_STAGING_BACKEND = process.env.FIREBASE_PROJECT_ID === 'reroute-aventures-dev';

const getAppName = () => {
  if (IS_PROD) return 'ReRoute Aventures';
  if (IS_PREVIEW) return 'ReRoute Aventures (Preview)';
  return 'ReRoute Aventures (Dev)';
};

export default {
  expo: {
    name: getAppName(),
    slug: "reroute",
    scheme: "com.rerouteaventures.app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F9F8EF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rerouteaventures.app"
    },
    android: {
      package: IS_STAGING_BACKEND ? "com.rerouteaventures.app.dev" : "com.rerouteaventures.app",
      // app.json is the single mutable source — EAS's autoIncrement (production
      // profile, appVersionSource: "local") writes the bumped value there.
      // app.config.js just reflects it; a plain object export here would otherwise
      // fully replace app.json's expo block with no per-field fallback (verified:
      // omitting this key resolves to `undefined`, not app.json's value).
      versionCode: appJson.expo.android.versionCode,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F9F8EF"
      },
      edgeToEdgeEnabled: true,
      // Default (adjustResize) shrinks the window for the keyboard but doesn't
      // auto-scroll a focused field into view — with edge-to-edge enabled this
      // left the focused input at the bottom of forms hidden behind the
      // keyboard app-wide. "pan" instead slides the whole screen up so the
      // focused field stays visible, matching iOS's KeyboardAvoidingView feel.
      softwareKeyboardLayoutMode: "pan",
      googleServicesFile: IS_STAGING_BACKEND
        ? (process.env.GOOGLE_SERVICES_FILE || "./google-services.staging.json")
        : "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      name: "ReRoute Aventures",
      shortName: "ReRoute",
    },
    plugins: [
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#F9F8EF"
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.272634614965-64lm03jaaj2vk3sbu351u7cr3iebmqrm"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow $(PRODUCT_NAME) to access your photos to upload property images.",
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to take photos of your property."
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location to sort farmhouses by distance from you."
        }
      ]
    ],
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      // ENCRYPTION_SECRET is intentionally NOT included here.
      // Bank detail encryption/decryption is handled server-side in Cloud Functions only.
      environment: process.env.ENVIRONMENT || 'development',
      eas: {
        projectId: "f7babf0b-e74f-4fa2-856a-f2885ce93765"
      }
    }
  }
};
