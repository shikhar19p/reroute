import React, { useCallback, useMemo, useState } from 'react';
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
import { pricesSchema } from '../../utils/validation';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { useDialog } from '../../components/CustomDialog';

type RootStackParamList = {
  FarmPhotos: undefined;
};

type PricesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const priceFields = [
  { key: 'weeklyDay', label: 'Day Price*', placeholder: '₹ Enter weekday day price', section: 'Weekday Rates' },
  { key: 'weeklyNight', label: 'Night Price*', placeholder: '₹ Enter weekday night price', section: 'Weekday Rates' },
  { key: 'weekendDay', label: 'Day Price*', placeholder: '₹ Enter weekend day price', section: 'Weekend Rates' },
  { key: 'weekendNight', label: 'Night Price*', placeholder: '₹ Enter weekend night price', section: 'Weekend Rates' },
];

export default function PricesScreen({ navigation }: PricesScreenProps) {
  const { farm, setField } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formValues = useMemo(() => farm.pricing, [farm.pricing]);

  const updateField = (key: string, value: string) => {
    setField(['pricing', key], value);
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const addCustomPrice = useCallback(() => {
    const newCustomPrice = { name: '', price: '' };
    const currentCustom = farm.pricing.customPricing || [];
    setField(['pricing', 'customPricing'], [...currentCustom, newCustomPrice]);
  }, [farm.pricing.customPricing, setField]);

  const updateCustomPrice = useCallback((index: number, field: string, value: string) => {
    const currentCustom = [...(farm.pricing.customPricing || [])];
    currentCustom[index] = { ...currentCustom[index], [field]: value };
    setField(['pricing', 'customPricing'], currentCustom);
  }, [farm.pricing.customPricing, setField]);

  const removeCustomPrice = useCallback((index: number) => {
    const currentCustom = farm.pricing.customPricing || [];
    setField(['pricing', 'customPricing'], currentCustom.filter((_, i) => i !== index));
  }, [farm.pricing.customPricing, setField]);

  const showHighPriceConfirm = () =>
    new Promise<boolean>((resolve) => {
      showDialog({
        title: 'High Price Detected',
        message: 'One or more prices exceed ₹50,000. Please confirm this is correct.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirm', style: 'default', onPress: () => resolve(true) },
        ]
      });
    });

  const handleSubmit = async () => {
    const result = pricesSchema.safeParse(formValues);

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

    const values = result.data;
    const hasHighPrice = Object.entries(values).some(([key, value]) => {
      if (key !== 'customPricing' && typeof value === 'string') {
        return Number(value) > 50000;
      }
      return false;
    });

    if (hasHighPrice) {
      const confirmed = await showHighPriceConfirm();
      if (!confirmed) {
        return;
      }
    }

    setErrors({});
    navigation.navigate('FarmPhotos');
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {priceFields.map(({ key, label, placeholder, section }, index) => (
            <View key={key}>
              {(index === 0 || priceFields[index - 1].section !== section) && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>💰</Text>
                  <Text style={styles.sectionTitle}>{section}</Text>
                </View>
              )}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  value={(farm.pricing as any)[key] ?? ''}
                  onChangeText={(text) => updateField(key, text.replace(/[^0-9]/g, ''))}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, errors[key] && styles.inputError]}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
                {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
              </View>
            </View>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>➕</Text>
            <Text style={styles.sectionTitle}>Custom Pricing (Optional)</Text>
          </View>
          <Text style={styles.helperText}>Add special pricing for holidays or special events</Text>

          {(farm.pricing.customPricing || []).map((item, index) => (
            <View key={index} style={styles.customPriceRow}>
              <View style={styles.customPriceInputs}>
                <TextInput
                  value={item.name}
                  onChangeText={(text) => updateCustomPrice(index, 'name', text)}
                  placeholder="Event name (e.g., Diwali, New Year)"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.customNameInput]}
                />
                <TextInput
                  value={item.price}
                  onChangeText={(text) => updateCustomPrice(index, 'price', text.replace(/[^0-9]/g, ''))}
                  placeholder="₹ Price"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.customPriceInput]}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                onPress={() => removeCustomPrice(index)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addCustomPrice} style={styles.addButton} activeOpacity={0.7}>
            <Text style={styles.addButtonText}>+ Add Custom Pricing</Text>
          </TouchableOpacity>
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
            <Text style={styles.primaryButtonText}>Next: Photos</Text>
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
    paddingBottom: 120, // Extra padding for bottom buttons
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  fieldContainer: {
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
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  customPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  customPriceInputs: {
    flex: 1,
    gap: 12,
  },
  customNameInput: {
    flex: 1,
  },
  customPriceInput: {
    flex: 1,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#4CAF50',
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
    backgroundColor: '#FFFFFF',
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
});
