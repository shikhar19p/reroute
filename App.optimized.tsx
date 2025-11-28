import React, { useEffect, useCallback, useMemo } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

// Core Providers (Always loaded)
import { CoreProviders, UserProviders, OwnerProviders } from './providers/AppProviders';
import { useAuth } from './authContext';
import { TabBarVisibilityProvider } from './context/TabBarVisibilityContext';
import { registerForPushNotifications } from './services/notificationService';

// Lazy load screens for better performance
const AnimatedSplashScreen = React.lazy(() => import('./components/AnimatedSplashScreen'));
const WelcomeScreen = React.lazy(() => import('./screens/WelcomeScreen'));
const LoginWithRoleScreen = React.lazy(() => import('./screens/LoginWithRoleScreen'));
const RoleSelectionScreen = React.lazy(() => import('./screens/RoleSelectionScreen'));

// Lazy load User screens
const ExploreScreen = React.lazy(() => import('./screens/User/ExploreScreen'));
const FarmhouseDetailScreen = React.lazy(() => import('./screens/User/FarmhouseDetailScreen'));
const BookingsScreen = React.lazy(() => import('./screens/User/tabs/BookingsScreen'));
const WishlistScreen = React.lazy(() => import('./screens/User/tabs/WishlistScreen'));
const ProfileScreen = React.lazy(() => import('./screens/User/tabs/ProfileScreen'));
const AllAmenitiesScreen = React.lazy(() => import('./screens/User/AllAmenitiesScreen'));
const AllReviewsScreen = React.lazy(() => import('./screens/User/AllReviewsScreen'));
const BookingConfirmationScreen = React.lazy(() => import('./screens/User/BookingConfirmationScreen'));
const BookingDetailsScreen = React.lazy(() => import('./screens/User/BookingDetailsScreen'));
const EditProfileScreen = React.lazy(() => import('./screens/User/EditProfileScreen'));

// Lazy load Owner screens
const MyFarmhousesScreen = React.lazy(() => import('./screens/Owner/MyFarmhousesScreen'));
const OwnerHomeScreen = React.lazy(() => import('./screens/Owner/OwnerHomeScreen'));
const FarmhouseDetailOwnerScreen = React.lazy(() => import('./screens/Owner/FarmhouseDetailOwnerScreen'));
const EditFarmhouseScreen = React.lazy(() => import('./screens/Owner/EditFarmhouseScreen'));
const OwnerBookingsScreen = React.lazy(() => import('./screens/Owner/BookingsListScreen'));
const OwnerBookingDetailScreen = React.lazy(() => import('./screens/Owner/BookingDetailScreen'));
const ManageBlockedDatesScreen = React.lazy(() => import('./screens/Owner/ManageBlockedDatesScreen'));

// Lazy load Farm Registration screens
const BasicDetailsScreen = React.lazy(() => import('./screens/FarmRegistration/BasicDetailsScreen'));
const PricesScreen = React.lazy(() => import('./screens/FarmRegistration/PricesScreen'));
const PhotosScreen = React.lazy(() => import('./screens/FarmRegistration/PhotosScreen'));
const AmenitiesGamesScreen = React.lazy(() => import('./screens/FarmRegistration/AmenitiesGamesScreen'));
const RulesRestrictionsScreen = React.lazy(() => import('./screens/FarmRegistration/RulesRestrictionsScreen'));
const KycScreen = React.lazy(() => import('./screens/FarmRegistration/KycScreen'));
const RegistrationFeeScreen = React.lazy(() => import('./screens/FarmRegistration/RegistrationFeeScreen'));

// Components
const PremiumTabBar = React.lazy(() => import('./components/PremiumTabBar'));

// Navigation types
import { RootStackParamList, TabParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Memoized components for better performance
const OwnerNavigator = React.memo(({ navigation }: any) => {
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

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: 'rgb(249, 248, 239)' }} />;
  }

  return null;
});

// Memoized UserTabs to prevent unnecessary re-renders
const UserTabs = React.memo(() => (
  <Tab.Navigator
    tabBar={(props) => <PremiumTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Explore" component={ExploreScreen} options={{ tabBarLabel: 'Explore' }} />
    <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarLabel: 'Bookings' }} />
    <Tab.Screen name="Wishlist" component={WishlistScreen} options={{ tabBarLabel: 'Wishlist' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
));

// Main App Navigator with role-based provider loading
function AppNavigator() {
  const { user } = useAuth();

  const getInitialRoute = useCallback(() => {
    if (!user) return 'Welcome';
    if (!user.role) return 'RoleSelection';
    if (user.role === 'customer') return 'UserHome';
    if (user.role === 'owner') return 'OwnerNavigator';
    return 'Welcome';
  }, [user]);

  const navigationKey = useMemo(
    () => `nav-${user?.uid || 'none'}-${user?.role || 'none'}`,
    [user?.uid, user?.role]
  );

  // Role-based provider selection
  const ContentWithProviders = useMemo(() => {
    if (!user) {
      // No additional providers needed for unauthenticated users
      return (
        <NavigationContainer
          key={navigationKey}
          theme={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
          }}
        >
          <TabBarVisibilityProvider>
            <Stack.Navigator
              initialRouteName={getInitialRoute()}
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginWithRoleScreen} />
            </Stack.Navigator>
          </TabBarVisibilityProvider>
        </NavigationContainer>
      );
    }

    // User role - load user-specific providers
    if (user.role === 'customer') {
      return (
        <UserProviders>
          <NavigationContainer
            key={navigationKey}
            theme={{
              ...DefaultTheme,
              colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
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
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
                <Stack.Screen name="UserHome" component={UserTabs} options={{ headerShown: false }} />
                <Stack.Screen name="FarmhouseDetail" component={FarmhouseDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AllAmenities" component={AllAmenitiesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AllReviews" component={AllReviewsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ headerShown: false }} />
                <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
              </Stack.Navigator>
            </TabBarVisibilityProvider>
          </NavigationContainer>
        </UserProviders>
      );
    }

    // Owner role - load owner-specific providers
    if (user.role === 'owner') {
      return (
        <OwnerProviders>
          <NavigationContainer
            key={navigationKey}
            theme={{
              ...DefaultTheme,
              colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
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
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
                <Stack.Screen name="OwnerNavigator" component={OwnerNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MyFarmhouses" component={MyFarmhousesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="FarmhouseDetailOwner" component={FarmhouseDetailOwnerScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EditFarmhouse" component={EditFarmhouseScreen} options={{ headerShown: false }} />
                <Stack.Screen name="OwnerBookings" component={OwnerBookingsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="OwnerBookingDetails" component={OwnerBookingDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ManageBlockedDates" component={ManageBlockedDatesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="FarmBasicDetails" component={BasicDetailsScreen} options={{ title: 'Basic Details', headerBackTitle: 'Back' }} />
                <Stack.Screen name="FarmPrices" component={PricesScreen} options={{ title: 'Pricing' }} />
                <Stack.Screen name="FarmPhotos" component={PhotosScreen} options={{ title: 'Photos' }} />
                <Stack.Screen name="FarmAmenitiesGames" component={AmenitiesGamesScreen} options={{ title: 'Amenities & Games' }} />
                <Stack.Screen name="FarmRulesRestrictions" component={RulesRestrictionsScreen} options={{ title: 'Rules & Review' }} />
                <Stack.Screen name="FarmKyc" component={KycScreen} options={{ title: 'KYC Verification' }} />
                <Stack.Screen name="RegistrationFee" component={RegistrationFeeScreen} options={{ title: 'Registration Fee' }} />
              </Stack.Navigator>
            </TabBarVisibilityProvider>
          </NavigationContainer>
        </OwnerProviders>
      );
    }

    // No role - show role selection
    return (
      <NavigationContainer
        key={navigationKey}
        theme={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
        }}
      >
        <TabBarVisibilityProvider>
          <Stack.Navigator
            initialRouteName={getInitialRoute()}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          </Stack.Navigator>
        </TabBarVisibilityProvider>
      </NavigationContainer>
    );
  }, [user, navigationKey, getInitialRoute]);

  return ContentWithProviders;
}

// Root App Component
export default function App() {
  const [showApp, setShowApp] = React.useState(false);

  // Load fonts
  const [fontsLoaded] = useFonts({
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
  });

  // Hide native splash only after custom splash renders
  const onCustomSplashReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Register for push notifications on app start
  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('✅ Push notification token:', token);
      }
    });
  }, []);

  // Show custom splash
  if (!showApp) {
    return (
      <View style={styles.container}>
        <React.Suspense fallback={null}>
          <AnimatedSplashScreen
            message="Loading..."
            onReady={onCustomSplashReady}
            onAnimationComplete={() => setShowApp(true)}
          />
        </React.Suspense>
      </View>
    );
  }

  // Show app with core providers
  return (
    <React.Suspense fallback={<View style={styles.container} />}>
      <CoreProviders>
        <AppNavigator />
      </CoreProviders>
    </React.Suspense>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(249, 248, 239)',
  },
});
