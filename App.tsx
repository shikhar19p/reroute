import React, { useEffect, useCallback, Suspense } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';

// Configure Google Sign-In only in real native builds.
// Not available in Expo Go or on web — the native module would crash.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
if (Platform.OS !== 'web' && !isExpoGo) {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: '272634614965-2gbkc0u14l5ahpbmhqbqd566fq93qijm.apps.googleusercontent.com',
  });
}

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Handle error silently
});

// Contexts
import { AuthProvider, useAuth } from './authContext';
import { FarmRegistrationProvider } from './context/FarmRegistrationContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import { GlobalDataProvider } from './GlobalDataContext';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/CustomDialog';
import { TabBarVisibilityProvider } from './context/TabBarVisibilityContext';
import ErrorBoundary from './components/ErrorBoundary';
import { registerForPushNotifications } from './services/notificationService';

// Critical screens — always eager (needed on first render)
import WelcomeScreen from './screens/WelcomeScreen';
import LoginWithRoleScreen from './screens/LoginWithRoleScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';

// Farm Registration — lazy on web
const BasicDetailsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/BasicDetailsScreen'))
  : require('./screens/FarmRegistration/BasicDetailsScreen').default;
const PricesScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/PricesScreen'))
  : require('./screens/FarmRegistration/PricesScreen').default;
const PhotosScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/PhotosScreen'))
  : require('./screens/FarmRegistration/PhotosScreen').default;
const AmenitiesGamesScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/AmenitiesGamesScreen'))
  : require('./screens/FarmRegistration/AmenitiesGamesScreen').default;
const RulesRestrictionsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/RulesRestrictionsScreen'))
  : require('./screens/FarmRegistration/RulesRestrictionsScreen').default;
const KycScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/KycScreen'))
  : require('./screens/FarmRegistration/KycScreen').default;
const RegistrationFeeScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/FarmRegistration/RegistrationFeeScreen'))
  : require('./screens/FarmRegistration/RegistrationFeeScreen').default;

// User Screens — lazy on web
const ExploreScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/ExploreScreen'))
  : require('./screens/User/ExploreScreen').default;
const FarmhouseDetailScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/FarmhouseDetailScreen'))
  : require('./screens/User/FarmhouseDetailScreen').default;
const AllAmenitiesScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/AllAmenitiesScreen'))
  : require('./screens/User/AllAmenitiesScreen').default;
const AllReviewsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/AllReviewsScreen'))
  : require('./screens/User/AllReviewsScreen').default;
const BookingConfirmationScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/BookingConfirmationScreen'))
  : require('./screens/User/BookingConfirmationScreen').default;
const BookingDetailsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/BookingDetailsScreen'))
  : require('./screens/User/BookingDetailsScreen').default;
const EditProfileScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/EditProfileScreen'))
  : require('./screens/User/EditProfileScreen').default;
const BookingsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/tabs/BookingsScreen'))
  : require('./screens/User/tabs/BookingsScreen').default;
const WishlistScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/tabs/WishlistScreen'))
  : require('./screens/User/tabs/WishlistScreen').default;
const ProfileScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/tabs/ProfileScreen'))
  : require('./screens/User/tabs/ProfileScreen').default;

// Owner Screens — lazy on web
const MyFarmhousesScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/MyFarmhousesScreen'))
  : require('./screens/Owner/MyFarmhousesScreen').default;
const OwnerHomeScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/OwnerHomeScreen'))
  : require('./screens/Owner/OwnerHomeScreen').default;
const FarmhouseDetailOwnerScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/FarmhouseDetailOwnerScreen'))
  : require('./screens/Owner/FarmhouseDetailOwnerScreen').default;
const EditFarmhouseScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/EditFarmhouseScreen'))
  : require('./screens/Owner/EditFarmhouseScreen').default;
const OwnerBookingsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/BookingsListScreen'))
  : require('./screens/Owner/BookingsListScreen').default;
const OwnerBookingDetailScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/BookingDetailScreen'))
  : require('./screens/Owner/BookingDetailScreen').default;
const ManageBlockedDatesScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/ManageBlockedDatesScreen'))
  : require('./screens/Owner/ManageBlockedDatesScreen').default;

// Components
import PremiumTabBar from './components/PremiumTabBar';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';

// Suspense fallback for lazy screens on web
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7' }}>
    <ActivityIndicator color="#C5A565" size="large" />
  </View>
);

// Navigation types
import { RootStackParamList, TabParamList } from './types/navigation';

// Navigation setup
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Component that waits for auth before completing splash
function AnimatedSplashWithAuth({ message, onReady, onComplete }: {
  message: string;
  onReady: () => void;
  onComplete: () => void;
}) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SplashWithAuthCheck
          message={message}
          onReady={onReady}
          onComplete={onComplete}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Inner component that has access to auth context
function SplashWithAuthCheck({ message, onReady, onComplete }: {
  message: string;
  onReady: () => void;
  onComplete: () => void;
}) {
  const { loading: authLoading } = useAuth();
  const [animationDone, setAnimationDone] = React.useState(false);
  const MIN_SPLASH_TIME = 1500; // Minimum 1.5 seconds
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);
  const startTimeRef = React.useRef(Date.now());

  // Ensure minimum splash display time
  React.useEffect(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);

    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, remaining);

    return () => clearTimeout(timer);
  }, []);

  // Wait for: animation done + auth ready + minimum time
  React.useEffect(() => {
    if (animationDone && !authLoading && minTimeElapsed) {
      setTimeout(onComplete, 200);
    }
  }, [animationDone, authLoading, minTimeElapsed, onComplete]);

  return (
    <AnimatedSplashScreen
      message={authLoading ? "Initializing..." : message}
      onReady={onReady}
      onAnimationComplete={() => setAnimationDone(true)}
    />
  );
}

// Wrapper component to check if owner has farmhouses and route accordingly
function OwnerNavigator({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    checkFarmhouses();
  }, []);

  const checkFarmhouses = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const { ownerHasFarmhouses } = await import('./services/farmhouseService');
      const hasProperties = await ownerHasFarmhouses(user.uid);

      // Navigate to appropriate screen based on farmhouse ownership
      if (hasProperties) {
        navigation.replace('MyFarmhouses');
      } else {
        navigation.replace('OwnerHome');
      }
    } catch (error) {
      console.error('Error checking farmhouses:', error);
      navigation.replace('OwnerHome');
    } finally {
      setLoading(false);
    }
  };

  // Return empty view while checking - no loading indicator
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: 'rgb(249, 248, 239)' }} />;
  }

  return null;
}

// Bottom Tab Navigator for User screens
function UserTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: 'Wishlist',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// App Navigator
function AppNavigator() {
  const { user, loading } = useAuth();

  // Show a minimal loading indicator while auth initializes
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="rgb(244, 173, 50)" />
      </View>
    );
  }

  // Determine initial route based on user role
  const getInitialRoute = () => {
    if (!user) return 'Welcome';
    if (!user.role) return 'RoleSelection';
    if (user.role === 'customer') return 'UserHome';
    if (user.role === 'owner') return 'OwnerNavigator';
    return 'Welcome';
  };

  // Use a key that changes when user/role changes to force navigation reset
  const navigationKey = `nav-${user?.uid || 'none'}-${user?.role || 'none'}`;

  return (
    <NavigationContainer
      key={navigationKey}
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: '#FFFFFF',
        },
      }}
    >
      <TabBarVisibilityProvider>
        <Stack.Navigator
          initialRouteName={getInitialRoute()}
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#1F2937',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
          }}
        >
          {user ? (
            <>
              {/* Role Selection (for authenticated users without role) */}
            <Stack.Screen
              name="RoleSelection"
              component={RoleSelectionScreen}
              options={{ headerShown: false }}
            />

            {/* Owner Flow */}
            <Stack.Screen
              name="OwnerNavigator"
              component={OwnerNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OwnerHome"
              component={OwnerHomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MyFarmhouses"
              component={MyFarmhousesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FarmhouseDetailOwner"
              component={FarmhouseDetailOwnerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditFarmhouse"
              component={EditFarmhouseScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OwnerBookings"
              component={OwnerBookingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OwnerBookingDetails"
              component={OwnerBookingDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ManageBlockedDates"
              component={ManageBlockedDatesScreen}
              options={{ headerShown: false }}
            />

            {/* Farm Registration Flow */}
            <Stack.Screen
              name="FarmBasicDetails"
              component={BasicDetailsScreen}
              options={{ title: 'Basic Details', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="FarmPrices"
              component={PricesScreen}
              options={{ title: 'Pricing' }}
            />
            <Stack.Screen
              name="FarmPhotos"
              component={PhotosScreen}
              options={{ title: 'Photos' }}
            />
            <Stack.Screen
              name="FarmAmenitiesGames"
              component={AmenitiesGamesScreen}
              options={{ title: 'Amenities & Games' }}
            />
            <Stack.Screen
              name="FarmRulesRestrictions"
              component={RulesRestrictionsScreen}
              options={{ title: 'Rules & Review' }}
            />
            <Stack.Screen
              name="FarmKyc"
              component={KycScreen}
              options={{ title: 'KYC Verification' }}
            />
            <Stack.Screen
              name="RegistrationFee"
              component={RegistrationFeeScreen}
              options={{ title: 'Registration Fee' }}
            />

            {/* User Flow with Tabs */}
            <Stack.Screen
              name="UserHome"
              component={UserTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FarmhouseDetail"
              component={FarmhouseDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AllAmenities"
              component={AllAmenitiesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AllReviews"
              component={AllReviewsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookingConfirmation"
              component={BookingConfirmationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookingDetails"
              component={BookingDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Login"
                component={LoginWithRoleScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </TabBarVisibilityProvider>
    </NavigationContainer>
  );
}

// Root App Wrapper
export default function App() {
  // Web: skip splash entirely — instant FCP, auth handled by AppNavigator loading state
  const isWeb = Platform.OS === 'web';

  // Inject CSS to nuke all focus outlines on web (RN Web applies inline styles that
  // override web/index.html CSS, so we inject a <style> tag at runtime instead)
  useEffect(() => {
    if (!isWeb) return;
    const style = document.createElement('style');
    style.id = 'rn-no-focus-outline';
    style.textContent = `
      input, textarea, select, [contenteditable] {
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none;
      }
      input:focus, textarea:focus, select:focus, [contenteditable]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      *:focus { outline: none !important; }
      *:focus-visible { outline: none !important; box-shadow: none !important; }
    `;
    if (!document.getElementById('rn-no-focus-outline')) {
      document.head.appendChild(style);
    }
  }, [isWeb]);
  const [showApp, setShowApp] = React.useState(isWeb);
  const [appReady, setAppReady] = React.useState(false);

  // On web: only load Inter (via CSS in index.html), skip Seasons OTF (not needed on web)
  // On native: load all fonts as before
  const [fontsLoaded] = useFonts(
    isWeb
      ? {}
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          'Seasons-Regular': require('./assets/fonts/Fontspring-DEMO-theseasons-reg.otf'),
          'Seasons-Light': require('./assets/fonts/Fontspring-DEMO-theseasons-lt.otf'),
          'Seasons-Bold': require('./assets/fonts/Fontspring-DEMO-theseasons-bd.otf'),
          'Seasons-Italic': require('./assets/fonts/Fontspring-DEMO-theseasons-it.otf'),
          'Seasons-LightItalic': require('./assets/fonts/Fontspring-DEMO-theseasons-ltit.otf'),
          'Seasons-BoldItalic': require('./assets/fonts/Fontspring-DEMO-theseasons-bdit.otf'),
        }
  );

  // Track auth loading state to prevent showing app before ready
  const [authInitialized, setAuthInitialized] = React.useState(false);

  // Keep native splash visible until custom splash is ready
  React.useEffect(() => {
    setAppReady(true);
  }, []);

  // Hide native splash only after custom splash renders
  const onCustomSplashReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.error('Error hiding splash:', e);
    }
  }, []);

  // Register for push notifications on app start - but don't block
  // Note: FCM (Firebase Cloud Messaging) credentials must be configured for production
  // See: https://docs.expo.dev/push-notifications/fcm-credentials/
  // For development, push notifications will gracefully fail if FCM is not set up
  useEffect(() => {
    // Run in background without blocking
    setTimeout(() => {
      registerForPushNotifications().catch(() => {
        // Push notifications unavailable — not critical
      });
    }, 5000); // Delay by 5 seconds to not block startup
  }, []);

  // DEV MODE: Skip splash for faster development
  const SKIP_SPLASH = __DEV__ && false; // Change to true to skip splash

  React.useEffect(() => {
    if (SKIP_SPLASH) {
      SplashScreen.hideAsync().catch(() => {});
      setShowApp(true);
    }
  }, []);

  // Show custom splash on native only — web goes straight to app
  if (!showApp && !SKIP_SPLASH && !isWeb) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgb(249, 248, 239)' }}>
        <AnimatedSplashWithAuth
          message="Loading..."
          onReady={onCustomSplashReady}
          onComplete={() => setShowApp(true)}
        />
      </View>
    );
  }

  // Show app only after splash completes
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <GlobalDataProvider>
            <ThemeProvider>
              <DialogProvider>
                <ToastProvider>
                  <WishlistProvider>
                    <FarmRegistrationProvider>
                      <Suspense fallback={<ScreenLoader />}>
                        <AppNavigator />
                      </Suspense>
                    </FarmRegistrationProvider>
                  </WishlistProvider>
                </ToastProvider>
              </DialogProvider>
            </ThemeProvider>
          </GlobalDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});