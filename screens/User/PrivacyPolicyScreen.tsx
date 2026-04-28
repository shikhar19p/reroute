import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { colors } = useTheme();

  const Section = ({ title, body }: { title: string; body: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.placeholder }]}>{body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.placeholder }]}>Last updated: April 2025</Text>

        <Section
          title="1. Information We Collect"
          body="We collect information you provide directly — such as your name, email address, phone number, and payment details when you register or make a booking. We also collect usage data like device information, IP address, and browsing behaviour within the app to improve our services."
        />
        <Section
          title="2. How We Use Your Information"
          body="Your information is used to process bookings, send confirmation and notification emails, provide customer support, and improve our platform. We do not sell your personal data to third parties."
        />
        <Section
          title="3. Payment Data"
          body="Payments are processed securely through Razorpay. We do not store your full card details on our servers. Payment records including transaction IDs are retained for accounting and dispute resolution purposes."
        />
        <Section
          title="4. Data Sharing"
          body="We share your booking details (name, phone, dates) with the property owner to facilitate your stay. We may share data with service providers like Firebase and email delivery services solely to operate the platform."
        />
        <Section
          title="5. Data Retention"
          body="We retain your account and booking data for as long as your account is active, or as required by law. You may request deletion of your account and associated data by contacting us."
        />
        <Section
          title="6. Cookies & Analytics"
          body="Our web platform may use cookies and analytics tools to understand traffic and usage patterns. These do not identify you personally and can be disabled in your browser settings."
        />
        <Section
          title="7. Security"
          body="We implement industry-standard security measures including encrypted connections (HTTPS) and Firebase security rules to protect your data. No system is 100% secure, and we encourage you to keep your login credentials confidential."
        />
        <Section
          title="8. Your Rights"
          body="You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at rustiquebyranareddy@gmail.com or +91 82803 53535. We will respond within 30 days."
        />
        <Section
          title="9. Changes to This Policy"
          body="We may update this policy from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of the app after changes constitutes acceptance."
        />
        <Section
          title="10. Contact"
          body="For any privacy-related queries, reach us at rustiquebyranareddy@gmail.com or +91 82803 53535, or through the Contact Us section in the app."
        />
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 60 },
  lastUpdated: { fontSize: 13, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
