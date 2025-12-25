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
import { useDialog } from '../../components/CustomDialog';

type KycScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

export default function KycScreen({ navigation }: KycScreenProps) {
  const { farm, setField } = useFarmRegistration();
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
    // Navigate to Registration Fee screen instead of direct submission
    navigation.navigate('RegistrationFee');
  }, [farm, isSubmitting, navigation]);

  const toggleTerms = () => {
    const current = farm.kyc.agreedToTerms;
    setField(['kyc', 'agreedToTerms'], !current);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
                onChangeText={(text) => updateField(['kyc', 'person1', 'name'], text.replace(/[^a-zA-Z\s]/g, ''))}
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
              <Text style={styles.label}>PAN Card*</Text>
              <TextInput
                value={farm.kyc.person1.panCard}
                onChangeText={(text) => updateField(['kyc', 'person1', 'panCard'], text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                style={styles.input}
                placeholder="ABCDE1234F"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={10}
              />
              {errors['person1.panCard'] && <Text style={styles.error}>{errors['person1.panCard']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID Proof Type*</Text>
              <View style={styles.idProofTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person1.idProofType === 'driving_license' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person1', 'idProofType'], 'driving_license')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person1.idProofType === 'driving_license' && styles.idProofTypeButtonTextActive
                  ]}>
                    Driving License
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person1.idProofType === 'passport' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person1', 'idProofType'], 'passport')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person1.idProofType === 'passport' && styles.idProofTypeButtonTextActive
                  ]}>
                    Passport
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person1.idProofType === 'voter_id' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person1', 'idProofType'], 'voter_id')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person1.idProofType === 'voter_id' && styles.idProofTypeButtonTextActive
                  ]}>
                    Voter ID
                  </Text>
                </TouchableOpacity>
              </View>
              {errors['person1.idProofType'] && <Text style={styles.error}>{errors['person1.idProofType']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID Proof Number*</Text>
              <TextInput
                value={farm.kyc.person1.idProofNumber}
                onChangeText={(text) => updateField(['kyc', 'person1', 'idProofNumber'], text.toUpperCase())}
                style={styles.input}
                placeholder="Enter ID proof number"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              {errors['person1.idProofNumber'] && <Text style={styles.error}>{errors['person1.idProofNumber']}</Text>}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person1', 'idProofFront'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person1.idProofFront ? 'ID Proof Front ✓' : 'Upload ID Proof Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.idProofFront'] && <Text style={styles.error}>{errors['person1.idProofFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person1', 'idProofBack'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person1.idProofBack ? 'ID Proof Back ✓' : 'Upload ID Proof Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.idProofBack'] && <Text style={styles.error}>{errors['person1.idProofBack']}</Text>}
          </View>

          {/* Person 2 Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Contact Person 2</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name*</Text>
              <TextInput
                value={farm.kyc.person2.name}
                onChangeText={(text) => updateField(['kyc', 'person2', 'name'], text.replace(/[^a-zA-Z\s]/g, ''))}
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
              <Text style={styles.label}>PAN Card*</Text>
              <TextInput
                value={farm.kyc.person2.panCard}
                onChangeText={(text) => updateField(['kyc', 'person2', 'panCard'], text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                style={styles.input}
                placeholder="ABCDE1234F"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={10}
              />
              {errors['person2.panCard'] && <Text style={styles.error}>{errors['person2.panCard']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID Proof Type*</Text>
              <View style={styles.idProofTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person2.idProofType === 'driving_license' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person2', 'idProofType'], 'driving_license')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person2.idProofType === 'driving_license' && styles.idProofTypeButtonTextActive
                  ]}>
                    Driving License
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person2.idProofType === 'passport' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person2', 'idProofType'], 'passport')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person2.idProofType === 'passport' && styles.idProofTypeButtonTextActive
                  ]}>
                    Passport
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.idProofTypeButton,
                    farm.kyc.person2.idProofType === 'voter_id' && styles.idProofTypeButtonActive
                  ]}
                  onPress={() => updateField(['kyc', 'person2', 'idProofType'], 'voter_id')}
                >
                  <Text style={[
                    styles.idProofTypeButtonText,
                    farm.kyc.person2.idProofType === 'voter_id' && styles.idProofTypeButtonTextActive
                  ]}>
                    Voter ID
                  </Text>
                </TouchableOpacity>
              </View>
              {errors['person2.idProofType'] && <Text style={styles.error}>{errors['person2.idProofType']}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID Proof Number*</Text>
              <TextInput
                value={farm.kyc.person2.idProofNumber}
                onChangeText={(text) => updateField(['kyc', 'person2', 'idProofNumber'], text.toUpperCase())}
                style={styles.input}
                placeholder="Enter ID proof number"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              {errors['person2.idProofNumber'] && <Text style={styles.error}>{errors['person2.idProofNumber']}</Text>}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person2', 'idProofFront'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person2.idProofFront ? 'ID Proof Front ✓' : 'Upload ID Proof Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.idProofFront'] && <Text style={styles.error}>{errors['person2.idProofFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person2', 'idProofBack'])}
            >
              <Text style={styles.uploadIcon}>⬆️</Text>
              <Text style={styles.uploadText}>
                {farm.kyc.person2.idProofBack ? 'ID Proof Back ✓' : 'Upload ID Proof Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.idProofBack'] && <Text style={styles.error}>{errors['person2.idProofBack']}</Text>}
          </View>

          {/* Company Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Company Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>PAN Number*</Text>
              <TextInput
                value={farm.kyc.panNumber}
                onChangeText={(text) => updateField(['kyc', 'panNumber'], text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                style={styles.input}
                placeholder="Alphanumeric (9-18 chars)"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={18}
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
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'accountHolderName'], text.replace(/[^a-zA-Z\s]/g, ''))}
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
                secureTextEntry
              />
              {errors['bankDetails.accountNumber'] && (
                <Text style={styles.error}>{errors['bankDetails.accountNumber']}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>IFSC Code*</Text>
              <TextInput
                value={farm.kyc.bankDetails.ifscCode}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'ifscCode'], text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                style={styles.input}
                placeholder="Alphanumeric (9-18 chars)"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={18}
              />
              {errors['bankDetails.ifscCode'] && (
                <Text style={styles.error}>{errors['bankDetails.ifscCode']}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Branch Name*</Text>
              <TextInput
                value={farm.kyc.bankDetails.branchName}
                onChangeText={(text) => updateField(['kyc', 'bankDetails', 'branchName'], text.replace(/[^a-zA-Z\s]/g, ''))}
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
            style={styles.primaryButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
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
    paddingBottom: 120, // Extra padding for bottom buttons
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
  idProofTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  idProofTypeButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idProofTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  idProofTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  idProofTypeButtonTextActive: {
    color: '#FFFFFF',
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
