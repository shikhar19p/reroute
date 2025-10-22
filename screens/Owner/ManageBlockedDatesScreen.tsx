import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { getFarmhouseById } from '../../services/farmhouseService';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

type RootStackParamList = {
  ManageBlockedDates: { farmhouseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ManageBlockedDates'>;

export default function ManageBlockedDatesScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { farmhouseId } = route.params;
  const [loading, setLoading] = useState(true);
  const [blockedDatesInput, setBlockedDatesInput] = useState('');

  useEffect(() => {
    load();
  }, [farmhouseId]);

  const load = async () => {
    try {
      setLoading(true);
      const farm = await getFarmhouseById(farmhouseId);
      const blocked = (farm as any)?.blockedDates || [];
      setBlockedDatesInput(Array.isArray(blocked) ? blocked.join(', ') : '');
    } catch (e) {
      Alert.alert('Error', 'Failed to load farmhouse');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      const arr = blockedDatesInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await updateDoc(doc(db, 'farmhouses', farmhouseId), { blockedDates: arr });
      Alert.alert('Saved', 'Blocked dates updated');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save blocked dates');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.buttonBackground} /></View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Manage Blocked Dates</Text>
          <Text style={[styles.caption, { color: colors.placeholder }]}>Enter dates in YYYY-MM-DD format, comma-separated.</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }]}
            value={blockedDatesInput}
            onChangeText={setBlockedDatesInput}
            placeholder="2025-01-15, 2025-01-26"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.buttonBackground }]} onPress={save}>
              <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  caption: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});

