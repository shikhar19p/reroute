import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  Platform,
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

type RegistrationFeeScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

const BRAND_COLOR = '#D4AF37';

export default function RegistrationFeeScreen({ navigation }: RegistrationFeeScreenProps) {
  const { farm, resetFarm, clearDraft } = useFarmRegistration();
  const { showDialog } = useDialog();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const REGISTRATION_FEE = 5000;

  const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `reg-${timestamp}-${random}`;
  };

  const handlePayment = async () => {
    if (!user) {
      showDialog({
        title: 'Error',
        message: 'Please login to continue with payment',
        type: 'error',
      });
      return;
    }

    if (Platform.OS === 'web') {
      showDialog({
        title: 'Not Available',
        message: 'Payments are only available on the mobile app. Please use the Android or iOS app to complete registration.',
        type: 'warning',
      });
      return;
    }

    setIsProcessing(true);

    try {
      await completePaymentFlow(
        REGISTRATION_FEE,
        'INR',
        generateUniqueId(),
        user.uid,
        user.displayName || farm.kyc.person1.name || 'Farmhouse Owner',
        user.email || '',
        farm.contactPhone1 || '',
        'Farmhouse Registration Fee',
        true
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          {[
            'Premium listing on platform',
            'Verified farmhouse badge',
            'Access to booking management',
            '24/7 customer support',
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

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
            <Text style={styles.primaryButtonText}>Pay ₹{REGISTRATION_FEE}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  feeCard: {
    width: '100%',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  feeAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginBottom: 4,
  },
  feeNote: {
    fontSize: 13,
    color: '#9CA3AF',
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
    marginBottom: 14,
  },
  benefitIcon: {
    fontSize: 16,
    color: BRAND_COLOR,
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
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
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
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: BRAND_COLOR,
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
