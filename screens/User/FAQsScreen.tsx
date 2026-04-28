import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    q: 'How do I make a booking?',
    a: 'Browse farmhouses on the Explore tab, tap one to view details, select your dates and booking type (Day Use or Overnight), choose guest count, and proceed to payment. You\'ll receive a confirmation email once payment is successful.',
  },
  {
    q: 'What is Day Use vs Overnight?',
    a: 'Day Use bookings are for a single day (typically 9 AM – 6 PM) and are priced per day. Overnight bookings span one or more nights (typically check-in 12 PM – check-out 11 AM next day) and are priced per night.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Cancellation policies vary by property. Please check the property\'s specific cancellation terms before booking. To cancel, go to My Bookings, select the booking, and follow the cancellation steps. Refunds depend on the property\'s policy.',
  },
  {
    q: 'How are extra guests charged?',
    a: 'If you add guests beyond the base capacity, an extra charge per guest per day/night is applied automatically. The rate is set by the property owner and is shown in the pricing section of the property detail page.',
  },
  {
    q: 'Is my payment secure?',
    a: 'Yes. All payments are processed through Razorpay, a PCI-DSS compliant payment gateway. We do not store your card details on our servers.',
  },
  {
    q: 'What happens after I pay?',
    a: 'Your booking is confirmed immediately. You will receive a confirmation email with all details. The booking appears in your Bookings tab. The property owner is also notified.',
  },
  {
    q: 'How do I contact the property owner?',
    a: 'Once your booking is confirmed, the owner\'s contact details are shown on your Booking Details page. You can call them directly from there.',
  },
  {
    q: 'Can I add a property to my wishlist?',
    a: 'Yes. Tap the heart icon on any property card or detail page to save it. View all saved properties in the Wishlist tab.',
  },
  {
    q: 'How do I leave a review?',
    a: 'After your stay, you can leave a review on the property detail page. Reviews help other guests make informed decisions.',
  },
  {
    q: 'I have a problem with my booking. What do I do?',
    a: 'Contact us via the Contact Us section in your Profile. Include your booking ID and a description of the issue. We typically respond within 24 hours.',
  },
];

export default function FAQsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(prev => (prev === i ? null : i));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>FAQs</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {FAQS.map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.item, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => toggle(i)}
            activeOpacity={0.7}
          >
            <View style={styles.question}>
              <Text style={[styles.questionText, { color: colors.text }]}>{faq.q}</Text>
              {open === i
                ? <ChevronUp size={18} color={colors.placeholder} />
                : <ChevronDown size={18} color={colors.placeholder} />}
            </View>
            {open === i && (
              <Text style={[styles.answer, { color: colors.placeholder, borderTopColor: colors.divider }]}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}
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
  content: { padding: 16, paddingBottom: 60, gap: 10 },
  item: {
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  question: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, gap: 12,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  answer: {
    fontSize: 14, lineHeight: 22, padding: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
