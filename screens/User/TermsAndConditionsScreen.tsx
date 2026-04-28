import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TermsAndConditionsScreen({ navigation }: any) {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.placeholder }]}>Last updated: April 2025</Text>

        <Section
          title="1. Acceptance of Terms"
          body="By accessing or using the Reroute platform (app and website), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform."
        />
        <Section
          title="2. User Accounts"
          body="You must be at least 18 years old to create an account and make bookings. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
        />
        <Section
          title="3. Bookings"
          body="A booking is confirmed only upon successful payment. Reroute acts as an intermediary between guests and property owners. We do not own or manage the listed properties. The accuracy of property information is the responsibility of the owner."
        />
        <Section
          title="4. Payments & Pricing"
          body="All prices displayed are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. Payments are processed via Razorpay. Once a payment is confirmed, a booking confirmation is sent to your registered email."
        />
        <Section
          title="5. Cancellations & Refund Policy"
          body="All cancellation requests must be submitted to our support team at rustiquebyranareddy@gmail.com or +91 82803 53535 with your Booking ID before the check-in time."
        />
        <Section
          title="5a. Refund Eligibility"
          body={"Cancelled more than 24 hours before check-in: 100% refund of the booking amount.\n\nCancelled within 24 hours of check-in: 50% refund.\n\nNo-show or cancellation after check-in has commenced: No refund (0%)."}
        />
        <Section
          title="5b. Refund Processing"
          body="Approved refunds are processed within 5–7 business days to the original payment method. Razorpay processing fees (if any) are non-refundable. You will be notified by email once the refund is initiated."
        />
        <Section
          title="6. Guest Conduct"
          body="Guests are expected to respect property rules, which are listed on each property's page. Damage to property, illegal activities, or violation of house rules may result in additional charges, cancellation of the booking without refund, and/or account suspension."
        />
        <Section
          title="7. Property Owner Obligations"
          body="Property owners must ensure their listings are accurate, properties are safe and as described, and that they honour confirmed bookings. Owners who consistently fail to meet these standards may be removed from the platform."
        />
        <Section
          title="8. Limitation of Liability"
          body="Reroute is not liable for any loss, injury, or damage arising from your use of the platform or your stay at a listed property. Our liability is limited to the booking amount paid on the platform."
        />
        <Section
          title="9. Intellectual Property"
          body="All content on the Reroute platform, including design, logos, and text, is the property of Reroute and may not be reproduced without written permission."
        />
        <Section
          title="10. Governing Law"
          body="These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Maharashtra, India."
        />
        <Section
          title="11. Changes to Terms"
          body="Reroute reserves the right to update these terms at any time. Users will be notified of significant changes. Continued use of the platform after changes constitutes acceptance of the updated terms."
        />
        <Section
          title="12. Contact"
          body="For questions about these terms, reach us at rustiquebyranareddy@gmail.com or +91 82803 53535, or through the Contact Us section in the app."
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
