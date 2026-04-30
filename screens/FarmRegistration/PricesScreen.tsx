import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Clock } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pricesSchema } from '../../utils/validation';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { useDialog } from '../../components/CustomDialog';

const TIME_OPTIONS = [
  '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  '6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM','11:00 PM','12:00 AM',
];

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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function PricesScreen({ navigation }: PricesScreenProps) {
  const { farm, setField } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [timePickerField, setTimePickerField] = useState<string | null>(null);

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

  const openDatePicker = useCallback((index: number) => {
    setViewDate(new Date());
    setDatePickerIndex(index);
  }, []);

  const handleDateSelect = useCallback((day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = `${day} ${MONTH_SHORT[selected.getMonth()]} ${selected.getFullYear()}`;
    if (datePickerIndex !== null) {
      updateCustomPrice(datePickerIndex, 'name', formatted);
    }
    setDatePickerIndex(null);
  }, [datePickerIndex, viewDate, updateCustomPrice]);

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
      <View>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={styles.calNav}>
            <Text style={styles.calNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calMonthText}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={styles.calNav}>
            <Text style={styles.calNavText}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calDayNames}>
          {DAY_NAMES.map(d => <Text key={d} style={styles.calDayName}>{d}</Text>)}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((day, ci) => (
              day ? (
                <TouchableOpacity key={ci} style={styles.calDay} onPress={() => handleDateSelect(day)}>
                  <Text style={styles.calDayText}>{day}</Text>
                </TouchableOpacity>
              ) : (
                <View key={ci} style={styles.calDay} />
              )
            ))}
          </View>
        ))}
      </View>
    );
  };

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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Modal visible={datePickerIndex !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDatePickerIndex(null)}>
          <Pressable style={styles.calendarModal}>
            <Text style={styles.calendarTitle}>Select Date</Text>
            {renderCalendar()}
            <TouchableOpacity style={styles.calCancelBtn} onPress={() => setDatePickerIndex(null)}>
              <Text style={styles.calCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
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
                <View style={[styles.sectionHeader, index === 0 && { marginTop: 0 }]}>
                  <Text style={styles.sectionIcon}>Rs.</Text>
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
            <Plus size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Custom Pricing (Optional)</Text>
          </View>
          <Text style={styles.helperText}>Add special pricing for holidays or special events</Text>

          {(farm.pricing.customPricing || []).map((item, index) => (
            <View key={index} style={styles.customPriceRow}>
              <View style={styles.customPriceInputs}>
                <TouchableOpacity
                  style={[styles.input, styles.datePickerButton]}
                  onPress={() => openDatePicker(index)}
                  activeOpacity={0.7}
                >
                  <Text style={item.name ? styles.datePickerText : styles.datePickerPlaceholder}>
                    {item.name || 'Tap to select date'}
                  </Text>
                  <Calendar size={16} color="#9CA3AF" />
                </TouchableOpacity>
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

          {/* Extra Guest Pricing */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👥</Text>
            <Text style={styles.sectionTitle}>Guest Limits & Extra Charges</Text>
          </View>
          {(() => {
            const cap = parseInt((farm as any).basicDetails?.capacity) || 0;
            const maxG = parseInt((farm.pricing as any).maxGuests) || 0;
            const extraP = parseInt((farm.pricing as any).extraGuestPrice) || 0;
            return (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Max Guests Allowed*</Text>
                  <TextInput
                    value={(farm.pricing as any).maxGuests ?? ''}
                    onChangeText={(text) => setField(['pricing', 'maxGuests'], text.replace(/[^0-9]/g, ''))}
                    placeholder="Enter maximum guests allowed"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    Hard cap on total guests.{cap > 0 ? ` Base capacity is ${cap}; guests above ${cap} pay the extra rate.` : ' Must be ≥ base capacity set in previous step.'}
                  </Text>
                </View>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Price Per Extra Guest (per day/night)*</Text>
                  <TextInput
                    value={(farm.pricing as any).extraGuestPrice ?? ''}
                    onChangeText={(text) => setField(['pricing', 'extraGuestPrice'], text.replace(/[^0-9]/g, ''))}
                    placeholder="₹ Per extra guest charge"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    Charged per guest per night/day for each guest above base capacity{cap > 0 ? ` (${cap})` : ''}.
                  </Text>
                </View>
                {maxG > cap && cap > 0 && extraP > 0 && (
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 2 }}>Preview</Text>
                    <Text style={{ fontSize: 12, color: '#166534' }}>
                      {maxG - cap} extra slot{maxG - cap !== 1 ? 's' : ''} above base {cap} · ₹{extraP}/guest/night
                    </Text>
                    <Text style={{ fontSize: 12, color: '#15803D', marginTop: 2 }}>
                      e.g. {maxG - cap} extra guests × 2 nights = ₹{(maxG - cap) * extraP * 2} extra
                    </Text>
                  </View>
                )}
              </>
            );
          })()}

          {/* Check-in / Check-out Times */}
          <View style={styles.sectionHeader}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Check-in & Check-out Times</Text>
          </View>
          <Text style={styles.helperText}>Set the allowed times for guests</Text>

          <Text style={styles.timeGroupLabel}>Day Use</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-in</Text>
              <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerField('dayUseCheckIn')} activeOpacity={0.7}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.timePickerText}>{(farm.pricing as any).dayUseCheckIn || '9:00 AM'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-out</Text>
              <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerField('dayUseCheckOut')} activeOpacity={0.7}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.timePickerText}>{(farm.pricing as any).dayUseCheckOut || '6:00 PM'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.timeGroupLabel, { marginTop: 12 }]}>Overnight Stay</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-in</Text>
              <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerField('nightCheckIn')} activeOpacity={0.7}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.timePickerText}>{(farm.pricing as any).nightCheckIn || '12:00 PM'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-out</Text>
              <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerField('nightCheckOut')} activeOpacity={0.7}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.timePickerText}>{(farm.pricing as any).nightCheckOut || '11:00 AM'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Time Picker Modal */}
        <Modal visible={timePickerField !== null} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setTimePickerField(null)}>
            <Pressable style={styles.calendarModal}>
              <Text style={styles.calendarTitle}>Select Time</Text>
              <FlatList
                data={TIME_OPTIONS}
                keyExtractor={(item) => item}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const current = (farm.pricing as any)[timePickerField!];
                  const isSelected = current === item;
                  return (
                    <TouchableOpacity
                      style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                      onPress={() => {
                        if (timePickerField) setField(['pricing', timePickerField], item);
                        setTimePickerField(null);
                      }}
                    >
                      <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity style={styles.calCancelBtn} onPress={() => setTimePickerField(null)}>
                <Text style={styles.calCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
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
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    flex: 1,
  },
  calendarIcon: {
    fontSize: 18,
  },
  customPriceInput: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    maxWidth: 360,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNav: {
    padding: 8,
  },
  calNavText: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: '600',
  },
  calMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  calDayNames: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 4,
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  calDayText: {
    fontSize: 15,
    color: '#1F2937',
  },
  calCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  calCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
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
  timeGroupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  timePickerText: {
    fontSize: 15,
    color: '#1F2937',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeOptionSelected: {
    backgroundColor: '#ECFDF5',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  timeOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '700',
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
