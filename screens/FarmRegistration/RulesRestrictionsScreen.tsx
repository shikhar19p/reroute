import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';

type RootStackParamList = {
  FarmKyc: undefined;
};

type RulesRestrictionsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

export default function RulesRestrictionsScreen({ navigation }: RulesRestrictionsScreenProps) {
  const { farm } = useFarmRegistration();
  const { amenities, rules } = farm;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review Configuration</Text>
        <Text style={styles.subtitle}>Please review your amenities and rules before proceeding</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏠 Amenities & Games</Text>

          {amenities.tv > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>TV: {amenities.tv}</Text>
            </View>
          )}

          {amenities.geyser > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Geyser: {amenities.geyser}</Text>
            </View>
          )}

          {amenities.bonfire > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Bonfire: {amenities.bonfire}</Text>
            </View>
          )}

          {amenities.pool && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Swimming Pool Available</Text>
            </View>
          )}

          {amenities.chess > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Chess: {amenities.chess}</Text>
            </View>
          )}

          {amenities.carroms > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Carroms: {amenities.carroms}</Text>
            </View>
          )}

          {amenities.volleyball > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.itemText}>Volleyball: {amenities.volleyball}</Text>
            </View>
          )}

          {amenities.customAmenities && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Additional Amenities:</Text>
              <Text style={styles.infoValue}>{amenities.customAmenities}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Rules & Restrictions</Text>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Unmarried couples allowed?</Text>
            {rules.unmarriedNotAllowed ? (
              <View style={styles.noIcon}>
                <Text style={styles.crossIcon}>❌</Text>
                <Text style={styles.noText}>No</Text>
              </View>
            ) : (
              <View style={styles.yesIcon}>
                <Text style={styles.checkIconGreen}>✅</Text>
                <Text style={styles.yesText}>Yes</Text>
              </View>
            )}
          </View>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Pets allowed?</Text>
            {rules.petsNotAllowed ? (
              <View style={styles.noIcon}>
                <Text style={styles.crossIcon}>❌</Text>
                <Text style={styles.noText}>No</Text>
              </View>
            ) : (
              <View style={styles.yesIcon}>
                <Text style={styles.checkIconGreen}>✅</Text>
                <Text style={styles.yesText}>Yes</Text>
              </View>
            )}
          </View>

          {rules.quietHours && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Quiet Hours:</Text>
              <Text style={styles.infoValue}>{rules.quietHours}</Text>
            </View>
          )}

          {rules.customRules && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Additional Rules:</Text>
              <Text style={styles.infoValue}>{rules.customRules}</Text>
            </View>
          )}
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
    padding: 20,
    paddingBottom: 120, // Extra padding for bottom buttons
  },
  title: {
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 20,
  },
  itemText: {
    fontSize: 16,
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
    gap: 6,
  },
  checkIconGreen: {
    fontSize: 20,
  },
  yesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4AF37',
  },
  noIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crossIcon: {
    fontSize: 20,
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
});
