const IS_PROD = process.env.ENVIRONMENT === 'production';
const IS_PREVIEW = process.env.ENVIRONMENT === 'preview';

const getAppName = () => {
  if (IS_PROD) return 'ReRoute';
  if (IS_PREVIEW) return 'ReRoute (Preview)';
  return 'ReRoute (Dev)';
};

export default {
  expo: {
    name: getAppName(),
    slug: "reroute",
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
      package: "com.rerouteaventures.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F9F8EF"
      },
      edgeToEdgeEnabled: true,
      googleServicesFile: "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      name: "ReRoute",
      shortName: "ReRoute",
    },
    plugins: [
      "expo-web-browser",
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
      encryptionSecret: process.env.ENCRYPTION_SECRET,
      environment: process.env.ENVIRONMENT || 'development',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "82fbdf1f-a0cf-4fb4-8016-d8f2f65d9e99"
      }
    }
  }
};
