import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MapPin } from 'lucide-react-native';

interface LocationMapViewProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  style?: any;
}

export default function LocationMapView({ latitude, longitude, address, style }: LocationMapViewProps) {
  const openMaps = () => {
    if (latitude && longitude) {
      const url = `https://maps.google.com/?q=${latitude},${longitude}`;
      Linking.openURL(url);
    } else if (address) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };

  if (!latitude && !longitude && !address) return null;

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={openMaps} activeOpacity={0.8}>
      <View style={styles.inner}>
        <MapPin size={20} color="#C5A565" />
        <Text style={styles.text} numberOfLines={2}>
          {address || `${latitude}, ${longitude}`}
        </Text>
        <Text style={styles.link}>View on Maps →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  link: {
    fontSize: 13,
    color: '#C5A565',
    fontWeight: '600',
  },
});
