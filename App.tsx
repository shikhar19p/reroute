import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './authContext';
import { FarmRegistrationProvider } from './context/FarmRegistrationContext';
import { AdminProvider } from './context/AdminContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Farm Registration Screens
import RoleChoiceScreen from './screens/FarmRegistration/RoleChoiceScreen';
import BasicDetailsScreen from './screens/FarmRegistration/BasicDetailsScreen';
import PricesScreen from './screens/FarmRegistration/PricesScreen';
import PhotosScreen from './screens/FarmRegistration/PhotosScreen';
import AmenitiesGamesScreen from './screens/FarmRegistration/AmenitiesGamesScreen';
import RulesRestrictionsScreen from './screens/FarmRegistration/RulesRestrictionsScreen';
import KycScreen from './screens/FarmRegistration/KycScreen';

// Admin Screens
import AdminScreen from './screens/Admin/AdminScreen';
import EditFarmScreen from './screens/Admin/EditFarmScreen';

// User Screens
import ExploreScreen from './screens/User/ExploreScreen';
import FarmhouseDetailScreen from './screens/User/FarmhouseDetailScreen';
import AllAmenitiesScreen from './screens/User/AllAmenitiesScreen';
import AllReviewsScreen from './screens/User/AllReviewsScreen';
import BookingConfirmationScreen from './screens/User/BookingConfirmationScreen';
import BookingsScreen from './screens/User/tabs/BookingsScreen';
import WishlistScreen from './screens/User/tabs/WishlistScreen';
import ProfileScreen from './screens/User/tabs/ProfileScreen';

// Owner Screens
import MyFarmhousesScreen from './screens/Owner/MyFarmhousesScreen';
import FarmhouseDetailOwnerScreen from './screens/Owner/FarmhouseDetailOwnerScreen';
import EditFarmhouseScreen from './screens/Owner/EditFarmhouseScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for User screens
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#02444d',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📅</Text>,
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: 'Wishlist',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>❤️</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1F2937',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="RoleChoice"
              component={RoleChoiceScreen}
              options={{ headerShown: false }}
            />

            {/* Owner Flow */}
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
              options={{ title: 'Edit Farmhouse' }}
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

            {/* Admin Flow */}
            <Stack.Screen
              name="AdminHome"
              component={AdminScreen}
              options={{ title: 'Admin Dashboard' }}
            />
            <Stack.Screen
              name="AdminEditFarm"
              component={EditFarmScreen}
              options={{ title: 'Edit Farm' }}
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
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <WishlistProvider>
          <FarmRegistrationProvider>
            <AdminProvider>
              <AppNavigator />
            </AdminProvider>
          </FarmRegistrationProvider>
        </WishlistProvider>
      </ThemeProvider>
    </AuthProvider>
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
