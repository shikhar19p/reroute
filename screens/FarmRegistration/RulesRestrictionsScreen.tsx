import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { Check } from 'lucide-react-native';

type RootStackParamList = {
  FarmKyc: undefined;
};

type RulesRestrictionsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  ac: 'Air Conditioning',
  parking: 'Parking',
  kitchen: 'Kitchen',
  tv: 'TV',
  geyser: 'Geyser (Hot Water)',
  pool: 'Swimming Pool',
  bonfire: 'Bonfire',
  bbq: 'BBQ / Grill',
  outdoorSeating: 'Outdoor Seating',
  hotTub: 'Hot Tub / Jacuzzi',
  djMusicSystem: 'DJ / Music System',
  projector: 'Projector',
  restaurant: 'Restaurant',
  foodPrepOnDemand: 'Food Prep on Demand',
  decorService: 'Decor Service',
  chess: 'Chess',
  carrom: 'Carom Board',
  volleyball: 'Volleyball',
  badminton: 'Badminton Court',
  tableTennis: 'Table Tennis',
  cricket: 'Cricket Ground',
};

export default function RulesRestrictionsScreen({ navigation }: RulesRestrictionsScreenProps) {
  const { farm } = useFarmRegistration();
  const { amenities, rules } = farm;

  const enabledAmenities = Object.entries(AMENITY_LABELS).filter(
    ([key]) => (amenities as any)[key] === true || (amenities as any)[key] > 0
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Amenities & Facilities</Text>

          {enabledAmenities.length === 0 && (
            <Text style={styles.emptyText}>No amenities selected</Text>
          )}

          {enabledAmenities.map(([key, label]) => (
            <View key={key} style={styles.itemRow}>
              <Check size={14} color="#16A34A" />
              <Text style={styles.itemText}>{label}</Text>
            </View>
          ))}

          {amenities.customAmenities ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Additional Amenities:</Text>
              <Text style={styles.infoValue}>{amenities.customAmenities}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rules & Restrictions</Text>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Pets allowed?</Text>
            {rules.petsNotAllowed ? (
              <View style={styles.noIcon}>
                <Text style={styles.noText}>No</Text>
              </View>
            ) : (
              <View style={styles.yesIcon}>
                <Text style={styles.yesText}>Yes</Text>
              </View>
            )}
          </View>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Alcohol allowed?</Text>
            {(rules as any).alcoholNotAllowed ? (
              <View style={styles.noIcon}>
                <Text style={styles.noText}>No</Text>
              </View>
            ) : (
              <View style={styles.yesIcon}>
                <Text style={styles.yesText}>Yes</Text>
              </View>
            )}
          </View>

          {rules.customRules ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Additional Rules:</Text>
              <Text style={styles.infoValue}>{rules.customRules}</Text>
            </View>
          ) : null}
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
          onPress={() => navigation.navigate('FarmKyc')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Next: KYC</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  itemText: {
    fontSize: 15,
    color: '#374151',
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ruleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  yesIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  noIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
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
