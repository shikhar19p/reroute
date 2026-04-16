export default ({ config }) => ({
  ...config,
  expo: {
    name: "ReRoute Adventures",
    slug: "reroute",
    scheme: "reroute",
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
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-web-browser",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm"
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
        projectId: "b4fd15d4-8419-4cd7-b47a-ba697e65979e"
      }
    }
  }
});
