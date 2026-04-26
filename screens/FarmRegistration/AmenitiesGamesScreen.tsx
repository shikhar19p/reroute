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

const amenitiesGroups = [
  {
    title: 'Essentials',
    items: [
      { key: 'wifi', label: 'WiFi' },
      { key: 'ac', label: 'Air Conditioning' },
      { key: 'parking', label: 'Parking' },
      { key: 'kitchen', label: 'Kitchen' },
      { key: 'tv', label: 'TV' },
      { key: 'geyser', label: 'Geyser (Hot Water)' },
    ],
  },
  {
    title: 'Outdoors',
    items: [
      { key: 'pool', label: 'Swimming Pool' },
      { key: 'bonfire', label: 'Bonfire' },
      { key: 'bbq', label: 'BBQ / Grill' },
      { key: 'outdoorSeating', label: 'Outdoor Seating' },
      { key: 'hotTub', label: 'Hot Tub / Jacuzzi' },
    ],
  },
  {
    title: 'Entertainment',
    items: [
      { key: 'djMusicSystem', label: 'DJ / Music System' },
      { key: 'projector', label: 'Projector' },
    ],
  },
  {
    title: 'Food & Services',
    items: [
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'foodPrepOnDemand', label: 'Food Prep on Demand' },
      { key: 'decorService', label: 'Decor Service' },
    ],
  },
  {
    title: 'Games & Sports',
    items: [
      { key: 'chess', label: 'Chess' },
      { key: 'carrom', label: 'Carom Board' },
      { key: 'volleyball', label: 'Volleyball' },
      { key: 'badminton', label: 'Badminton Court' },
      { key: 'tableTennis', label: 'Table Tennis' },
      { key: 'cricket', label: 'Cricket Ground' },
    ],
  },
];

export default function AmenitiesGamesScreen({ navigation }: AmenitiesGamesScreenProps) {
  const { farm, setField } = useFarmRegistration();

  const handleToggle = useCallback(
    (path: string[], value: boolean) => {
      setField(path, value);
    },
    [setField]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {amenitiesGroups.map((group) => (
            <View key={group.title} style={styles.section}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item) => (
                <View key={item.key} style={styles.amenityRow}>
                  <Text style={styles.amenityLabel}>{item.label}</Text>
                  <Switch
                    value={(farm.amenities as any)[item.key] || false}
                    onValueChange={(value) => handleToggle(['amenities', item.key], value)}
                    trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
                    thumbColor={(farm.amenities as any)[item.key] ? '#FFFFFF' : '#F5F5F5'}
                  />
                </View>
              ))}
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.groupTitle}>Additional Amenities</Text>
            <TextInput
              value={farm.amenities.customAmenities ?? ''}
              onChangeText={(text) => setField(['amenities', 'customAmenities'], text)}
              placeholder="e.g., Game room, Swing set, Gazebo..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rules & Restrictions</Text>

            <View style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>Pets not allowed</Text>
              <Switch
                value={farm.rules.petsNotAllowed}
                onValueChange={(value) => handleToggle(['rules', 'petsNotAllowed'], value)}
                trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                thumbColor={farm.rules.petsNotAllowed ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>

            <View style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>Alcohol not allowed</Text>
              <Switch
                value={(farm.rules as any).alcoholNotAllowed ?? false}
                onValueChange={(value) => handleToggle(['rules', 'alcoholNotAllowed'], value)}
                trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                thumbColor={(farm.rules as any).alcoholNotAllowed ? '#FFFFFF' : '#F5F5F5'}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  amenityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
    marginTop: 8,
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
