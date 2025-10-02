import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';

type RootStackParamList = {
  BookingConfirmation: {
    farmhouseId: string;
    farmhouseName: string;
    farmhouseImage: string;
    location: string;
    startDate: string;
    endDate: string;
    guestCount: number;
    totalPrice: number;
    numberOfNights: number;
    bookingType: string;
    capacity: number;
    rooms: number;
  };
  Profile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmation'>;

export default function BookingConfirmationScreen({ route, navigation }: Props) {
  const {
    farmhouseId,
    farmhouseName,
    farmhouseImage,
    location,
    startDate,
    endDate,
    guestCount,
    totalPrice,
    numberOfNights,
    bookingType,
    capacity,
    rooms
  } = route.params;

  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const userProfile = {
    name: user?.displayName || 'Akshita Reddy',
    email: user?.email || 'akshita@example.com',
    phone: '+91 98765 43210',
    kycStatus: 'uploaded',
    kycDocuments: {
      type: 'aadhar',
      frontImage: 'https://via.placeholder.com/300x200',
      backImage: 'https://via.placeholder.com/300x200',
      uploadedAt: '2024-09-15'
    }
  };

  const handleProceedToPayment = () => {
    Alert.alert(
      'Proceed to Payment',
      'Payment gateway will be integrated soon. Your booking details have been confirmed.',
      [
        {
          text: 'OK',
          onPress: () => navigation.popToTop()
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Booking Confirmation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Image source={{ uri: farmhouseImage }} style={styles.farmhouseImage} />
          <View style={styles.farmhouseInfo}>
            <Text style={[styles.farmhouseName, { color: colors.text }]}>{farmhouseName}</Text>
            <Text style={[styles.farmhouseLocation, { color: colors.placeholder }]}>{location}</Text>
            <View style={styles.farmhouseDetails}>
              <Text style={[styles.detailText, { color: colors.placeholder }]}>
                {capacity} guests • {rooms} rooms
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.billingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Billing Summary</Text>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Booking Type:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {bookingType === 'day-use' ? 'Day Use' : `Overnight (${numberOfNights} ${numberOfNights === 1 ? 'night' : 'nights'})`}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Check-in:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {formatDate(startDate)} {bookingType === 'day-use' ? '' : '(2:00 PM)'}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Check-out:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>
              {formatDate(bookingType === 'day-use' ? startDate : endDate)} {bookingType === 'day-use' ? '(6:00 PM)' : '(12:00 PM)'}
            </Text>
          </View>

          <View style={styles.billingRow}>
            <Text style={[styles.billingLabel, { color: colors.placeholder }]}>Guests:</Text>
            <Text style={[styles.billingValue, { color: colors.text }]}>{guestCount}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.billingRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount:</Text>
            <Text style={[styles.totalValue, { color: colors.buttonBackground }]}>₹{totalPrice}</Text>
          </View>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Contact Information</Text>
          <Text style={[styles.contactSubtext, { color: colors.placeholder }]}>
            The farmhouse owner will receive these details:
          </Text>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <Text style={styles.contactIcon}>👤</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Full Name</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.name}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <Text style={styles.contactIcon}>📞</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Mobile Number</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.phone}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: isDark ? 'rgba(2,68,77,0.2)' : 'rgba(2,68,77,0.1)' }]}>
              <Text style={styles.contactIcon}>✉️</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactLabel, { color: colors.placeholder }]}>Email Address</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{userProfile.email}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kycCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.kycHeader}>
            <View style={styles.kycTitleRow}>
              <Text style={styles.kycIcon}>✅</Text>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>KYC Documents</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Text style={[styles.viewKycText, { color: colors.buttonBackground }]}>View Details</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.kycSubtext, { color: colors.placeholder }]}>
            Your {userProfile.kycDocuments.type.toUpperCase()} will be shared with the farmhouse owner for verification upon booking confirmation.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomLabel, { color: colors.placeholder }]}>Total Amount</Text>
          <Text style={[styles.bottomPrice, { color: colors.buttonBackground }]}>₹{totalPrice}</Text>
        </View>
        <TouchableOpacity
          style={[styles.proceedButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleProceedToPayment}
        >
          <Text style={[styles.proceedButtonText, { color: colors.buttonText }]}>
            Proceed to Payment
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  backIcon: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  summaryCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  farmhouseImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  farmhouseInfo: { gap: 4 },
  farmhouseName: { fontSize: 18, fontWeight: '600' },
  farmhouseLocation: { fontSize: 14 },
  farmhouseDetails: { marginTop: 4 },
  detailText: { fontSize: 13 },
  billingCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billingLabel: { fontSize: 14 },
  billingValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  contactCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  contactSubtext: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  contactIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactIcon: { fontSize: 20 },
  contactTextContainer: { flex: 1 },
  contactLabel: { fontSize: 12, marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '500' },
  kycCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  kycHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kycTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kycIcon: { fontSize: 24 },
  viewKycText: { fontSize: 14, fontWeight: '500' },
  kycSubtext: { fontSize: 13, lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  bottomLabel: { fontSize: 12, marginBottom: 4 },
  bottomPrice: { fontSize: 24, fontWeight: 'bold' },
  proceedButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  proceedButtonText: { fontSize: 16, fontWeight: '600' },
});
