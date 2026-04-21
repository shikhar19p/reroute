import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2, Plus, X, Camera, ImageIcon, Calendar } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Farmhouse } from '../../services/farmhouseService';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDialog } from '../../components/CustomDialog';
import { getFunctions, httpsCallable } from 'firebase/functions';

type RootStackParamList = {
  MyFarmhouses: undefined;
  FarmhouseDetailOwner: { farmhouseId: string };
  EditFarmhouse: { farmhouse: Farmhouse };
};

type Props = NativeStackScreenProps<RootStackParamList, 'EditFarmhouse'>;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const amenitiesGroups = [
  {
    title: 'Essentials',
    items: [
      { key: 'wifi', label: 'WiFi' },
      { key: 'ac', label: 'Air Conditioning' },
      { key: 'parking', label: 'Parking' },
      { key: 'kitchen', label: 'Kitchen' },
      { key: 'tv', label: 'TV' },
      { key: 'geyser', label: 'Geyser (Hot Water)' },
    ],
  },
  {
    title: 'Outdoors',
    items: [
      { key: 'pool', label: 'Swimming Pool' },
      { key: 'bonfire', label: 'Bonfire' },
      { key: 'bbq', label: 'BBQ / Grill' },
      { key: 'outdoorSeating', label: 'Outdoor Seating' },
      { key: 'hotTub', label: 'Hot Tub / Jacuzzi' },
    ],
  },
  {
    title: 'Entertainment',
    items: [
      { key: 'djMusicSystem', label: 'DJ / Music System' },
      { key: 'projector', label: 'Projector' },
    ],
  },
  {
    title: 'Food & Services',
    items: [
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'foodPrepOnDemand', label: 'Food Prep on Demand' },
      { key: 'decorService', label: 'Decor Service' },
    ],
  },
  {
    title: 'Games & Sports',
    items: [
      { key: 'chess', label: 'Chess' },
      { key: 'carrom', label: 'Carom Board' },
      { key: 'volleyball', label: 'Volleyball' },
      { key: 'badminton', label: 'Badminton Court' },
      { key: 'tableTennis', label: 'Table Tennis' },
      { key: 'cricket', label: 'Cricket Ground' },
    ],
  },
];

export default function EditFarmhouseScreen({ route, navigation }: Props) {
  const { farmhouse } = route.params;
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const rawData = farmhouse as any;

  // Helper to read a boolean/truthy amenity from raw firestore data
  const getAmenityBool = (key: string): boolean => {
    const val = rawData.amenities?.[key];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val > 0;
    return false;
  };

  const [formData, setFormData] = useState({
    name: farmhouse.name || '',
    description: farmhouse.description || '',
    city: farmhouse.city || '',
    area: farmhouse.area || '',
    locationText: farmhouse.location || '',
    mapLink: farmhouse.mapLink || '',
    bedrooms: farmhouse.bedrooms.toString(),
    capacity: farmhouse.capacity.toString(),
    weeklyDay: farmhouse.weeklyDay.toString(),
    weeklyNight: farmhouse.weeklyNight.toString(),
    weekendDay: farmhouse.weekendDay.toString(),
    weekendNight: farmhouse.weekendNight.toString(),
    customPricing: (farmhouse.customPricing || []).map((cp: any) => ({
      label: cp.label || '',
      price: cp.price || 0,
    })),
    // Amenities — all boolean
    wifi: getAmenityBool('wifi'),
    ac: getAmenityBool('ac'),
    parking: getAmenityBool('parking'),
    kitchen: getAmenityBool('kitchen'),
    tv: getAmenityBool('tv'),
    geyser: getAmenityBool('geyser'),
    pool: getAmenityBool('pool'),
    bonfire: getAmenityBool('bonfire'),
    bbq: getAmenityBool('bbq'),
    outdoorSeating: getAmenityBool('outdoorSeating'),
    hotTub: getAmenityBool('hotTub'),
    djMusicSystem: getAmenityBool('djMusicSystem'),
    projector: getAmenityBool('projector'),
    restaurant: getAmenityBool('restaurant'),
    foodPrepOnDemand: getAmenityBool('foodPrepOnDemand'),
    decorService: getAmenityBool('decorService'),
    chess: getAmenityBool('chess'),
    carrom: getAmenityBool('carrom') || getAmenityBool('carroms'),
    volleyball: getAmenityBool('volleyball'),
    badminton: getAmenityBool('badminton'),
    tableTennis: getAmenityBool('tableTennis'),
    cricket: getAmenityBool('cricket'),
    additionalAmenities: rawData.amenities?.additionalAmenities || rawData.amenities?.customAmenities || '',
    // Rules
    petsNotAllowed: farmhouse.rules?.pets === false,
    additionalRules: rawData.rules?.additionalRules || rawData.rules?.customRules || '',
    photos: farmhouse.photos || [],
    // Booking window
    bookingWindowDays: (farmhouse.bookingWindowDays ?? 21).toString(),
  });

  const [bankDisplay, setBankDisplay] = React.useState({
    accountHolderName: rawData.kyc?.bankDetails?.accountHolderName || '',
    accountNumber: '',
    ifscCode: '',
    branchName: rawData.kyc?.bankDetails?.branchName || '',
    loaded: false,
    failed: false,
  });

  React.useEffect(() => {
    const getBankDetailsFn = httpsCallable(getFunctions(), 'getBankDetails');
    getBankDetailsFn({ farmhouseId: farmhouse.id })
      .then((result: any) => {
        const bd = result.data?.bankDetails;
        setBankDisplay({
          accountHolderName: bd?.accountHolderName || rawData.kyc?.bankDetails?.accountHolderName || '',
          accountNumber: bd?.accountNumber || '',
          ifscCode: bd?.ifscCode || '',
          branchName: bd?.branchName || rawData.kyc?.bankDetails?.branchName || '',
          loaded: true,
          failed: false,
        });
      })
      .catch(() => {
        setBankDisplay(prev => ({ ...prev, loaded: true, failed: true }));
      });
  }, [farmhouse.id]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addCustomPrice = () => {
    setFormData((prev) => ({
      ...prev,
      customPricing: [...prev.customPricing, { label: '', price: 0 }],
    }));
  };

  const updateCustomPrice = (index: number, field: 'label' | 'price', value: any) => {
    const newCustom = [...formData.customPricing];
    newCustom[index] = { ...newCustom[index], [field]: field === 'price' ? parseInt(value) || 0 : value };
    updateField('customPricing', newCustom);
  };

  const removeCustomPrice = (index: number) => {
    updateField('customPricing', formData.customPricing.filter((_: any, i: number) => i !== index));
  };

  const openDatePicker = (index: number) => {
    setViewDate(new Date());
    setDatePickerIndex(index);
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = `${day} ${MONTH_SHORT[selected.getMonth()]} ${selected.getFullYear()}`;
    if (datePickerIndex !== null) {
      updateCustomPrice(datePickerIndex, 'label', formatted);
    }
    setDatePickerIndex(null);
  };

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

  const pickImageFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showDialog({ title: 'Permission required', message: 'Please allow photo library access.', type: 'warning' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        setUploadingImage(true);
        const newUrls: string[] = [];
        for (const asset of result.assets) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const filename = `farmhouses/${farmhouse.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
          newUrls.push(url);
        }
        updateField('photos', [...formData.photos, ...newUrls]);
        setUploadingImage(false);
      }
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to upload images', type: 'error' });
      setUploadingImage(false);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showDialog({ title: 'Permission required', message: 'Please allow camera access.', type: 'warning' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.length) {
        setUploadingImage(true);
        const newUrls: string[] = [];
        for (const asset of result.assets) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const filename = `farmhouses/${farmhouse.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
          newUrls.push(url);
        }
        updateField('photos', [...formData.photos, ...newUrls]);
        setUploadingImage(false);
      }
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to capture image', type: 'error' });
      setUploadingImage(false);
    }
  };

  const choosePhotoSource = () => {
    showDialog({
      title: 'Add Photo',
      message: 'Choose a source to upload your photo',
      type: 'confirm',
      buttons: [
        { text: 'Camera', style: 'default', icon: Camera, onPress: takePhotoWithCamera },
        { text: 'Gallery', style: 'default', icon: ImageIcon, onPress: pickImageFromLibrary },
        { text: 'Cancel', style: 'cancel', icon: X },
      ],
    });
  };

  const deleteImage = (index: number) => {
    showDialog({
      title: 'Delete Image',
      message: 'This image will be removed.',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            updateField('photos', formData.photos.filter((_: any, i: number) => i !== index));
          },
        },
      ],
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showDialog({ title: 'Validation Error', message: 'Farmhouse name is required', type: 'error' });
      return false;
    }
    if (!formData.description.trim()) {
      showDialog({ title: 'Validation Error', message: 'Description is required', type: 'error' });
      return false;
    }
    if (!formData.city.trim() || !formData.area.trim()) {
      showDialog({ title: 'Validation Error', message: 'Location details are required', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const farmhouseRef = doc(db, 'farmhouses', farmhouse.id);

      const updateData: Record<string, any> = {
        'basicDetails.name': formData.name.trim(),
        'basicDetails.description': formData.description.trim(),
        'basicDetails.city': formData.city.trim(),
        'basicDetails.area': formData.area.trim(),
        'basicDetails.locationText': formData.locationText.trim(),
        'basicDetails.mapLink': formData.mapLink.trim(),
        'basicDetails.bedrooms': formData.bedrooms,
        'basicDetails.capacity': formData.capacity,
        'pricing.weeklyDay': formData.weeklyDay,
        'pricing.weeklyNight': formData.weeklyNight,
        'pricing.weekendDay': formData.weekendDay,
        'pricing.weekendNight': formData.weekendNight,
        'pricing.customPricing': formData.customPricing.map((cp: any) => ({ name: cp.label, price: cp.price })),
        // Amenities
        'amenities.wifi': formData.wifi,
        'amenities.ac': formData.ac,
        'amenities.parking': formData.parking,
        'amenities.kitchen': formData.kitchen,
        'amenities.tv': formData.tv ? 1 : 0,
        'amenities.geyser': formData.geyser ? 1 : 0,
        'amenities.pool': formData.pool,
        'amenities.bonfire': formData.bonfire ? 1 : 0,
        'amenities.bbq': formData.bbq,
        'amenities.outdoorSeating': formData.outdoorSeating,
        'amenities.hotTub': formData.hotTub,
        'amenities.djMusicSystem': formData.djMusicSystem,
        'amenities.projector': formData.projector,
        'amenities.restaurant': formData.restaurant,
        'amenities.foodPrepOnDemand': formData.foodPrepOnDemand,
        'amenities.decorService': formData.decorService,
        'amenities.chess': formData.chess ? 1 : 0,
        'amenities.carroms': formData.carrom ? 1 : 0,
        'amenities.volleyball': formData.volleyball ? 1 : 0,
        'amenities.badminton': formData.badminton,
        'amenities.tableTennis': formData.tableTennis,
        'amenities.cricket': formData.cricket,
        'amenities.additionalAmenities': formData.additionalAmenities.trim(),
        // Rules
        'rules.petsNotAllowed': formData.petsNotAllowed,
        'rules.additionalRules': formData.additionalRules.trim(),
        photoUrls: formData.photos,
        bookingWindowDays: Math.max(1, Math.min(365, parseInt(formData.bookingWindowDays) || 21)),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(farmhouseRef, updateData);

      showDialog({
        title: 'Success',
        message: 'Farmhouse details updated successfully',
        type: 'success',
        buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error('Error updating farmhouse:', error);
      showDialog({ title: 'Error', message: 'Failed to update farmhouse. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Date Picker Modal */}
      <Modal
        visible={datePickerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDatePickerIndex(null)}>
          <Pressable style={styles.calendarModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setDatePickerIndex(null)}>
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            {renderCalendar()}
          </Pressable>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Farmhouse</Text>
            <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>Update your farmhouse details</Text>
          </View>

          {/* Images Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Farmhouse Images</Text>
            <View style={styles.imagesGrid}>
              {formData.photos.map((photo: string, index: number) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: photo }} style={styles.uploadedImage} />
                  <TouchableOpacity style={styles.deleteImageButton} onPress={() => deleteImage(index)}>
                    <X size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {formData.photos.length < 10 && (
                <TouchableOpacity
                  style={[styles.addImageButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                  onPress={choosePhotoSource}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={colors.buttonBackground} />
                  ) : (
                    <>
                      <Plus size={32} color={colors.buttonBackground} />
                      <Text style={[styles.addImageText, { color: colors.placeholder }]}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Basic Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Details</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Farmhouse Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                placeholder="Enter farmhouse name"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
                placeholder="Describe your farmhouse"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>City *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.city}
                  onChangeText={(text) => updateField('city', text)}
                  placeholder="City"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Area *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.area}
                  onChangeText={(text) => updateField('area', text)}
                  placeholder="Area"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Address / Landmark *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.locationText}
                onChangeText={(text) => updateField('locationText', text)}
                placeholder="Full address or landmark"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Google Maps Link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.mapLink}
                onChangeText={(text) => updateField('mapLink', text)}
                placeholder="https://maps.google.com/..."
                placeholderTextColor={colors.placeholder}
                keyboardType="url"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Bedrooms *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.bedrooms}
                  onChangeText={(text) => updateField('bedrooms', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Capacity *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.capacity}
                  onChangeText={(text) => updateField('capacity', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>

            <Text style={[styles.priceCategory, { color: colors.text }]}>Weekday Rates</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Day Use *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.weeklyDay}
                  onChangeText={(text) => updateField('weeklyDay', text.replace(/[^0-9]/g, ''))}
                  placeholder="₹0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Night Stay *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.weeklyNight}
                  onChangeText={(text) => updateField('weeklyNight', text.replace(/[^0-9]/g, ''))}
                  placeholder="₹0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={[styles.priceCategory, { color: colors.text }]}>Weekend Rates</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Day Use *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.weekendDay}
                  onChangeText={(text) => updateField('weekendDay', text.replace(/[^0-9]/g, ''))}
                  placeholder="₹0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Night Stay *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.weekendNight}
                  onChangeText={(text) => updateField('weekendNight', text.replace(/[^0-9]/g, ''))}
                  placeholder="₹0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Special / Custom Pricing */}
            <View style={styles.customPricingHeader}>
              <Text style={[styles.priceCategory, { color: colors.text }]}>Special Occasions</Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
                onPress={addCustomPrice}
              >
                <Plus size={16} color={colors.buttonText} />
                <Text style={[styles.addButtonText, { color: colors.buttonText }]}>Add</Text>
              </TouchableOpacity>
            </View>

            {formData.customPricing.map((custom: any, index: number) => (
              <View key={index} style={[styles.customPriceItem, { borderColor: colors.border }]}>
                <View style={styles.customPriceInputs}>
                  {/* Tap to open date picker */}
                  <TouchableOpacity
                    style={[styles.dateTouchable, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => openDatePicker(index)}
                    activeOpacity={0.7}
                  >
                    <Calendar size={14} color={custom.label ? colors.text : colors.placeholder} />
                    <Text style={[styles.dateTouchableText, { color: custom.label ? colors.text : colors.placeholder }]}>
                      {custom.label || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.customPricePriceInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                    value={custom.price.toString()}
                    onChangeText={(text) => updateCustomPrice(index, 'price', text.replace(/[^0-9]/g, ''))}
                    placeholder="₹0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => removeCustomPrice(index)}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Booking Window */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Window</Text>
            <Text style={[styles.fieldLabel, { color: colors.placeholder, marginBottom: 8 }]}>
              How many days ahead can guests book? (1–365)
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.bookingWindowDays}
                onChangeText={(text) => updateField('bookingWindowDays', text.replace(/[^0-9]/g, ''))}
                placeholder="21"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.inputSuffix, { color: colors.placeholder }]}>days</Text>
            </View>
            <Text style={[styles.fieldHint, { color: colors.placeholder }]}>
              Currently: guests can book up to {Math.max(1, Math.min(365, parseInt(formData.bookingWindowDays) || 21))} days from today
            </Text>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>

            {amenitiesGroups.map((group) => (
              <View key={group.title} style={styles.amenityGroup}>
                <Text style={[styles.amenityGroupTitle, { color: colors.placeholder }]}>{group.title}</Text>
                {group.items.map((item) => (
                  <View key={item.key} style={[styles.switchRow, { borderColor: colors.border }]}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>{item.label}</Text>
                    <Switch
                      value={(formData as any)[item.key] || false}
                      onValueChange={(value) => updateField(item.key, value)}
                      trackColor={{ false: colors.border, true: colors.buttonBackground }}
                      thumbColor={(formData as any)[item.key] ? '#FFFFFF' : '#F5F5F5'}
                    />
                  </View>
                ))}
              </View>
            ))}

            <View style={[styles.inputGroup, { marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Additional Amenities</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.additionalAmenities}
                onChangeText={(text) => updateField('additionalAmenities', text)}
                placeholder="List any other amenities (e.g., game room, swing set...)"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* House Rules */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>House Rules</Text>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Pets Not Allowed</Text>
              <Switch
                value={formData.petsNotAllowed}
                onValueChange={(value) => updateField('petsNotAllowed', value)}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor={formData.petsNotAllowed ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Additional Rules</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.additionalRules}
                onChangeText={(text) => updateField('additionalRules', text)}
                placeholder="List any other house rules..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Bank Account Details — read-only */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Account Details</Text>
            <Text style={[styles.bankNote, { color: colors.placeholder }]}>
              Bank details cannot be changed after registration. Contact support to update.
            </Text>

            {!bankDisplay.loaded ? (
              <ActivityIndicator color={colors.buttonBackground} style={{ marginVertical: 12 }} />
            ) : bankDisplay.failed ? (
              <Text style={[styles.bankNote, { color: '#EF4444' }]}>
                Could not load bank details. Please check your connection.
              </Text>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Account Holder Name</Text>
                  <View style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>{bankDisplay.accountHolderName || '—'}</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Account Number</Text>
                  <View style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>
                      {bankDisplay.accountNumber ? `••••${bankDisplay.accountNumber.slice(-4)}` : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>IFSC Code</Text>
                    <View style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>{bankDisplay.ifscCode || '—'}</Text>
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>Branch Name</Text>
                    <View style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>{bankDisplay.branchName || '—'}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.buttonBackground, opacity: loading ? 0.6 : 1 }]}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  headerSection: { paddingVertical: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  textArea: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  priceCategory: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  customPricingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addButtonText: { fontSize: 14, fontWeight: '600' },
  customPriceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  customPriceInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  dateTouchable: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dateTouchableText: { fontSize: 14, flex: 1 },
  customPricePriceInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  removeButton: { padding: 10, borderRadius: 8 },
  amenityGroup: { marginBottom: 8 },
  amenityGroupTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  switchLabel: { fontSize: 16, fontWeight: '500' },
  bankNote: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  fieldHint: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 4 },
  inputSuffix: { fontSize: 14, marginLeft: 8 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  saveButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageContainer: { width: 100, height: 100, position: 'relative' },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 8 },
  deleteImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
  addImageButton: { width: 100, height: 100, borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addImageText: { fontSize: 12, marginTop: 4 },
  // Calendar
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarModal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 360 },
  calendarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarModalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calNav: { padding: 8 },
  calNavText: { fontSize: 22, color: '#4CAF50', fontWeight: '700' },
  calMonthText: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  calDayNames: { flexDirection: 'row', marginBottom: 8 },
  calDayName: { flex: 1, textAlign: 'center', fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calDay: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  calDayText: { fontSize: 14, color: '#374151' },
});
