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
import { useAuth } from '../../authContext';
import {
  completePaymentFlow,
} from '../../services/paymentService';
import { parseError } from '../../utils/errorHandler';
import { CreditCard, Check } from 'lucide-react-native';

type RegistrationFeeScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function RegistrationFeeScreen({ navigation }: RegistrationFeeScreenProps) {
  const { farm, resetFarm, clearDraft } = useFarmRegistration();
  const { showDialog } = useDialog();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const REGISTRATION_FEE = farm.propertyType === 'resort' ? 5000 : 2000;

  const handlePayment = async () => {
    if (!user) {
      showDialog({
        title: 'Error',
        message: 'Please login to continue with payment',
        type: 'error',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Complete Razorpay payment flow (skip server verification for registration)
      await completePaymentFlow(
        REGISTRATION_FEE, // Amount in rupees - completePaymentFlow handles conversion to paise
        'INR',
        'registration-' + Date.now(), // Unique registration ID
        user.uid,
        user.displayName || farm.kyc.person1.name || 'Farmhouse Owner',
        user.email || '',
        farm.contactPhone1 || '',
        'Farmhouse Registration Fee',
        true // Skip server-side verification for registration payments
      );

      const result = await saveFarmRegistration(farm);

      // Clear draft after successful registration
      await clearDraft();

      showDialog({
        title: 'Success!',
        message: 'Payment successful! Your farmhouse has been submitted for review. You will be notified once verified.',
        type: 'success',
        buttons: [{
          text: 'OK',
          onPress: () => {
            resetFarm();
            navigation.reset({ index: 0, routes: [{ name: 'MyFarmhouses' }] });
          }
        }]
      });
    } catch (error: any) {
      console.error('Payment/Registration error:', error);

      // Parse error into user-friendly message
      const { title, message, isCancellation } = parseError(error);

      showDialog({
        title: isCancellation ? 'Payment Cancelled' : title,
        message: isCancellation
          ? 'You cancelled the payment. Please try again when you are ready to complete registration.'
          : message,
        type: isCancellation ? 'warning' : 'error',
        buttons: [{
          text: isCancellation ? 'OK' : 'Try Again',
          style: 'default',
          onPress: () => {}
        }]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CreditCard size={36} color="#C5A565" />
          </View>

          <Text style={styles.title}>Registration Fee</Text>
          <Text style={styles.subtitle}>
            One-time registration fee to list your {farm.propertyType === 'resort' ? 'resort' : 'farmhouse'} on our platform
          </Text>

          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Registration Fee</Text>
            <Text style={styles.feeAmount}>₹{REGISTRATION_FEE}</Text>
            <Text style={styles.feeNote}>One-time payment</Text>
          </View>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>What you get:</Text>
            <View style={styles.benefitItem}>
              <Check size={14} color="#16A34A" />
              <Text style={styles.benefitText}>Premium listing on platform</Text>
            </View>
            <View style={styles.benefitItem}>
              <Check size={14} color="#16A34A" />
              <Text style={styles.benefitText}>Verified farmhouse badge</Text>
            </View>
            <View style={styles.benefitItem}>
              <Check size={14} color="#16A34A" />
              <Text style={styles.benefitText}>Access to booking management</Text>
            </View>
            <View style={styles.benefitItem}>
              <Check size={14} color="#16A34A" />
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
