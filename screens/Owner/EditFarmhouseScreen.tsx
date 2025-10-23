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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2, Plus, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Farmhouse } from '../../services/farmhouseService';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useDialog } from '../../components/CustomDialog';

type RootStackParamList = {
  MyFarmhouses: undefined;
  FarmhouseDetailOwner: { farmhouseId: string };
  EditFarmhouse: { farmhouse: Farmhouse };
};

type Props = NativeStackScreenProps<RootStackParamList, 'EditFarmhouse'>;

export default function EditFarmhouseScreen({ route, navigation }: Props) {
  const { farmhouse } = route.params;
  const { colors, isDark } = useTheme();
  const { showDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const rawData = farmhouse as any;

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
    customPricing: farmhouse.customPricing || [],
    tv: farmhouse.amenities?.tv?.toString() || '0',
    geyser: farmhouse.amenities?.geyser?.toString() || '0',
    bonfire: farmhouse.amenities?.bonfire?.toString() || '0',
    chess: farmhouse.amenities?.chess?.toString() || '0',
    carroms: farmhouse.amenities?.carroms?.toString() || '0',
    volleyball: farmhouse.amenities?.volleyball?.toString() || '0',
    pool: farmhouse.amenities?.pool || false,
    additionalAmenities: rawData.amenities?.additionalAmenities || '',
    unmarriedNotAllowed: !farmhouse.rules?.unmarriedCouples,
    petsNotAllowed: !farmhouse.rules?.pets,
    quietHours: farmhouse.rules?.quietHours || false,
    additionalRules: rawData.rules?.additionalRules || '',
    accountHolderName: rawData.kyc?.bankDetails?.accountHolderName || '',
    accountNumber: rawData.kyc?.bankDetails?.accountNumber || '',
    ifscCode: rawData.kyc?.bankDetails?.ifscCode || '',
    branchName: rawData.kyc?.bankDetails?.branchName || '',
    photos: farmhouse.photos || [],
  });

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
    updateField('customPricing', formData.customPricing.filter((_, i) => i !== index));
  };

  const pickImageFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showDialog({
          title: 'Permission required',
          message: 'Please allow photo library access to pick images.',
          type: 'warning'
        });
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
      console.error('Error picking image:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to upload images',
        type: 'error'
      });
      setUploadingImage(false);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showDialog({
          title: 'Permission required',
          message: 'Please allow camera access to take photos.',
          type: 'warning'
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
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
      console.error('Error taking photo:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to capture image',
        type: 'error'
      });
      setUploadingImage(false);
    }
  };

  const choosePhotoSource = async () => {
    showDialog({
      title: 'Add Photo',
      message: 'Choose source',
      type: 'confirm',
      buttons: [
        { text: 'Camera', style: 'default', onPress: takePhotoWithCamera },
        { text: 'Photo Library', style: 'default', onPress: pickImageFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    });
  };

  const deleteImage = async (index: number) => {
    showDialog({
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image?',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newPhotos = formData.photos.filter((_, i) => i !== index);
            updateField('photos', newPhotos);
          },
        },
      ]
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showDialog({
        title: 'Validation Error',
        message: 'Farmhouse name is required',
        type: 'error'
      });
      return false;
    }
    if (!formData.description.trim()) {
      showDialog({
        title: 'Validation Error',
        message: 'Description is required',
        type: 'error'
      });
      return false;
    }
    if (!formData.city.trim() || !formData.area.trim()) {
      showDialog({
        title: 'Validation Error',
        message: 'Location details are required',
        type: 'error'
      });
      return false;
    }
    if (parseInt(formData.bedrooms) <= 0) {
      showDialog({
        title: 'Validation Error',
        message: 'Number of bedrooms must be greater than 0',
        type: 'error'
      });
      return false;
    }
    if (parseInt(formData.capacity) <= 0) {
      showDialog({
        title: 'Validation Error',
        message: 'Capacity must be greater than 0',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const farmhouseRef = doc(db, 'farmhouses', farmhouse.id);

      const updateData = {
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
        'pricing.customPricing': formData.customPricing.map(cp => ({ name: cp.label, price: cp.price })),
        'amenities.tv': parseInt(formData.tv),
        'amenities.geyser': parseInt(formData.geyser),
        'amenities.bonfire': parseInt(formData.bonfire),
        'amenities.chess': parseInt(formData.chess),
        'amenities.carroms': parseInt(formData.carroms),
        'amenities.volleyball': parseInt(formData.volleyball),
        'amenities.pool': formData.pool,
        'amenities.additionalAmenities': formData.additionalAmenities.trim(),
        'rules.unmarriedNotAllowed': formData.unmarriedNotAllowed,
        'rules.petsNotAllowed': formData.petsNotAllowed,
        'rules.quietHours': formData.quietHours,
        'rules.additionalRules': formData.additionalRules.trim(),
        'kyc.bankDetails.accountHolderName': formData.accountHolderName.trim(),
        'kyc.bankDetails.accountNumber': formData.accountNumber.trim(),
        'kyc.bankDetails.ifscCode': formData.ifscCode.trim().toUpperCase(),
        'kyc.bankDetails.branchName': formData.branchName.trim(),
        photoUrls: formData.photos,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(farmhouseRef, updateData);

      showDialog({
        title: 'Success',
        message: 'Farmhouse details updated successfully',
        type: 'success',
        buttons: [
          { text: 'OK', style: 'default', onPress: () => navigation.goBack() }
        ]
      });
    } catch (error) {
      console.error('Error updating farmhouse:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to update farmhouse. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Farmhouse</Text>
            <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
              Update your farmhouse details
            </Text>
          </View>

          {/* Images Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Farmhouse Images</Text>
            <View style={styles.imagesGrid}>
              {formData.photos.map((photo, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: photo }} style={styles.uploadedImage} />
                  <TouchableOpacity
                    style={styles.deleteImageButton}
                    onPress={() => deleteImage(index)}
                  >
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

          {/* Basic Details Section */}
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

          {/* Pricing Section */}
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

            {/* Custom Pricing */}
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

            {formData.customPricing.map((custom, index) => (
              <View key={index} style={[styles.customPriceItem, { borderColor: colors.border }]}>
                <View style={styles.customPriceInputs}>
                  <TextInput
                    style={[styles.customPriceNameInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                    value={custom.label}
                    onChangeText={(text) => updateCustomPrice(index, 'label', text)}
                    placeholder="Occasion name"
                    placeholderTextColor={colors.placeholder}
                  />
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

          {/* Amenities Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>TVs</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.tv}
                  onChangeText={(text) => updateField('tv', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Geysers</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.geyser}
                  onChangeText={(text) => updateField('geyser', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Bonfire</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.bonfire}
                  onChangeText={(text) => updateField('bonfire', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Chess</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.chess}
                  onChangeText={(text) => updateField('chess', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Carroms</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.carroms}
                  onChangeText={(text) => updateField('carroms', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Volleyball</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.volleyball}
                  onChangeText={(text) => updateField('volleyball', text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Swimming Pool</Text>
              <Switch
                value={formData.pool}
                onValueChange={(value) => updateField('pool', value)}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Additional Amenities</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.additionalAmenities}
                onChangeText={(text) => updateField('additionalAmenities', text)}
                placeholder="List any other amenities available (WiFi, parking, etc.)"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Rules Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>House Rules</Text>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Unmarried Couples Not Allowed</Text>
              </View>
              <Switch
                value={formData.unmarriedNotAllowed}
                onValueChange={(value) => updateField('unmarriedNotAllowed', value)}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Pets Not Allowed</Text>
              </View>
              <Switch
                value={formData.petsNotAllowed}
                onValueChange={(value) => updateField('petsNotAllowed', value)}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Quiet Hours</Text>
              </View>
              <Switch
                value={formData.quietHours}
                onValueChange={(value) => updateField('quietHours', value)}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Additional Rules</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.additionalRules}
                onChangeText={(text) => updateField('additionalRules', text)}
                placeholder="List any other house rules (noise restrictions, smoking policy, etc.)"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Account Details Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Account Details</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Account Holder Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.accountHolderName}
                onChangeText={(text) => updateField('accountHolderName', text)}
                placeholder="As per bank records"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Account Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={formData.accountNumber}
                onChangeText={(text) => updateField('accountNumber', text)}
                placeholder="Enter account number"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>IFSC Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.ifscCode}
                  onChangeText={(text) => updateField('ifscCode', text.toUpperCase())}
                  placeholder="IFSC Code"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  maxLength={11}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Branch Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                  value={formData.branchName}
                  onChangeText={(text) => updateField('branchName', text)}
                  placeholder="Branch name"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
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
  customPriceNameInput: { flex: 2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  customPricePriceInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  removeButton: { padding: 10, borderRadius: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  switchLabel: { fontSize: 16, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  saveButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageContainer: { width: 100, height: 100, position: 'relative' },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 8 },
  deleteImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
  addImageButton: { width: 100, height: 100, borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addImageText: { fontSize: 12, marginTop: 4 },
});
