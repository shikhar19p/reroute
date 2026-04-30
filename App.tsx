import React, { useEffect, useCallback, Suspense } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Animated, View, StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
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
import { GlobalDataProvider, useMyFarmhouses } from './GlobalDataContext';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/CustomDialog';
import { TabBarVisibilityProvider } from './context/TabBarVisibilityContext';
import ErrorBoundary from './components/ErrorBoundary';
import { registerForPushNotifications, saveFcmToken } from './services/notificationService';

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
const PrivacyPolicyScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/PrivacyPolicyScreen'))
  : require('./screens/User/PrivacyPolicyScreen').default;
const FAQsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/FAQsScreen'))
  : require('./screens/User/FAQsScreen').default;
const TermsAndConditionsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/TermsAndConditionsScreen'))
  : require('./screens/User/TermsAndConditionsScreen').default;
const ContactUsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/User/ContactUsScreen'))
  : require('./screens/User/ContactUsScreen').default;

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
const OwnerNotificationsScreen = Platform.OS === 'web'
  ? React.lazy(() => import('./screens/Owner/OwnerNotificationsScreen'))
  : require('./screens/Owner/OwnerNotificationsScreen').default;

// Components
import PremiumTabBar from './components/PremiumTabBar';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';
import OfflineBanner, { OFFLINE_BANNER_HEIGHT } from './components/OfflineBanner';
import { NetworkProvider, useNetwork } from './context/NetworkContext';

// Suspense fallback for lazy screens on web
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7' }}>
    <ActivityIndicator color="#C5A565" size="large" />
  </View>
);

// Prefetch all lazy chunks in background so first navigation is instant.
// Called once after app shell mounts — fire-and-forget, no await.
function prefetchLazyScreens() {
  if (Platform.OS !== 'web') return;
  const chunks = [
    () => import('./screens/User/ExploreScreen'),
    () => import('./screens/User/FarmhouseDetailScreen'),
    () => import('./screens/User/BookingConfirmationScreen'),
    () => import('./screens/User/tabs/BookingsScreen'),
    () => import('./screens/User/tabs/WishlistScreen'),
    () => import('./screens/User/tabs/ProfileScreen'),
    () => import('./screens/User/BookingDetailsScreen'),
    () => import('./screens/User/AllAmenitiesScreen'),
    () => import('./screens/User/AllReviewsScreen'),
    () => import('./screens/User/EditProfileScreen'),
    () => import('./screens/User/PrivacyPolicyScreen'),
    () => import('./screens/User/FAQsScreen'),
    () => import('./screens/User/TermsAndConditionsScreen'),
    () => import('./screens/User/ContactUsScreen'),
    () => import('./screens/Owner/MyFarmhousesScreen'),
    () => import('./screens/Owner/OwnerHomeScreen'),
    () => import('./screens/Owner/FarmhouseDetailOwnerScreen'),
    () => import('./screens/Owner/EditFarmhouseScreen'),
    () => import('./screens/Owner/BookingsListScreen'),
    () => import('./screens/Owner/BookingDetailScreen'),
    () => import('./screens/Owner/ManageBlockedDatesScreen'),
    () => import('./screens/FarmRegistration/BasicDetailsScreen'),
    () => import('./screens/FarmRegistration/PricesScreen'),
    () => import('./screens/FarmRegistration/PhotosScreen'),
    () => import('./screens/FarmRegistration/AmenitiesGamesScreen'),
    () => import('./screens/FarmRegistration/RulesRestrictionsScreen'),
    () => import('./screens/FarmRegistration/KycScreen'),
    () => import('./screens/FarmRegistration/RegistrationFeeScreen'),
  ];
  // Stagger slightly so initial render isn't blocked
  setTimeout(() => {
    chunks.forEach((load, i) => setTimeout(load, i * 30));
  }, 300);
}

// Navigation types
import { RootStackParamList, TabParamList } from './types/navigation';

// Pushes app content down when offline banner is visible so banner never covers content
function OfflineContentWrapper({ children }: { children: React.ReactNode }) {
  const { isConnected, wasOffline } = useNetwork();
  const padTop = React.useRef(new Animated.Value(0)).current;
  const showing = !isConnected || wasOffline;

  React.useEffect(() => {
    Animated.timing(padTop, {
      toValue: showing ? OFFLINE_BANNER_HEIGHT : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showing]);

  return (
    <Animated.View style={{ flex: 1, paddingTop: padTop }}>
      {children}
    </Animated.View>
  );
}

// Navigation setup
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Component that has access to auth context
function SplashWithAuthCheck({ message, onReady, onComplete }: {
  message: string;
  onReady: () => void;
  onComplete: () => void;
}) {
  const { loading: authLoading } = useAuth();
  const [animationDone, setAnimationDone] = React.useState(false);
  const MIN_SPLASH_TIME = 800; // Minimum 0.8 seconds
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
      onComplete();
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
  const { data: myFarmhouses, loading, serverConfirmed } = useMyFarmhouses();
  const { user } = useAuth();
  const routed = React.useRef(false);

  React.useEffect(() => {
    if (!user?.uid || loading || routed.current) return;
    // If cache has farms, route immediately (server will update in-place).
    // If no farms yet, wait for server confirmation before routing to OwnerHome.
    if (myFarmhouses.length === 0 && !serverConfirmed) return;
    routed.current = true;
    if (myFarmhouses.length > 0) {
      navigation.replace('MyFarmhouses');
    } else {
      navigation.replace('OwnerHome');
    }
  }, [user?.uid, loading, serverConfirmed, myFarmhouses, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: 'rgb(249, 248, 239)', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
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

  // Prefetch all lazy screen chunks once auth resolves
  React.useEffect(() => {
    if (!loading) prefetchLazyScreens();
  }, [loading]);

  // Save native FCM token for this user so Cloud Functions can send pushes
  React.useEffect(() => {
    if (!user?.uid || Platform.OS === 'web') return;
    saveFcmToken(user.uid).catch(() => {});
  }, [user?.uid]);

  // Hide HTML splash screen once auth resolves (web only)
  React.useEffect(() => {
    if (loading || Platform.OS !== 'web') return;
    const el = document.getElementById('web-splash');
    if (!el) return;
    el.classList.add('fade-out');
    const t = setTimeout(() => el.remove(), 400);
    return () => clearTimeout(t);
  }, [loading]);

  // On web the HTML splash covers this; show plain background (no spinner flash)
  if (loading) {
    return (
      <View style={[styles.loadingContainer, Platform.OS === 'web' && { backgroundColor: '#F9F8EF' }]}>
        {Platform.OS !== 'web' && <ActivityIndicator size="large" color="rgb(244, 173, 50)" />}
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
            <Stack.Screen
              name="OwnerNotifications"
              component={OwnerNotificationsScreen}
              options={{ headerShown: false }}
            />

            {/* Farm Registration Flow */}
            <Stack.Screen
              name="FarmBasicDetails"
              component={BasicDetailsScreen}
              options={{ headerShown: false }}
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
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FarmKyc"
              component={KycScreen}
              options={{ headerShown: false }}
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
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FAQs"
              component={FAQsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TermsAndConditions"
              component={TermsAndConditionsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ContactUs"
              component={ContactUsScreen}
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
  // Only Seasons-Light needed for splash monogram — load it eagerly.
  // All other fonts load in background so they're ready before first app screen.
  const [fontsLoaded] = useFonts(
    isWeb ? {} : { 'Seasons-Light': require('./assets/fonts/Fontspring-DEMO-theseasons-lt.otf') }
  );

  useEffect(() => {
    if (isWeb) return;
    Font.loadAsync({
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
      'Seasons-Regular': require('./assets/fonts/Fontspring-DEMO-theseasons-reg.otf'),
      'Seasons-Bold': require('./assets/fonts/Fontspring-DEMO-theseasons-bd.otf'),
      'Seasons-Italic': require('./assets/fonts/Fontspring-DEMO-theseasons-it.otf'),
      'Seasons-LightItalic': require('./assets/fonts/Fontspring-DEMO-theseasons-ltit.otf'),
      'Seasons-BoldItalic': require('./assets/fonts/Fontspring-DEMO-theseasons-bdit.otf'),
    }).catch(() => {});
  }, []);

  // Track auth loading state to prevent showing app before ready
  const [authInitialized, setAuthInitialized] = React.useState(false);

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
    // Push notifications: native only — web requires user gesture, never request on page load
    if (Platform.OS === 'web') return;
    setTimeout(() => {
      registerForPushNotifications().catch(() => {});
    }, 5000);
  }, []);

  // DEV MODE: Skip splash for faster development
  const SKIP_SPLASH = __DEV__ && false; // Change to true to skip splash

  React.useEffect(() => {
    if (SKIP_SPLASH) {
      SplashScreen.hideAsync().catch(() => {});
      setShowApp(true);
    }
  }, []);

  // Single provider tree — splash and app share the same AuthProvider
  // so auth state is already resolved when the app screen mounts (no spinner flash)
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NetworkProvider>
          <AuthProvider>
            <GlobalDataProvider>
              <ThemeProvider>
                <DialogProvider>
                  <ToastProvider>
                    <WishlistProvider>
                      <FarmRegistrationProvider>
                        <OfflineContentWrapper>
                          {!showApp && !SKIP_SPLASH && !isWeb ? (
                            <View style={{ flex: 1, backgroundColor: '#000' }}>
                              {fontsLoaded && (
                                <SplashWithAuthCheck
                                  message="Loading..."
                                  onReady={onCustomSplashReady}
                                  onComplete={() => setShowApp(true)}
                                />
                              )}
                            </View>
                          ) : (
                            <Suspense fallback={<ScreenLoader />}>
                              <AppNavigator />
                            </Suspense>
                          )}
                        </OfflineContentWrapper>
                        <OfflineBanner />
                      </FarmRegistrationProvider>
                    </WishlistProvider>
                  </ToastProvider>
                </DialogProvider>
              </ThemeProvider>
            </GlobalDataProvider>
          </AuthProvider>
        </NetworkProvider>
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