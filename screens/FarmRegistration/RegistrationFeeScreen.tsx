import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
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
import { CreditCard, Square, CheckSquare } from 'lucide-react-native';
import { calculatePlatformFee, PAYMENT_CONFIG } from '../../config/constants';

type RegistrationFeeScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function RegistrationFeeScreen({ navigation }: RegistrationFeeScreenProps) {
  const { farm, resetFarm, clearDraft } = useFarmRegistration();
  const { showDialog } = useDialog();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const REGISTRATION_FEE = farm.propertyType === 'resort' ? 5000 : 2000;
  const platformFee = calculatePlatformFee(REGISTRATION_FEE);
  const totalDue = REGISTRATION_FEE + platformFee;

  const handlePayment = async () => {
    if (!agreedToTerms) {
      showDialog({
        title: 'Terms Required',
        message: 'Please read and accept the Terms & Conditions before proceeding with payment.',
        type: 'warning',
      });
      return;
    }

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
      await completePaymentFlow(
        totalDue,
        'INR',
        'registration-' + Date.now(),
        user.uid,
        user.displayName || farm.kyc.person1.name || 'Farmhouse Owner',
        user.email || '',
        farm.contactPhone1 || '',
        'Farmhouse Registration Fee'
      );

      await saveFarmRegistration(farm);
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <CreditCard size={32} color="#C5A565" />
          </View>

          <Text style={styles.title}>Registration Fee</Text>
          <Text style={styles.subtitle}>
            One-time fee to list your {farm.propertyType === 'resort' ? 'resort' : 'farmhouse'} on our platform
          </Text>

          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Registration Fee</Text>
            <Text style={styles.feeAmount}>₹{totalDue.toLocaleString('en-IN')}</Text>
            <Text style={styles.feeNote}>One-time payment · Non-refundable</Text>
            <View style={styles.feeBreakdown}>
              <View style={styles.feeBreakdownRow}>
                <Text style={styles.feeBreakdownLabel}>Registration Fee</Text>
                <Text style={styles.feeBreakdownValue}>₹{REGISTRATION_FEE.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.feeBreakdownRow}>
                <Text style={styles.feeBreakdownLabel}>
                  Platform Fee ({(PAYMENT_CONFIG.PLATFORM_FEE_PERCENTAGE * 100).toFixed(0)}%)
                </Text>
                <Text style={styles.feeBreakdownValue}>₹{platformFee.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* T&C Checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms((v) => !v)}
            activeOpacity={0.7}
          >
            {agreedToTerms
              ? <CheckSquare size={20} color="#C5A565" />
              : <Square size={20} color="#9CA3AF" />
            }
            <Text style={styles.termsText}>
              I have read and agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://rustique.in/terms')}
              >
                Terms &amp; Conditions
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://rustique.in/refund-policy')}
              >
                Refund Policy
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!agreedToTerms || isProcessing) && styles.buttonDisabled,
            ]}
            onPress={handlePayment}
            activeOpacity={0.8}
            disabled={!agreedToTerms || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Pay ₹{totalDue.toLocaleString('en-IN')}</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FDF8EE',
    borderWidth: 1.5,
    borderColor: '#C5A565',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  feeCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#C5A565',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  feeAmount: {
    fontSize: 44,
    fontWeight: '700',
    color: '#C5A565',
    marginBottom: 4,
  },
  feeNote: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  feeBreakdown: {
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  feeBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeBreakdownLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  feeBreakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  termsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#C5A565',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#C5A565',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#C5A565',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
    elevation: 0,
    shadowOpacity: 0,
  },
});
