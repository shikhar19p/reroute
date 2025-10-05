import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';

type RootStackParamList = {
  AllAmenities: { amenities: string[] };
};

type Props = NativeStackScreenProps<RootStackParamList, 'AllAmenities'>;

export default function AllAmenitiesScreen({ route, navigation }: Props) {
  const { amenities } = route.params;
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>All Amenities</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {amenities.map((amenity, index) => (
          <View
            key={index}
            style={[styles.amenityItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <Check size={20} color={colors.buttonBackground} />
            <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  amenityText: { fontSize: 16 },
});