import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../authContext';

type RootStackParamList = {
  RoleChoice: undefined;
  FarmBasicDetails: undefined;
  ReiHome: undefined;
  AdminHome: undefined;
};

type RoleChoiceScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoleChoice'>;
};

export default function RoleChoiceScreen({ navigation }: RoleChoiceScreenProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>Select how you want to continue</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => navigation.navigate('FarmBasicDetails')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🏢</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Farm Owner</Text>
            <Text style={styles.roleDescription}>Register and manage your farmhouse</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => navigation.navigate('AdminHome')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, styles.adminIconContainer]}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Admin</Text>
            <Text style={styles.roleDescription}>Manage all farmhouses and bookings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.userCard]}
          onPress={() => navigation.navigate('UserHome')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, styles.userIconContainer]}>
            <Text style={styles.iconText}>🏠</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>User</Text>
            <Text style={styles.roleDescription}>Browse and book farmhouses</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userCard: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 32,
  },
  adminIconContainer: {
    backgroundColor: '#FFF3E0',
  },
  userIconContainer: {
    backgroundColor: '#E3F2FD',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
