import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './authContext';
import { FarmRegistrationProvider } from './context/FarmRegistrationContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import ErrorBoundary from './components/ErrorBoundary';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginWithRoleScreen from './screens/LoginWithRoleScreen';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { registerForPushNotifications } from './services/notificationService';

// Farm Registration Screens
import BasicDetailsScreen from './screens/FarmRegistration/BasicDetailsScreen';
import PricesScreen from './screens/FarmRegistration/PricesScreen';
import PhotosScreen from './screens/FarmRegistration/PhotosScreen';
import AmenitiesGamesScreen from './screens/FarmRegistration/AmenitiesGamesScreen';
import RulesRestrictionsScreen from './screens/FarmRegistration/RulesRestrictionsScreen';
import KycScreen from './screens/FarmRegistration/KycScreen';

// User Screens
import ExploreScreen from './screens/User/ExploreScreen';
import FarmhouseDetailScreen from './screens/User/FarmhouseDetailScreen';
import AllAmenitiesScreen from './screens/User/AllAmenitiesScreen';
import AllReviewsScreen from './screens/User/AllReviewsScreen';
import BookingConfirmationScreen from './screens/User/BookingConfirmationScreen';
import BookingsScreen from './screens/User/tabs/BookingsScreen';
import WishlistScreen from './screens/User/tabs/WishlistScreen';
import ProfileScreen from './screens/User/tabs/ProfileScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';

// Owner Screens
import MyFarmhousesScreen from './screens/Owner/MyFarmhousesScreen';
import OwnerHomeScreen from './screens/Owner/OwnerHomeScreen';
import PremiumTabBar from './components/PremiumTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper component to check if owner has farmhouses and route accordingly
function OwnerNavigator({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [hasFarmhouses, setHasFarmhouses] = React.useState(false);

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
      setHasFarmhouses(hasProperties);

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

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={{ marginTop: 16, color: '#6C757D' }}>Loading...</Text>
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

function AppNavigator() {
  const { user, loading } = useAuth();

  console.log('🔄 AppNavigator render - loading:', loading, 'user:', user?.email, 'role:', user?.role);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Determine initial route based on user role
  const getInitialRoute = () => {
    if (!user) {
      console.log('📍 No user - going to Welcome');
      return 'Welcome';
    }
    if (!user.role) {
      console.log('📍 User authenticated but no role - going to RoleSelection');
      return 'RoleSelection';
    }
    if (user.role === 'customer') {
      console.log('📍 Customer role - going to UserHome');
      return 'UserHome';
    }
    if (user.role === 'owner') {
      console.log('📍 Owner role - going to OwnerNavigator');
      return 'OwnerNavigator';
    }
    console.log('📍 Unknown state - going to Welcome');
    return 'Welcome';
  };

  // Use a key that changes when user/role changes to force navigation reset
  const navigationKey = `nav-${user?.uid || 'none'}-${user?.role || 'none'}`;

  return (
    <NavigationContainer key={navigationKey}>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1F2937',
          headerTitleStyle: { fontWeight: '600' },
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

            {/* Farm Registration Flow */}
            <Stack.Screen
              name="FarmBasicDetails"
              component={BasicDetailsScreen}
              options={{ title: 'Basic Details' }}
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
              options={{ title: 'Amenities & Rules' }}
            />
            <Stack.Screen
              name="FarmRulesRestrictions"
              component={RulesRestrictionsScreen}
              options={{ title: 'Review' }}
            />
            <Stack.Screen
              name="FarmKyc"
              component={KycScreen}
              options={{ title: 'KYC Verification' }}
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
              options={{ title: 'All Amenities' }}
            />
            <Stack.Screen
              name="AllReviews"
              component={AllReviewsScreen}
              options={{ title: 'All Reviews' }}
            />
            <Stack.Screen
              name="BookingConfirmation"
              component={BookingConfirmationScreen}
              options={{ title: 'Confirm Booking' }}
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
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Register for push notifications on app start
  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('✅ Push notification token:', token);
        // TODO: Save token to user profile in Firestore
      }
    });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={{ marginTop: 16, color: '#6C757D' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <WishlistProvider>
            <FarmRegistrationProvider>
              <AppNavigator />
            </FarmRegistrationProvider>
          </WishlistProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
