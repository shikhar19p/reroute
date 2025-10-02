import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './authContext';
import { FarmRegistrationProvider } from './context/FarmRegistrationContext';
import { AdminProvider } from './context/AdminContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

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

// User Screen
import VacationRentalApp from './screens/VacationRentalApp';

const Stack = createNativeStackNavigator();

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

            {/* User Flow */}
            <Stack.Screen
              name="ReiHome"
              component={VacationRentalApp}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
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
      <FarmRegistrationProvider>
        <AdminProvider>
          <AppNavigator />
        </AdminProvider>
      </FarmRegistrationProvider>
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
