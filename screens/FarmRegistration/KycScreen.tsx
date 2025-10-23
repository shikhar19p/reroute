import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { kycSchema } from '../../utils/validation';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { saveFarmRegistration } from '../../services/farmService';
import { useDialog } from '../../components/CustomDialog';

type KycScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function KycScreen({ navigation }: KycScreenProps) {
  const { farm, setField, resetFarm } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(
    (path: string[], value: any) => {
      setField(path, value);
      const key = path.join('.');
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors, setField]
  );

  const pickDocument = useCallback(
    async (fieldPath: string[]) => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const fileData = {
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || 'application/octet-stream',
            size: asset.size || 0,
          };
          updateField(fieldPath, fileData);
        }
      } catch (error) {
        showDialog({
          title: 'Error',
          message: 'Failed to pick document',
          type: 'error'
        });
      }
    },
    [updateField, showDialog]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const result = kycSchema.safeParse(farm.kyc);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((issue) => {
        const key = issue.path.join('.');
        newErrors[key] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      console.log('KycScreen: About to call saveFarmRegistration');
      const result = await saveFarmRegistration(farm);
      console.log('KycScreen: Registration successful!', result);
      showDialog({
        title: 'Success',
        message: 'Farm registration submitted for review!',
        type: 'success'
      });
      resetFarm();
      navigation.reset({ index: 0, routes: [{ name: 'MyFarmhouses' }] });
    } catch (error) {
      console.error('KycScreen: Submission error:', error);
      console.error('KycScreen: Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      showDialog({
        title: 'Error',
        message: `Failed to submit registration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [farm, isSubmitting, navigation, resetFarm, showDialog]);

  const toggleTerms = () => {
    const current = farm.kyc.agreedToTerms;
    setField(['kyc', 'agreedToTerms'], !current);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.mainTitle}>KYC Verification</Text>
          <Text style={styles.subtitle}>Complete KYC to verify your farmhouse</Text>

          {/* Person 1 Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Contact Person 1</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name*</Text>
              <TextInput
                value={farm.kyc.person1.name}
                onChangeText={(text) => updateField(['kyc', 'person1', 'name'], text)}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
              />
              {errors['person1.name'] && <Text style={styles.error}>{errors['person1.name']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone*</Text>
              <TextInput
                value={farm.kyc.person1.phone}
                onChangeText={(text) => updateField(['kyc', 'person1', 'phone'], text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholder="10-digit phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {errors['person1.phone'] && <Text style={styles.error}>{errors['person1.phone']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Aadhaar Number*</Text>
              <TextInput
                value={farm.kyc.person1.aadhaarNumber}
                onChangeText={(text) => updateField(['kyc', 'person1', 'aadhaarNumber'], text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholder="12-digit Aadhaar number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={12}
              />
              {errors['person1.aadhaarNumber'] && <Text style={styles.error}>{errors['person1.aadhaarNumber']}</Text>}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person1', 'aadhaarFront'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person1.aadhaarFront ? 'Aadhaar Front ✓' : 'Upload Aadhaar Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.aadhaarFront'] && <Text style={styles.error}>{errors['person1.aadhaarFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person1', 'aadhaarBack'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person1.aadhaarBack ? 'Aadhaar Back ✓' : 'Upload Aadhaar Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.aadhaarBack'] && <Text style={styles.error}>{errors['person1.aadhaarBack']}</Text>}
          </View>

          {/* Person 2 Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Contact Person 2</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name*</Text>
              <TextInput
                value={farm.kyc.person2.name}
                onChangeText={(text) => updateField(['kyc', 'person2', 'name'], text)}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
              />
              {errors['person2.name'] && <Text style={styles.error}>{errors['person2.name']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone*</Text>
              <TextInput
                value={farm.kyc.person2.phone}
                onChangeText={(text) => updateField(['kyc', 'person2', 'phone'], text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholder="10-digit phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {errors['person2.phone'] && <Text style={styles.error}>{errors['person2.phone']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Aadhaar Number*</Text>
              <TextInput
                value={farm.kyc.person2.aadhaarNumber}
                onChangeText={(text) => updateField(['kyc', 'person2', 'aadhaarNumber'], text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholder="12-digit Aadhaar number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={12}
              />
              {errors['person2.aadhaarNumber'] && <Text style={styles.error}>{errors['person2.aadhaarNumber']}</Text>}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person2', 'aadhaarFront'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person2.aadhaarFront ? 'Aadhaar Front ✓' : 'Upload Aadhaar Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.aadhaarFront'] && <Text style={styles.error}>{errors['person2.aadhaarFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person2', 'aadhaarBack'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person2.aadhaarBack ? 'Aadhaar Back ✓' : 'Upload Aadhaar Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.aadhaarBack'] && <Text style={styles.error}>{errors['person2.aadhaarBack']}</Text>}
          </View>

          {/* Company Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Company Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>PAN Number*</Text>
              <TextInput
                value={farm.kyc.panNumber}
                onChangeText={(text) => updateField(['kyc', 'panNumber'], text.toUpperCase())}
                style={styles.input}
                placeholder="ABCDE1234F"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={10}
              />
              {errors.panNumber && <Text style={styles.error}>{errors.panNumber}</Text>}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'companyPAN'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.companyPAN ? 'Company PAN ✓' : 'Upload Company PAN*'}
              </Text>
            </TouchableOpacity>
            {errors.companyPAN && <Text style={styles.error}>{errors.companyPAN}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'labourDoc'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.labourDoc ? 'Labour License ✓' : 'Upload Labour License*'}
              </Text>
            </TouchableOpacity>
            {errors.labourDoc && <Text style={styles.error}>{errors.labourDoc}</Text>}
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏦 Bank Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Account Holder Name*</Text>
              <TextInput
                value={farm.kyc.bankDetails.accountHolderName}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'accountHolderName'], text)}
                style={styles.input}
                placeholder="As per bank records"
                placeholderTextColor="#9CA3AF"
              />
              {errors['bankDetails.accountHolderName'] && (
                <Text style={styles.error}>{errors['bankDetails.accountHolderName']}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Number*</Text>
              <TextInput
                value={farm.kyc.bankDetails.accountNumber}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'accountNumber'], text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                placeholder="9-18 digits"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={18}
              />
              {errors['bankDetails.accountNumber'] && (
                <Text style={styles.error}>{errors['bankDetails.accountNumber']}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>IFSC Code*</Text>
              <TextInput
                value={farm.kyc.bankDetails.ifscCode}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'ifscCode'], text.toUpperCase())}
                style={styles.input}
                placeholder="ABCD0123456"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={11}
              />
              {errors['bankDetails.ifscCode'] && (
                <Text style={styles.error}>{errors['bankDetails.ifscCode']}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Branch Name*</Text>
              <TextInput
                value={farm.kyc.bankDetails.branchName}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'branchName'], text)}
                style={styles.input}
                placeholder="Branch name"
                placeholderTextColor="#9CA3AF"
              />
              {errors['bankDetails.branchName'] && (
                <Text style={styles.error}>{errors['bankDetails.branchName']}</Text>
              )}
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={toggleTerms} activeOpacity={0.7}>
            <Text style={styles.checkboxIcon}>
              {farm.kyc.agreedToTerms ? '✅' : '⬜'}
            </Text>
            <Text style={styles.termsText}>I agree to terms and conditions*</Text>
          </TouchableOpacity>
          {errors.agreedToTerms && <Text style={styles.error}>{errors.agreedToTerms}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    marginTop: 4,
    fontSize: 13,
    color: '#EF4444',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 12,
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 20,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkboxIcon: {
    fontSize: 24,
  },
  termsText: {
    fontSize: 16,
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
