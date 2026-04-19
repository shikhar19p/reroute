import React, { useState } from 'react';
import { View, StyleSheet, ImageResizeMode } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';

interface AnimatedImageProps {
  uri: string;
  style?: any;
  resizeMode?: ImageResizeMode;
}

const CONTENT_FIT_MAP: Record<string, any> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'scale-down',
};

export default function AnimatedImage({ uri, style, resizeMode = 'cover' }: AnimatedImageProps) {
  const { isDark } = useTheme();
  const [error, setError] = useState(false);

  const placeholderBg = isDark ? '#1e1e1e' : '#e8e4dc';

  if (error || !uri) {
    return <View style={[styles.container, style, { backgroundColor: placeholderBg, opacity: 0.5 }]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.container, style]}
      contentFit={CONTENT_FIT_MAP[resizeMode] || 'cover'}
      transition={350}
      cachePolicy="memory-disk"
      placeholder={{ color: placeholderBg }}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
