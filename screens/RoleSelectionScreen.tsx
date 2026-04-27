import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ArrowLeft, User, Compass, Home, ChevronRight } from 'lucide-react-native';
import { useDialog } from '../components/CustomDialog';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../authContext';

export default function RoleSelectionScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'owner' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleBack = async () => {
    if (loading || loggingOut) return;

    showDialog({
      title: 'Sign out',
      message: 'Going back will sign you out.',
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
            } catch (error) {
              console.error('Error signing out:', error);
              setLoggingOut(false);
              showDialog({
                title: 'Sign out failed',
                message: 'Please try again.',
                type: 'error'
              });
            }
          },
        },
      ],
    });
  };

  const handleRoleSelection = async (role: 'customer' | 'owner') => {
    if (!user) {
      showDialog({
        title: 'Not signed in',
        message: 'Please sign in to continue.',
        type: 'error'
      });
      return;
    }

    setSelectedRole(role);
    setLoading(true);

    // switchRole: saves session + calls setUser immediately, Firestore write is background.
    // setUser must happen before navigation so GlobalDataContext reacts to role change.
    await switchRole(role);

    // Write displayName/photoURL to Firestore in background (role/roles handled by switchRole)
    const userDocRef = doc(db, 'users', user.uid);
    setDoc(userDocRef, {
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((e: any) => console.warn('Could not update profile in Firestore:', e.message));

    if (role === 'customer') {
      navigation.replace('UserHome');
    } else {
      navigation.replace('OwnerNavigator');
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
          <ArrowLeft size={24} color="#D4AF37" />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon with Question Mark */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <User size={40} color="#FFF" />
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
              <Compass size={32} color="#D4AF37" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>User</Text>
              <Text style={styles.roleSubtitle}>Browse and book unique properties</Text>
            </View>
            {loading && selectedRole === 'customer' ? (
              <ActivityIndicator color="#D4AF37" size="small" />
            ) : (
              <ChevronRight size={24} color="#666" />
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
              <Home size={32} color="#D4AF37" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>Become a Host</Text>
              <Text style={styles.roleSubtitle}>List and manage your property</Text>
            </View>
            {loading && selectedRole === 'owner' ? (
              <ActivityIndicator color="#D4AF37" size="small" />
            ) : (
              <ChevronRight size={24} color="#666" />
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
