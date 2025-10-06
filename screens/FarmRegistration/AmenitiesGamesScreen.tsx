import React, { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';

type RootStackParamList = {
  FarmRulesRestrictions: undefined;
};

type AmenitiesGamesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const amenitiesList = [
  { key: 'tv', label: 'TV', type: 'counter' as const },
  { key: 'geyser', label: 'Geyser', type: 'counter' as const },
  { key: 'bonfire', label: 'Bonfire', type: 'counter' as const },
  { key: 'pool', label: 'Swimming Pool', type: 'toggle' as const },
  { key: 'chess', label: 'Chess', type: 'counter' as const },
  { key: 'carroms', label: 'Carroms', type: 'counter' as const },
  { key: 'volleyball', label: 'Volleyball', type: 'counter' as const },
];

export default function AmenitiesGamesScreen({ navigation }: AmenitiesGamesScreenProps) {
  const { farm, incAmenity, decAmenity, setField } = useFarmRegistration();

  const handleToggle = useCallback(
    (path: string[], value: boolean) => {
      setField(path, value);
    },
    [setField]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Text style={styles.mainTitle}>Amenities & Rules</Text>
        <Text style={styles.subtitle}>Configure amenities, games, and property rules</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Amenities & Games</Text>

          {amenitiesList.map((item) => (
            <View key={item.key} style={styles.amenityRow}>
              <Text style={styles.amenityLabel}>{item.label}</Text>

              {item.type === 'toggle' ? (
                <Switch
                  value={(farm.amenities as any)[item.key]}
                  onValueChange={(value) => setField(['amenities', item.key], value)}
                  trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
                  thumbColor="#FFFFFF"
                />
              ) : (
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    onPress={() => decAmenity(item.key)}
                    style={styles.counterButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chevronDown}>⬇️</Text>
                  </TouchableOpacity>

                  <Text style={styles.counterValue}>
                    {(farm.amenities as any)[item.key] ?? 0}
                  </Text>

                  <TouchableOpacity
                    onPress={() => incAmenity(item.key)}
                    style={[styles.counterButton, styles.counterButtonActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chevronUp}>⬆️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Additional Amenities (Optional)</Text>
            <TextInput
              value={farm.amenities.customAmenities ?? ''}
              onChangeText={(text) => setField(['amenities', 'customAmenities'], text)}
              placeholder="e.g., BBQ grill, Outdoor seating, Gazebo..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Rules & Restrictions</Text>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Unmarried couples not allowed</Text>
            <Switch
              value={farm.rules.unmarriedNotAllowed}
              onValueChange={(value) => handleToggle(['rules', 'unmarriedNotAllowed'], value)}
              trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Pets not allowed</Text>
            <Switch
              value={farm.rules.petsNotAllowed}
              onValueChange={(value) => handleToggle(['rules', 'petsNotAllowed'], value)}
              trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Quiet Hours (Optional)</Text>
            <TextInput
              value={farm.rules.quietHours ?? ''}
              onChangeText={(text) => setField(['rules', 'quietHours'], text)}
              placeholder="e.g., 10 PM - 6 AM"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Additional Rules (Optional)</Text>
            <TextInput
              value={farm.rules.customRules ?? ''}
              onChangeText={(text) => setField(['rules', 'customRules'], text)}
              placeholder="Add any other rules or restrictions..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
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
          onPress={() => navigation.navigate('FarmRulesRestrictions')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Next: Review</Text>
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
    marginBottom: 20,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  amenityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  chevronDown: {
    fontSize: 18,
  },
  chevronUp: {
    fontSize: 18,
  },
  counterValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginBottom: 12,
  },
  ruleLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginRight: 16,
  },
  fieldContainer: {
    marginTop: 16,
  },
  fieldLabel: {
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
    minHeight: 100,
    paddingTop: 14,
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
});
