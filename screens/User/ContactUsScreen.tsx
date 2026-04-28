import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Linking, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Phone, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { useDialog } from '../../components/CustomDialog';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function ContactUsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showDialog } = useDialog();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showDialog({ title: 'Missing Fields', message: 'Please fill in both subject and message.', type: 'error' });
      return;
    }
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'contactRequests'), {
        userId: user?.uid || null,
        userEmail: user?.email || null,
        subject: subject.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setSubject('');
      setMessage('');
      showDialog({ title: 'Message Sent', message: "We've received your message and will get back to you within 24–48 hours.", type: 'success' });
    } catch {
      showDialog({ title: 'Error', message: 'Could not send your message. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const ContactLink = ({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.linkRow, { borderBottomColor: colors.divider }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.linkIcon, { backgroundColor: colors.surfaceOverlay }]}>{icon}</View>
      <View style={styles.linkText}>
        <Text style={[styles.linkLabel, { color: colors.placeholder }]}>{label}</Text>
        <Text style={[styles.linkValue, { color: colors.text }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Direct contact */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <ContactLink
              icon={<Phone size={18} color={colors.primary} />}
              label="Phone / WhatsApp"
              value="+91 82803 53535"
              onPress={() => Linking.openURL('tel:+918280353535')}
            />
            <ContactLink
              icon={<Mail size={18} color={colors.primary} />}
              label="Email"
              value="rustiquebyranareddy@gmail.com"
              onPress={() => Linking.openURL('mailto:rustiquebyranareddy@gmail.com')}
            />
          </View>

          {/* Send a message form */}
          <Text style={[styles.formTitle, { color: colors.text }]}>Send us a message</Text>
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.placeholder }]}>Subject</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="e.g. Booking issue, refund query..."
                placeholderTextColor={colors.placeholder}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>
            <View style={[styles.field, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <Text style={[styles.fieldLabel, { color: colors.placeholder }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Describe your issue or query..."
                placeholderTextColor={colors.placeholder}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.buttonBackground }, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color={colors.buttonText} />
              : (
                <>
                  <MessageSquare size={16} color={colors.buttonText} />
                  <Text style={[styles.submitText, { color: colors.buttonText }]}>Send Message</Text>
                </>
              )}
          </TouchableOpacity>

          <Text style={[styles.responseTime, { color: colors.placeholder }]}>We typically respond within 24–48 hours.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  headerSpacer: { width: 30 },
  content: { padding: 16, paddingBottom: 60, gap: 12 },
  card: {
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  linkText: { flex: 1 },
  linkLabel: { fontSize: 12, marginBottom: 2 },
  linkValue: { fontSize: 14, fontWeight: '500' },
  formTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  field: { padding: 16 },
  fieldLabel: { fontSize: 12, marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  textArea: { minHeight: 100, paddingTop: 10 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '600' },
  responseTime: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});
