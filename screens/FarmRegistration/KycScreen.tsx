import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { Upload, CheckSquare, Square } from 'lucide-react-native';
import { kycSchema } from '../../utils/validation';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { useDialog } from '../../components/CustomDialog';

type KycScreenProps = {
  navigation: NativeStackNavigationProp<any, any>;
};

const OWNER_TERMS = `FOR PROPERTY OWNERS (HOSTS)

1. Listing Accuracy
   • Owners must provide true and accurate details of the property.
   • Misleading information may lead to removal from the platform.

2. Pricing & Availability
   • Owners are responsible for updating pricing and availability regularly.
   • Confirmed bookings must not be altered or canceled unfairly.

3. Booking Commitment
   • All confirmed bookings must be honored.
   • Repeated cancellations may result in suspension from the platform.

4. Property Standards
   • Property must be clean, safe, and ready for guests.
   • Promised amenities must be provided.

5. Guest Handling
   • Owners can deny entry if:
     – Guest exceeds allowed capacity
     – Rules are violated
   • ID verification at check-in is mandatory.

6. Damages
   • Owners can claim damages directly from users with valid proof.
   • Reroute will not be responsible for recovering damages.

7. Payments & Commission
   • Reroute will charge a commission per booking.
   • Payouts will be processed after successful completion of stay as per payout cycle.

GENERAL TERMS

1. No Mediation Policy
   • Reroute acts only as a platform connecting users and property owners.
   • Reroute will NOT act as a mediator in any disputes between users and owners.

2. No Liability
   • Reroute shall not be held responsible for:
     – Property damages
     – Personal injuries
     – Theft, loss, or accidents
     – Any disputes between users and owners

3. User & Owner Responsibility
   • All responsibilities during the stay lie solely between the user and the owner.

4. Account Suspension
   • Reroute reserves the right to suspend or terminate accounts for violation of terms.

5. Modification of Terms
   • Terms may be updated anytime. Continued usage implies acceptance.`;

export default function KycScreen({ navigation }: KycScreenProps) {
  const { farm, setField } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
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
            <Text style={styles.sectionTitle}>Contact Person 1</Text>

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
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.person1.idProofFront ? 'ID Proof Front — uploaded' : 'Upload ID Proof Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.idProofFront'] && <Text style={styles.error}>{errors['person1.idProofFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person1', 'idProofBack'])}
            >
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.person1.idProofBack ? 'ID Proof Back — uploaded' : 'Upload ID Proof Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person1.idProofBack'] && <Text style={styles.error}>{errors['person1.idProofBack']}</Text>}
          </View>

          {/* Person 2 Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Person 2</Text>

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
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.person2.idProofFront ? 'ID Proof Front — uploaded' : 'Upload ID Proof Front*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.idProofFront'] && <Text style={styles.error}>{errors['person2.idProofFront']}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'person2', 'idProofBack'])}
            >
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.person2.idProofBack ? 'ID Proof Back — uploaded' : 'Upload ID Proof Back*'}
              </Text>
            </TouchableOpacity>
            {errors['person2.idProofBack'] && <Text style={styles.error}>{errors['person2.idProofBack']}</Text>}
          </View>

          {/* Company Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Details</Text>

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
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.companyPAN ? 'Company PAN — uploaded' : 'Upload Company PAN*'}
              </Text>
            </TouchableOpacity>
            {errors.companyPAN && <Text style={styles.error}>{errors.companyPAN}</Text>}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickDocument(['kyc', 'labourDoc'])}
            >
              <Upload size={20} color="#D4AF37" />
              <Text style={styles.uploadText}>
                {farm.kyc.labourDoc ? 'Labour License — uploaded' : 'Upload Labour License*'}
              </Text>
            </TouchableOpacity>
            {errors.labourDoc && <Text style={styles.error}>{errors.labourDoc}</Text>}
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <View style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 18 }}>
                ⚠️ Bank details cannot be changed after registration. Please ensure all details are correct before proceeding.
              </Text>
            </View>

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
                placeholder="e.g., SBIN0001234"
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

          {/* Terms & Conditions */}
          <View style={styles.termsContainer}>
            <TouchableOpacity style={styles.termsRow} onPress={toggleTerms} activeOpacity={0.7}>
              {farm.kyc.agreedToTerms
                ? <CheckSquare size={22} color="#4CAF50" />
                : <Square size={22} color="#9CA3AF" />
              }
              <Text style={styles.termsText}>I agree to the </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                <Text style={styles.termsLink}>Terms & Conditions</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {errors.agreedToTerms && <Text style={styles.error}>{errors.agreedToTerms}</Text>}
          </View>

          {/* Terms Modal */}
          <Modal visible={showTermsModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Terms & Conditions</Text>
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                  <Text style={styles.modalBody}>{OWNER_TERMS}</Text>
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => { setShowTermsModal(false); setField(['kyc', 'agreedToTerms'], true); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>I Accept & Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
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
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
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
    borderColor: '#D4AF37',
    borderRadius: 12,
    marginBottom: 12,
  },

  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  termsContainer: {
    marginTop: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 15,
    color: '#374151',
  },
  termsLink: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 420,
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  modalClose: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#D4AF37',
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
