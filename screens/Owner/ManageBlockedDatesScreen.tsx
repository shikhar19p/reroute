import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { getFarmhouseById } from '../../services/farmhouseService';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useDialog } from '../../components/CustomDialog';

type RootStackParamList = {
  ManageBlockedDates: { farmhouseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ManageBlockedDates'>;

export default function ManageBlockedDatesScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const { farmhouseId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    load();
  }, [farmhouseId]);

  const load = async () => {
    try {
      setLoading(true);
      const farm = await getFarmhouseById(farmhouseId);
      const blocked: string[] = Array.isArray((farm as any)?.blockedDates) ? (farm as any).blockedDates : [];
      const booked: string[] = Array.isArray((farm as any)?.bookedDates) ? (farm as any).bookedDates : [];
      // Only pre-select future blocked dates
      const futureBlocked = blocked.filter(d => d >= todayStr);
      setSelectedDates(new Set(futureBlocked));
      setBookedDates(new Set(booked));
    } catch {
      showDialog({ title: 'Error', message: 'Failed to load farmhouse', type: 'error' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;
    if (bookedDates.has(dateStr)) {
      showDialog({ title: 'Cannot Block', message: 'This date already has a booking.', type: 'warning' });
      return;
    }
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const removeDate = (date: string) => {
    setSelectedDates(prev => { const n = new Set(prev); n.delete(date); return n; });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'farmhouses', farmhouseId), { blockedDates: Array.from(selectedDates) });
      showDialog({ title: 'Saved', message: 'Blocked dates updated', type: 'success' });
      navigation.goBack();
    } catch {
      showDialog({ title: 'Error', message: 'Failed to save blocked dates', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    // Booked dates: red dot, tappable (warning shown in handler)
    bookedDates.forEach(d => {
      if (d >= todayStr) {
        marks[d] = { marked: true, dotColor: '#EF4444' };
      }
    });
    // Selected (blocked) dates override booked style
    selectedDates.forEach(d => {
      marks[d] = { selected: true, selectedColor: colors.buttonBackground, marked: bookedDates.has(d), dotColor: '#EF4444' };
    });
    return marks;
  }, [selectedDates, bookedDates, colors.buttonBackground, todayStr]);

  const sortedSelected = useMemo(() => Array.from(selectedDates).sort(), [selectedDates]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.buttonBackground} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Manage Blocked Dates</Text>
          <Text style={[styles.caption, { color: colors.placeholder }]}>
            Tap dates to block or unblock. Dates with bookings cannot be blocked (shown with red dot).
          </Text>

          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={todayStr}
            pastScrollRange={0}
            renderArrow={(direction) =>
              direction === 'left'
                ? <ChevronLeft size={20} color="#D4AF37" />
                : <ChevronRight size={20} color="#D4AF37" />
            }
            theme={{
              backgroundColor: colors.cardBackground,
              calendarBackground: colors.cardBackground,
              textSectionTitleColor: colors.text,
              dayTextColor: colors.text,
              todayTextColor: '#D4AF37',
              monthTextColor: colors.text,
              textDisabledColor: colors.text,
              selectedDayBackgroundColor: colors.buttonBackground,
              selectedDayTextColor: colors.buttonText,
            }}
          />

          {sortedSelected.length > 0 && (
            <View style={styles.chipsSection}>
              <Text style={[styles.chipsLabel, { color: colors.text }]}>Blocked Dates ({sortedSelected.length})</Text>
              <View style={styles.chips}>
                {sortedSelected.map(d => (
                  <View key={d} style={[styles.chip, { backgroundColor: colors.buttonBackground + '22', borderColor: colors.buttonBackground }]}>
                    <Text style={[styles.chipText, { color: colors.buttonBackground }]}>{d}</Text>
                    <TouchableOpacity onPress={() => removeDate(d)}>
                      <X size={12} color={colors.buttonBackground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: saving ? colors.border : colors.buttonBackground }]}
              onPress={save}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800' },
  caption: { fontSize: 12, lineHeight: 18 },
  calendar: { borderRadius: 12, overflow: 'hidden' },
  chipsSection: { gap: 8 },
  chipsLabel: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
