import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin } from 'lucide-react-native';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../components/CustomDialog';
import { RootStackScreenProps } from '../../types/navigation';
import { useAuth } from '../../authContext';
import { auth, db } from '../../firebaseConfig';

type Props = RootStackScreenProps<'EditProfile'>;

export default function EditProfileScreen({ route, navigation }: Props) {
  const { profile } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth(); // Get current user session
  const { showDialog } = useDialog();
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone ? profile.phone.replace(/[^0-9]/g, '').slice(-10) : '',
    age: profile?.age ? profile.age.toString() : '',
    address: profile?.address || '',
    gender: profile?.gender || ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (formData.age) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        newErrors.age = 'Age must be between 18 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user || !auth.currentUser) {
      return;
    }

    setLoading(true);
    try {
      // 1. Update Firebase Authentication profile (for displayName)
      await updateProfile(auth.currentUser, {
        displayName: formData.name,
      });

      // 2. Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: formData.name,
        phone: `+91 ${formData.phone}`,
        age: formData.age ? parseInt(formData.age) : null,
        address: formData.address,
        gender: formData.gender,
      }, { merge: true }); // merge: true prevents overwriting other fields like email, role etc.

      showDialog({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }]
      });

    } catch (error) {
      console.error("Error updating profile:", error);
      showDialog({
        title: 'Error',
        message: 'Failed to update profile. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            
            {/* --- Form fields are the same as before --- */}
            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: errors.name ? '#EF4444' : colors.border }]}>
                <User size={20} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.placeholder}
                  maxLength={50}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Email (Read-only) */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', borderColor: colors.border }]}>
                <Mail size={20} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.placeholder }]}
                  value={formData.email}
                  editable={false}
                />
              </View>
              <Text style={[styles.helperText, { color: colors.placeholder }]}>Email cannot be changed</Text>
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: errors.phone ? '#EF4444' : colors.border }]}>
                <Phone size={20} color={colors.placeholder} />
                <Text style={[styles.prefix, { color: colors.text }]}>+91</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.phone}
                  onChangeText={(text) => {
                    const numericOnly = text.replace(/[^0-9]/g, '');
                    if (numericOnly.length <= 10) {
                      updateField('phone', numericOnly);
                    }
                  }}
                  placeholder="9876543210"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Age */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Age (Optional)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: errors.age ? '#EF4444' : colors.border }]}>
                <Calendar size={20} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.age}
                  onChangeText={(text) => updateField('age', text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter age"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>

            {/* Gender */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Gender (Optional)</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      formData.gender === gender && { backgroundColor: colors.buttonBackground },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => updateField('gender', gender)}
                  >
                    <Text style={[
                      styles.genderText,
                      { color: formData.gender === gender ? colors.buttonText : colors.text }
                    ]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Address (Optional)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <MapPin size={20} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.address}
                  onChangeText={(text) => updateField('address', text)}
                  placeholder="City, State"
                  placeholderTextColor={colors.placeholder}
                  maxLength={100}
                />
              </View>
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.buttonBackground, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  keyboardAvoid: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  formCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 50 },
  prefix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
  input: { flex: 1, fontSize: 15, marginLeft: 10 },
  helperText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  genderContainer: { flexDirection: 'row', gap: 10 },
  genderButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  genderText: { fontSize: 14, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 2, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
});