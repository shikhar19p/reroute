import React, { useState } from 'react';
import {
  Alert, StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView,
  Image, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Mail, Calendar, MapPin, X, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../authContext';
import { useTheme } from '../../../context/ThemeContext';

interface KycDocuments {
  type: string;
  frontImage: string;
  backImage: string;
  uploadedAt: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  kycStatus: 'not-uploaded' | 'uploaded' | 'approved';
  totalBookings: number;
  memberSince: string;
  kycDocuments: KycDocuments | null;
}

interface Documents {
  aadharFront: string | null;
  aadharBack: string | null;
  panFront: string | null;
  panBack: string | null;
}

const SAMPLE_USER: UserProfile = {
  name: 'Akshita Reddy',
  email: 'akshita@example.com',
  phone: '+91 98765 43210',
  kycStatus: 'not-uploaded',
  totalBookings: 12,
  memberSince: 'January 2024',
  kycDocuments: null
};

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(SAMPLE_USER);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showKycModal, setShowKycModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'aadhar' | 'pan'>('aadhar');
  const [documents, setDocuments] = useState<Documents>({
    aadharFront: null,
    aadharBack: null,
    panFront: null,
    panBack: null,
  });
  const { colors, isDark, toggleTheme } = useTheme();

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'uploaded': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getKYCStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'VERIFIED';
      case 'uploaded': return 'PENDING';
      default: return 'NOT UPLOADED';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to photos');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (docType: keyof Documents) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select an image smaller than 3 MB');
          return;
        }
        setDocuments(prev => ({ ...prev, [docType]: asset.uri }));
        Alert.alert('Success', 'Document uploaded successfully!');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeDocument = (docType: keyof Documents) => {
    setDocuments(prev => ({ ...prev, [docType]: null }));
  };

  const isDocumentComplete = () => {
    if (selectedDocType === 'aadhar') {
      return documents.aadharFront && documents.aadharBack;
    }
    return documents.panFront && documents.panBack;
  };

  const handleSubmitKYC = () => {
    if (!isDocumentComplete()) {
      Alert.alert('Documents Required', `Please upload both sides of your ${selectedDocType === 'aadhar' ? 'Aadhar' : 'PAN'} card`);
      return;
    }

    setProfile(prev => ({
      ...prev,
      kycStatus: 'uploaded',
      kycDocuments: {
        type: selectedDocType,
        frontImage: selectedDocType === 'aadhar' ? documents.aadharFront! : documents.panFront!,
        backImage: selectedDocType === 'aadhar' ? documents.aadharBack! : documents.panBack!,
        uploadedAt: new Date().toISOString()
      }
    }));

    setShowKycModal(false);
    Alert.alert('KYC Documents Saved', 'Your documents have been saved. The farmhouse owner will verify them during booking.');
  };

  const DocumentUploadCard = ({ title, docKey, icon }: { title: string; docKey: keyof Documents; icon: string }) => (
    <View style={[styles.docCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.docHeader}>
        <View style={styles.docTitleRow}>
          <Text style={styles.docIcon}>{icon}</Text>
          <Text style={[styles.docTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {documents[docKey] && <CheckCircle size={20} color="#4CAF50" />}
      </View>

      {documents[docKey] ? (
        <View style={styles.uploadedDoc}>
          <Image source={{ uri: documents[docKey]! }} style={styles.docPreview} />
          <TouchableOpacity style={styles.removeButton} onPress={() => removeDocument(docKey)}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, { borderColor: colors.border }]}
          onPress={() => pickImage(docKey)}
        >
          <Text style={styles.uploadIcon}>📤</Text>
          <Text style={[styles.uploadText, { color: colors.placeholder }]}>Tap to upload</Text>
          <Text style={[styles.uploadSubtext, { color: colors.placeholder }]}>Max size: 3 MB</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const MenuButton = ({ title, onPress, color = colors.text }: { title: string; onPress: () => void; color?: string }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuText, { color }]}>{title}</Text>
      <Text style={[styles.menuArrow, { color: colors.placeholder }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
              <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                {(user?.displayName || profile.name).split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || profile.name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.placeholder }]}>
              {user?.email || profile.email}
            </Text>
            <Text style={[styles.userPhone, { color: colors.placeholder }]}>
              {profile.phone}
            </Text>
          </View>
        </View>

        <View style={[styles.kycStatusCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.kycStatusHeader}>
            <Text style={[styles.kycStatusTitle, { color: colors.text }]}>KYC Status</Text>
            <View style={[styles.kycBadge, { backgroundColor: getKYCStatusColor(profile.kycStatus) }]}>
              <Text style={styles.kycStatus}>{getKYCStatusText(profile.kycStatus)}</Text>
            </View>
          </View>

          {profile.kycStatus === 'uploaded' || profile.kycStatus === 'approved' ? (
            <View style={styles.kycApprovedInfo}>
              <CheckCircle size={20} color={profile.kycStatus === 'approved' ? '#4CAF50' : '#FF9800'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.kycApprovedText, { color: colors.placeholder }]}>
                  Your {profile.kycDocuments?.type.toUpperCase()} has been {profile.kycStatus === 'approved' ? 'verified' : 'uploaded'}
                </Text>
                <TouchableOpacity style={styles.kycUpdateButton} onPress={() => setShowKycModal(true)}>
                  <Text style={[styles.kycUpdateButtonText, { color: colors.buttonBackground }]}>
                    Update Documents
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.kycNotUploadedText, { color: colors.placeholder }]}>
                Upload your ID proof to enable bookings. Farmhouse owners will verify your documents.
              </Text>
              <TouchableOpacity
                style={[styles.kycButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => setShowKycModal(true)}
              >
                <Text style={[styles.kycButtonText, { color: colors.buttonText }]}>
                  Upload KYC Documents
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.buttonBackground }]}>
              {profile.totalBookings}
            </Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>Total Bookings</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.buttonBackground }]}>
              {profile.memberSince}
            </Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>Member Since</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.cardBackground }]}>
          <MenuButton title="Edit Profile" onPress={() => navigation.navigate('EditProfile', { profile })} />

          <View style={styles.menuItem}>
            <Text style={[styles.menuText, { color: colors.text }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: colors.buttonBackground }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Text>
            <Text style={[styles.menuArrow, { color: colors.placeholder }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuText, { color: '#F44336' }]}>Logout</Text>
            <Text style={[styles.menuArrow, { color: '#F44336' }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showKycModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Upload KYC Documents</Text>
              <TouchableOpacity onPress={() => setShowKycModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSubtext, { color: colors.placeholder }]}>
                Upload your identity proof (Aadhar or PAN card)
              </Text>

              <View style={styles.docTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.docTypeButton,
                    selectedDocType === 'aadhar' && { backgroundColor: colors.buttonBackground },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedDocType('aadhar')}
                >
                  <Text style={styles.docTypeIcon}>📄</Text>
                  <Text style={[
                    styles.docTypeText,
                    { color: selectedDocType === 'aadhar' ? colors.buttonText : colors.text }
                  ]}>
                    Aadhar Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.docTypeButton,
                    selectedDocType === 'pan' && { backgroundColor: colors.buttonBackground },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedDocType('pan')}
                >
                  <Text style={styles.docTypeIcon}>💳</Text>
                  <Text style={[
                    styles.docTypeText,
                    { color: selectedDocType === 'pan' ? colors.buttonText : colors.text }
                  ]}>
                    PAN Card
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedDocType === 'aadhar' ? (
                <>
                  <DocumentUploadCard title="Aadhar Card - Front" docKey="aadharFront" icon="📄" />
                  <DocumentUploadCard title="Aadhar Card - Back" docKey="aadharBack" icon="📄" />
                </>
              ) : (
                <>
                  <DocumentUploadCard title="PAN Card - Front" docKey="panFront" icon="💳" />
                  <DocumentUploadCard title="PAN Card - Back" docKey="panBack" icon="💳" />
                </>
              )}

              <Text style={[styles.securityNote, { color: colors.placeholder }]}>
                🔒 Your documents are encrypted and securely stored
              </Text>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: isDocumentComplete() ? colors.buttonBackground : colors.border }
                ]}
                onPress={handleSubmitKYC}
                disabled={!isDocumentComplete()}
              >
                <Text style={[
                  styles.submitButtonText,
                  { color: isDocumentComplete() ? colors.buttonText : colors.placeholder }
                ]}>
                  Submit for Verification
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  profileCard: { margin: 20, marginTop: 0, borderRadius: 15, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold' },
  userInfo: { alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  userEmail: { fontSize: 14, marginBottom: 3 },
  userPhone: { fontSize: 14, marginBottom: 10 },
  kycStatusCard: { margin: 20, marginTop: 0, borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  kycStatusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kycStatusTitle: { fontSize: 16, fontWeight: '600' },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  kycStatus: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  kycApprovedInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  kycApprovedText: { fontSize: 13 },
  kycUpdateButton: { marginTop: 8 },
  kycUpdateButtonText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  kycNotUploadedText: { fontSize: 13, marginBottom: 12 },
  kycButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  kycButtonText: { fontSize: 14, fontWeight: '600' },
  statsCard: { margin: 20, marginTop: 0, borderRadius: 15, padding: 20, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  statLabel: { fontSize: 14, textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 20 },
  menuCard: { margin: 20, marginTop: 0, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { fontSize: 16, fontWeight: '500' },
  menuArrow: { fontSize: 20, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubtext: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  docTypeSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  docTypeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  docTypeIcon: { fontSize: 18 },
  docTypeText: { fontSize: 14, fontWeight: '600' },
  docCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docIcon: { fontSize: 20 },
  docTitle: { fontSize: 14, fontWeight: '600' },
  uploadButton: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center', gap: 8 },
  uploadIcon: { fontSize: 24 },
  uploadText: { fontSize: 14, fontWeight: '500' },
  uploadSubtext: { fontSize: 12 },
  uploadedDoc: { position: 'relative' },
  docPreview: { width: '100%', height: 150, borderRadius: 8 },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', borderRadius: 16, padding: 6 },
  securityNote: { fontSize: 12, marginTop: 12, marginBottom: 16, lineHeight: 18, textAlign: 'center' },
  submitButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  submitButtonText: { fontSize: 16, fontWeight: '600' },
});