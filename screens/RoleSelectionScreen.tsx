import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../authContext';
import { saveSession } from '../sessionManager';

export default function RoleSelectionScreen({ navigation }: any) {
  const { colors, typography, borderRadius } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'owner' | null>(null);

  const handleRoleSelection = async (role: 'customer' | 'owner') => {
    console.log('🎯 Button pressed! Selected role:', role);

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      console.log('❌ No user found');
      return;
    }

    console.log('✅ User found:', user.email);
    setSelectedRole(role);
    setLoading(true);

    try {
      console.log('📝 Starting role save process...');

      // Try to save to Firestore (may fail due to permissions)
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
        console.warn('⚠️ Could not save to Firestore (permissions):', firestoreError.message);
        console.log('💡 Continuing with local storage only');
      }

      // Update local session (this always works)
      await saveSession({
        ...user,
        role,
      });
      console.log('✅ Role saved to local storage');

      setLoading(false);
      console.log('🎉 Role selection complete!');

      // Navigate directly to the appropriate screen
      if (role === 'customer') {
        console.log('🚀 Navigating to UserHome');
        navigation.replace('UserHome');
      } else if (role === 'owner') {
        console.log('🚀 Navigating to OwnerNavigator');
        navigation.replace('OwnerNavigator');
      }
    } catch (error: any) {
      console.error('❌ Error setting role:', error);
      Alert.alert('Error', 'Failed to set role. Please try again.');
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Premium gradient background */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="account-question" size={70} color="white" />
          </View>
          <Text style={[styles.title, { fontFamily: typography.fontFamily.bold }]}>
            How do you want to use Reroute?
          </Text>
          <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.medium }]}>
            Choose your role to get started
          </Text>
        </View>

        {/* Customer Card */}
        <View style={styles.cardWrapper}>
          <BlurView
            intensity={20}
            tint="light"
            style={[styles.glassCard, { borderRadius: borderRadius.lg }]}
          >
            <TouchableOpacity
              style={styles.cardTouchable}
              onPress={() => handleRoleSelection('customer')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={[styles.cardIconContainer, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="compass" size={36} color="white" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { fontFamily: typography.fontFamily.semiBold }]}>
                    User
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { fontFamily: typography.fontFamily.regular }]}
                  >
                    Browse and book farmhouses for your next getaway
                  </Text>
                </View>
                {loading && selectedRole === 'customer' ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={28} color="white" />
                )}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Owner Card */}
        <View style={styles.cardWrapper}>
          <BlurView
            intensity={20}
            tint="light"
            style={[styles.glassCard, { borderRadius: borderRadius.lg }]}
          >
            <TouchableOpacity
              style={styles.cardTouchable}
              onPress={() => handleRoleSelection('owner')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={[styles.cardIconContainer, { backgroundColor: colors.secondary }]}>
                  <MaterialCommunityIcons name="home-city" size={36} color="white" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { fontFamily: typography.fontFamily.semiBold }]}>
                    Farmhouse Owner
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { fontFamily: typography.fontFamily.regular }]}
                  >
                    List and manage your farmhouse properties
                  </Text>
                </View>
                {loading && selectedRole === 'owner' ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={28} color="white" />
                )}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4AF37',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
  },
  circle1: {
    width: 250,
    height: 250,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 180,
    height: 180,
    bottom: 60,
    left: -40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  cardTouchable: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    color: 'white',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
});
