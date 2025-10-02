import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAdmin } from '../../context/AdminContext';

type RouteParams = {
  id: string;
};

type EditFarmScreenProps = NativeStackScreenProps<any, any>;

const fieldsConfig = [
  { key: 'name', label: 'Farm Name' },
  { key: 'contactPhone1', label: 'Primary Phone', keyboardType: 'phone-pad' as const },
  { key: 'contactPhone2', label: 'Alternate Phone', keyboardType: 'phone-pad' as const },
  { key: 'locationText', label: 'Address / Landmark' },
  { key: 'mapLink', label: 'Google Maps Link' },
  { key: 'capacity', label: 'Capacity', keyboardType: 'numeric' as const },
  { key: 'priceWeekly', label: 'Weekly Price', keyboardType: 'numeric' as const },
  { key: 'priceOccasional', label: 'Occasional Price', keyboardType: 'numeric' as const },
  { key: 'priceWeekend', label: 'Weekend Price', keyboardType: 'numeric' as const },
];

export default function EditFarmScreen({ navigation, route }: EditFarmScreenProps) {
  const { id } = route.params as RouteParams;
  const { getFarmById, updateFarm } = useAdmin();

  const farm = getFarmById(id);

  const [formState, setFormState] = useState({
    name: '',
    contactPhone1: '',
    contactPhone2: '',
    locationText: '',
    mapLink: '',
    capacity: '',
    priceWeekly: '',
    priceOccasional: '',
    priceWeekend: '',
    blockedDates: '',
    description: '',
  });

  useEffect(() => {
    if (farm) {
      setFormState({
        name: farm.name || '',
        contactPhone1: farm.contactPhone1 || '',
        contactPhone2: farm.contactPhone2 || '',
        locationText: farm.locationText || '',
        mapLink: farm.mapLink || '',
        capacity: farm.capacity || '',
        priceWeekly: farm.priceWeekly || '',
        priceOccasional: farm.priceOccasional || '',
        priceWeekend: farm.priceWeekend || '',
        blockedDates: Array.isArray(farm.blockedDates) ? farm.blockedDates.join(', ') : '',
        description: farm.description || '',
      });
    }
  }, [farm]);

  const handleChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!farm) {
      Alert.alert('Error', 'Farm not found.');
      return;
    }

    const blockedDatesArray = formState.blockedDates
      ? formState.blockedDates
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    updateFarm(id, {
      name: formState.name,
      contactPhone1: formState.contactPhone1,
      contactPhone2: formState.contactPhone2,
      locationText: formState.locationText,
      mapLink: formState.mapLink,
      capacity: formState.capacity,
      priceWeekly: formState.priceWeekly,
      priceOccasional: formState.priceOccasional,
      priceWeekend: formState.priceWeekend,
      blockedDates: blockedDatesArray,
      description: formState.description,
    });

    Alert.alert('Success', 'Farm details updated successfully!');
    navigation.goBack();
  };

  if (!farm) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingContainer}>
          <Text style={styles.missingText}>Farm not found</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Edit Farm Details</Text>

          {fieldsConfig.map(({ key, label, keyboardType }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={(formState as any)[key]}
                onChangeText={(text) => handleChange(key, text)}
                placeholder={label}
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType={keyboardType || 'default'}
                autoCapitalize="none"
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Blocked Dates (comma-separated)</Text>
            <TextInput
              value={formState.blockedDates}
              onChangeText={(text) => handleChange('blockedDates', text)}
              placeholder="2024-10-01, 2024-10-15"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={formState.description}
              onChangeText={(text) => handleChange('description', text)}
              placeholder="Describe your farmhouse..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Save Changes</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  field: {
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
  multilineInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
  missingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  missingText: {
    fontSize: 18,
    color: '#6B7280',
  },
});
