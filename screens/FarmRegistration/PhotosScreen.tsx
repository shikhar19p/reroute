import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFarmRegistration } from '../../context/FarmRegistrationContext';
import { useDialog } from '../../components/CustomDialog';

type RootStackParamList = {
  FarmAmenitiesGames: undefined;
};

type PhotosScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

const MAX_PHOTOS = 10;
const MAX_DIMENSION = 1600;

export default function PhotosScreen({ navigation }: PhotosScreenProps) {
  const { farm, addPhoto, removePhoto } = useFarmRegistration();
  const { showDialog } = useDialog();
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = useCallback(async (uri: string, width: number, height: number) => {
    const longestSide = Math.max(width, height);
    const actions = [];

    if (longestSide > MAX_DIMENSION) {
      if (width >= height) {
        actions.push({ resize: { width: MAX_DIMENSION } });
      } else {
        actions.push({ resize: { height: MAX_DIMENSION } });
      }
    }

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        uri: manipulated.uri,
        width: manipulated.width,
        height: manipulated.height,
        size: 0,
      };
    } catch (error) {
      console.error('Image manipulation error:', error);
      return null;
    }
  }, []);

  const handlePickImage = useCallback(async (source: 'camera' | 'library') => {
    if (isProcessing || farm.photos.length >= MAX_PHOTOS) {
      showDialog({
        title: 'Limit reached',
        message: `You can upload up to ${MAX_PHOTOS} photos.`,
        type: 'warning'
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (source === 'camera') {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          showDialog({
            title: 'Permission required',
            message: 'Please allow camera access to take photos.',
            type: 'warning'
          });
          setIsProcessing(false);
          return;
        }
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          showDialog({
            title: 'Permission required',
            message: 'Please allow photo library access to pick images.',
            type: 'warning'
          });
          setIsProcessing(false);
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
          });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const processed = await processImage(asset.uri, asset.width || 1000, asset.height || 1000);

        if (processed) {
          addPhoto(processed);
        }
      }
    } catch (error) {
      showDialog({
        title: 'Error',
        message: 'Failed to pick image',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, farm.photos.length, processImage, addPhoto, showDialog]);

  const handleAddPhoto = () => {
    showDialog({
      title: 'Add Photo',
      message: 'Choose source',
      type: 'confirm',
      buttons: [
        { text: 'Camera', style: 'default', onPress: () => handlePickImage('camera') },
        { text: 'Photo Library', style: 'default', onPress: () => handlePickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ]
    });
  };

  const handleRemovePhoto = (index: number) => {
    showDialog({
      title: 'Remove Photo',
      message: 'Are you sure you want to remove this photo?',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePhoto(index) },
      ]
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Farm Photos</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{farm.photos.length}/{MAX_PHOTOS}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Add photos to showcase your farmhouse</Text>

        <View style={styles.grid}>
          {farm.photos.map((photo, index) => (
            <View key={photo.uri} style={styles.photoTile}>
              <Image source={{ uri: photo.uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeIcon}>❌</Text>
              </TouchableOpacity>
            </View>
          ))}

          {farm.photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={styles.addTile}
              onPress={handleAddPhoto}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <View style={styles.addIconContainer}>
                <Text style={styles.imageIcon}>🖼️</Text>
              </View>
              <Text style={styles.addText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, farm.photos.length < 1 && styles.buttonDisabled]}
          onPress={() => navigation.navigate('FarmAmenitiesGames')}
          activeOpacity={0.8}
          disabled={farm.photos.length < 1}
        >
          <Text style={styles.primaryButtonText}>Next: Amenities</Text>
        </TouchableOpacity>
      </View>
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
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  counterBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 16,
  },
  addTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    fontSize: 32,
  },
  addText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
