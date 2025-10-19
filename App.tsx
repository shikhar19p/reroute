import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Home, Calendar, Heart, User } from 'lucide-react-native';

// Contexts
import { AuthProvider, useAuth } from './authContext';
import { FarmRegistrationProvider } from './context/FarmRegistrationContext';
import { AdminProvider } from './context/AdminContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import { GlobalDataProvider } from './GlobalDataContext';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// Farm Registration
import RoleChoiceScreen from './screens/FarmRegistration/RoleChoiceScreen';
import BasicDetailsScreen from './screens/FarmRegistration/BasicDetailsScreen';
import PricesScreen from './screens/FarmRegistration/PricesScreen';
import PhotosScreen from './screens/FarmRegistration/PhotosScreen';
import AmenitiesGamesScreen from './screens/FarmRegistration/AmenitiesGamesScreen';
import RulesRestrictionsScreen from './screens/FarmRegistration/RulesRestrictionsScreen';
import KycScreen from './screens/FarmRegistration/KycScreen';

// Admin
import AdminScreen from './screens/Admin/AdminScreen';
import EditFarmScreen from './screens/Admin/EditFarmScreen';

// User
import ExploreScreen from './screens/User/ExploreScreen';
import FarmhouseDetailScreen from './screens/User/FarmhouseDetailScreen';
import AllAmenitiesScreen from './screens/User/AllAmenitiesScreen';
import AllReviewsScreen from './screens/User/AllReviewsScreen';
import BookingConfirmationScreen from './screens/User/BookingConfirmationScreen';
import BookingsScreen from './screens/User/tabs/BookingsScreen';
import WishlistScreen from './screens/User/tabs/WishlistScreen';
import ProfileScreen from './screens/User/tabs/ProfileScreen';
import EditProfileScreen from './screens/User/EditProfileScreen';
import BookingDetailsScreen from './screens/User/BookingDetailsScreen';

// Owner
import MyFarmhousesScreen from './screens/Owner/MyFarmhousesScreen';
import FarmhouseDetailOwnerScreen from './screens/Owner/FarmhouseDetailOwnerScreen';
import EditFarmhouseScreen from './screens/Owner/EditFarmhouseScreen';
import OwnerBookingsScreen from './screens/Owner/BookingsListScreen';
import OwnerBookingDetailScreen from './screens/Owner/BookingDetailScreen';
import ManageBlockedDatesScreen from './screens/Owner/ManageBlockedDatesScreen';

// Navigation types
import { RootStackParamList, TabParamList } from './types/navigation';

// Navigation setup
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Bottom Tab Navigator
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#02444d',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: 'Wishlist',
          tabBarIcon: ({ color }) => <Heart size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// App Navigator
function AppNavigator() {
  const { user, loading } = useAuth();

  // 🔹 Safety: Ensure text is always inside <Text> (prevents RN rendering error)
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#02444d" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: '#FFFFFF',
        },
      }}
    >
      <Stack.Navigator
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
            {/* Role choice */}
            <Stack.Screen
              name="RoleChoice"
              component={RoleChoiceScreen}
              options={{ headerShown: false }}
            />

            {/* Owner Flow */}
            <Stack.Screen name="MyFarmhouses" component={MyFarmhousesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FarmhouseDetailOwner" component={FarmhouseDetailOwnerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditFarmhouse" component={EditFarmhouseScreen} options={{ title: 'Edit Farmhouse' }} />
            <Stack.Screen name="OwnerBookings" component={OwnerBookingsScreen} options={{ title: 'Bookings' }} />
            <Stack.Screen name="OwnerBookingDetails" component={OwnerBookingDetailScreen} options={{ title: 'Booking Details' }} />
            <Stack.Screen name="ManageBlockedDates" component={ManageBlockedDatesScreen} options={{ title: 'Blocked Dates' }} />

            {/* Farm Registration Flow */}
            <Stack.Screen name="FarmBasicDetails" component={BasicDetailsScreen} options={{ title: 'Basic Details', headerBackTitle: 'Back' }} />
            <Stack.Screen name="FarmPrices" component={PricesScreen} options={{ title: 'Pricing' }} />
            <Stack.Screen name="FarmPhotos" component={PhotosScreen} options={{ title: 'Photos' }} />
            <Stack.Screen name="FarmAmenitiesGames" component={AmenitiesGamesScreen} options={{ title: 'Amenities & Games' }} />
            <Stack.Screen name="FarmRulesRestrictions" component={RulesRestrictionsScreen} options={{ title: 'Rules & Review' }} />
            <Stack.Screen name="FarmKyc" component={KycScreen} options={{ title: 'KYC Verification' }} />

            {/* Admin Flow */}
            <Stack.Screen name="AdminHome" component={AdminScreen} options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="AdminEditFarm" component={EditFarmScreen} options={{ title: 'Edit Farm' }} />

            {/* User Flow */}
            <Stack.Screen name="UserHome" component={UserTabs} options={{ headerShown: false }} />
            <Stack.Screen name="FarmhouseDetail" component={FarmhouseDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AllAmenities" component={AllAmenitiesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AllReviews" component={AllReviewsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Root App Wrapper
export default function App() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ThemeProvider>
          <WishlistProvider>
            <FarmRegistrationProvider>
              <AdminProvider>
                <AppNavigator />
              </AdminProvider>
            </FarmRegistrationProvider>
          </WishlistProvider>
        </ThemeProvider>
      </GlobalDataProvider>
    </AuthProvider>
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
