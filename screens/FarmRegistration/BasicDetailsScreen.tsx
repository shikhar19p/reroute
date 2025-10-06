import React, { useMemo, useState } from 'react';
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

type RootStackParamList = {
  FarmPrices: undefined;
};

type BasicDetailsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const fieldConfigs = [
  { key: 'name', label: 'Farmhouse Name*', placeholder: 'Enter farmhouse name', keyboardType: 'default' as const },
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
  const { farm, setField } = useFarmRegistration();
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleChange = (key: string, value: string) => {
    setField(key, value);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {fieldConfigs.map(({ key, label, placeholder, keyboardType }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={(farm as any)[key] ?? ''}
                onChangeText={(text) => handleChange(key, text)}
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
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
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
});
