import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { saveFarmRegistration } from '../../services/farmService';
import { useDialog } from '../../components/CustomDialog';

type RegistrationFeeScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function RegistrationFeeScreen({ navigation }: RegistrationFeeScreenProps) {
  const { farm, resetFarm } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [isProcessing, setIsProcessing] = useState(false);

  const REGISTRATION_FEE = 5000; // Placeholder amount - can be changed

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing delay
    setTimeout(async () => {
      try {
        // Show payment success
        showDialog({
          title: 'Payment Successful',
          message: `Registration fee of ₹${REGISTRATION_FEE} paid successfully!`,
          type: 'success',
        });

        // Now submit the farm registration
        console.log('RegistrationFeeScreen: About to call saveFarmRegistration');
        const result = await saveFarmRegistration(farm);
        console.log('RegistrationFeeScreen: Registration successful!', result);

        showDialog({
          title: 'Success',
          message: 'Farm registration submitted for review!',
          type: 'success',
        });

        resetFarm();
        navigation.reset({ index: 0, routes: [{ name: 'MyFarmhouses' }] });
      } catch (error) {
        console.error('RegistrationFeeScreen: Submission error:', error);
        showDialog({
          title: 'Error',
          message: `Failed to submit registration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    }, 2000); // 2 second delay to simulate payment processing
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💳</Text>
          </View>

          <Text style={styles.title}>Registration Fee</Text>
          <Text style={styles.subtitle}>
            One-time registration fee to list your farmhouse on our platform
          </Text>

          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Registration Fee</Text>
            <Text style={styles.feeAmount}>₹{REGISTRATION_FEE}</Text>
            <Text style={styles.feeNote}>One-time payment</Text>
          </View>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>What you get:</Text>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Premium listing on platform</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Verified farmhouse badge</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Access to booking management</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>24/7 customer support</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
            onPress={handlePayment}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Pay Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  feeCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  feeLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  feeAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  feeNote: {
    fontSize: 14,
    color: '#6B7280',
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 15,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
