import React, { useMemo, useState, useEffect } from 'react';
import {
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
import { basicSchema } from '../../utils/validation';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { useDialog } from '../../components/CustomDialog';

type RootStackParamList = {
  FarmPrices: undefined;
};

type BasicDetailsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const fieldConfigs = [
  { key: 'name', label: 'Property Name*', placeholder: 'Enter property name', keyboardType: 'default' as const },
  { key: 'contactPhone1', label: 'Primary Phone*', placeholder: '10-digit phone number', keyboardType: 'phone-pad' as const },
  { key: 'contactPhone2', label: 'Alternate Phone', placeholder: '10-digit phone number', keyboardType: 'phone-pad' as const },
  { key: 'city', label: 'City*', placeholder: 'Enter city', keyboardType: 'default' as const },
  { key: 'area', label: 'Area / Locality', placeholder: 'Enter area or locality', keyboardType: 'default' as const },
  { key: 'locationText', label: 'Address / Landmark', placeholder: 'Enter address or landmark', keyboardType: 'default' as const },
  { key: 'mapLink', label: 'Google Maps Link', placeholder: 'Paste Google Maps URL', keyboardType: 'url' as const },
  { key: 'bedrooms', label: 'Number of Bedrooms*', placeholder: 'e.g., 5', keyboardType: 'numeric' as const },
  { key: 'capacity', label: 'Guest Capacity*', placeholder: 'e.g., 25', keyboardType: 'numeric' as const },
];

export default function BasicDetailsScreen({ navigation }: BasicDetailsScreenProps) {
  const { farm, setField, hasDraft, loadDraft, clearDraft, resetFarm, saveDraft } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftChecked, setDraftChecked] = useState(false);

  // Intercept back navigation to offer save/discard draft
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      const hasData = farm.name || farm.contactPhone1 || farm.city || farm.area || farm.photos.length > 0;
      if (!hasData) return;

      e.preventDefault();
      showDialog({
        title: 'Exit Registration?',
        message: 'Would you like to save your progress as a draft?',
        type: 'confirm',
        buttons: [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await clearDraft();
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: 'Save Draft',
            style: 'default',
            onPress: async () => {
              await saveDraft();
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: 'Stay',
            style: 'cancel',
          },
        ],
      });
    });
    return unsubscribe;
  }, [navigation, farm, showDialog, clearDraft, saveDraft]);

  // Check for saved draft on mount
  useEffect(() => {
    if (hasDraft && !draftChecked) {
      setDraftChecked(true);
      showDialog({
        title: 'Resume Draft?',
        message: 'You have a saved draft of your farmhouse registration. Would you like to continue where you left off?',
        type: 'info',
        buttons: [
          {
            text: 'Start Fresh',
            style: 'cancel',
            onPress: async () => {
              await resetFarm();
            }
          },
          {
            text: 'Resume Draft',
            style: 'default',
            onPress: async () => {
              await loadDraft();
            }
          }
        ]
      });
    }
  }, [hasDraft, draftChecked, showDialog, loadDraft, clearDraft]);

  const formValues = useMemo(
    () => ({
      name: farm.name,
      contactPhone1: farm.contactPhone1,
      contactPhone2: farm.contactPhone2,
      city: farm.city,
      area: farm.area,
      locationText: farm.locationText,
      mapLink: farm.mapLink,
      bedrooms: farm.bedrooms,
      capacity: farm.capacity,
      description: farm.description,
    }),
    [farm]
  );

  const handleChange = (key: string, value: string, keyboardType?: string) => {
    let processedValue = value;

    // Strip non-numeric characters for phone and numeric inputs
    if (keyboardType === 'phone-pad' || keyboardType === 'numeric') {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    setField(key, processedValue);
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    setField('description', value);
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  const handleSubmit = () => {
    const result = basicSchema.safeParse(formValues);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});
    navigation.navigate('FarmPrices');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Type Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Property Type*</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeOption, farm.propertyType === 'farmhouse' && styles.typeOptionSelected]}
                onPress={() => setField('propertyType', 'farmhouse')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeOptionText, farm.propertyType === 'farmhouse' && styles.typeOptionTextSelected]}>
                  Farmhouse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, farm.propertyType === 'resort' && styles.typeOptionSelected]}
                onPress={() => setField('propertyType', 'resort')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeOptionText, farm.propertyType === 'resort' && styles.typeOptionTextSelected]}>
                  Resort
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.typeNote}>
              Registration fee: {farm.propertyType === 'resort' ? '₹5,000' : '₹2,000'} (one-time)
            </Text>
          </View>

          {fieldConfigs.map(({ key, label, placeholder, keyboardType }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={(farm as any)[key] ?? ''}
                onChangeText={(text) => handleChange(key, text, keyboardType)}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                style={[styles.input, errors[key] && styles.inputError]}
                keyboardType={keyboardType}
                autoCapitalize="none"
              />
              {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
            </View>
          ))}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={farm.description ?? ''}
              onChangeText={handleDescriptionChange}
              placeholder="Describe your farmhouse, amenities, and unique features..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multilineInput, errors.description && styles.inputError]}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Next: Pricing</Text>
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
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
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
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
    fontSize: 17,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  typeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeOptionTextSelected: {
    color: '#4CAF50',
  },
  typeNote: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
});
