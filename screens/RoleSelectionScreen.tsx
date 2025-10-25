import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDialog } from '../components/CustomDialog';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../authContext';
import { saveSession } from '../sessionManager';

export default function RoleSelectionScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'owner' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleBack = async () => {
    if (loading || loggingOut) return;

    showDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to go back? You will be signed out.',
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
              console.log('✅ User signed out successfully');
              // Navigation will be handled automatically by AuthContext
            } catch (error) {
              console.error('❌ Error signing out:', error);
              setLoggingOut(false);
              showDialog({
                title: 'Error',
                message: 'Failed to sign out. Please try again.',
                type: 'error'
              });
            }
          },
        },
      ],
    });
  };

  const handleRoleSelection = async (role: 'customer' | 'owner') => {
    console.log('🎯 Button pressed! Selected role:', role);

    if (!user) {
      showDialog({
        title: 'Error',
        message: 'User not authenticated',
        type: 'error'
      });
      console.log('❌ No user found');
      return;
    }

    console.log('✅ User found:', user.email);
    setSelectedRole(role);
    setLoading(true);

    try {
      console.log('📝 Starting role save process...');

      // Try to save to Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          await setDoc(userDocRef, {
            ...userDoc.data(),
            role,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log('✅ Role saved to Firestore');
        } else {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role,
            createdAt: new Date().toISOString(),
          });
          console.log('✅ User document created in Firestore');
        }
      } catch (firestoreError: any) {
        console.warn('⚠️ Could not save to Firestore:', firestoreError.message);
        console.log('💡 Continuing with local storage only');
      }

      // Update local session
      await saveSession({
        ...user,
        role,
      });
      console.log('✅ Role saved to local storage');

      setLoading(false);
      console.log('🎉 Role selection complete!');

      // Navigate to appropriate screen
      if (role === 'customer') {
        console.log('🚀 Navigating to UserHome');
        navigation.replace('UserHome');
      } else if (role === 'owner') {
        console.log('🚀 Navigating to OwnerNavigator');
        navigation.replace('OwnerNavigator');
      }
    } catch (error: any) {
      console.error('❌ Error setting role:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to set role. Please try again.',
        type: 'error'
      });
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={loading || loggingOut}
        activeOpacity={0.7}
      >
        {loggingOut ? (
          <ActivityIndicator color="#D4AF37" size="small" />
        ) : (
          <Text style={styles.backButtonText}>← Back</Text>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon with Question Mark */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="account" size={40} color="#FFF" />
            <View style={styles.questionBadge}>
              <Text style={styles.questionMark}>?</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>How you want to use Reroute?</Text>
        <Text style={styles.subtitle}>Choose your role to get started</Text>

        {/* User Card */}
        <TouchableOpacity
          style={[styles.roleCard, loading && selectedRole === 'customer' && styles.roleCardDisabled]}
          onPress={() => handleRoleSelection('customer')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.roleCardContent}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="compass-outline" size={32} color="#D4AF37" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>User</Text>
              <Text style={styles.roleSubtitle}>Browse and book unique properties</Text>
            </View>
            {loading && selectedRole === 'customer' ? (
              <ActivityIndicator color="#D4AF37" size="small" />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            )}
          </View>
        </TouchableOpacity>

        {/* Host Card */}
        <TouchableOpacity
          style={[styles.roleCard, loading && selectedRole === 'owner' && styles.roleCardDisabled]}
          onPress={() => handleRoleSelection('owner')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.roleCardContent}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="home-outline" size={32} color="#D4AF37" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>Become a Host</Text>
              <Text style={styles.roleSubtitle}>List and manage your property</Text>
            </View>
            {loading && selectedRole === 'owner' ? (
              <ActivityIndicator color="#D4AF37" size="small" />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            )}
          </View>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#D4AF37',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  questionBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  questionMark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
  },
  roleCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 20,
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardDisabled: {
    opacity: 0.6,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
