import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AmenitiesSectionProps {
  amenitiesList: string[];
  previewCount?: number;
}

export default function AmenitiesSection({ amenitiesList, previewCount = 6 }: AmenitiesSectionProps) {
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
      <View style={styles.amenitiesGrid}>
        {amenitiesList.slice(0, previewCount).map((amenity, index) => (
          <View key={index} style={[styles.amenityChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
          </View>
        ))}
      </View>
      {amenitiesList.length > previewCount && (
        <TouchableOpacity
          style={[styles.showAllBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setShowAll(true)}
        >
          <Text style={[styles.showAllText, { color: colors.text }]}>
            Show all {amenitiesList.length} amenities
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showAll}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowAll(false)}
      >
        {/* RN's Modal opens a separate native window on iOS, so the app's root
            SafeAreaProvider never reaches here — insets come back as zero,
            pushing the header under the status bar/notch. Re-provide it locally. */}
        <SafeAreaProvider>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.screenHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowAll(false)} style={styles.backBtn}>
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Amenities</Text>
                <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
                  {amenitiesList.length} amenities available
                </Text>
              </View>
            </View>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces
            >
              <View style={styles.amenitiesGrid}>
                {amenitiesList.map((amenity, index) => (
                  <View key={index} style={[styles.amenityChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  amenityText: { fontSize: 14 },
  showAllBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  showAllText: { fontSize: 14, fontWeight: '600' },

  modalContainer: { flex: 1 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  headerSubtitle: { fontSize: 13 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 8, paddingBottom: 24 },
});
