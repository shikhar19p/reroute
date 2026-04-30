import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';

interface AnimatedImageProps {
  uri: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
}

export default function AnimatedImage({ uri, style, resizeMode = 'cover', priority = 'normal' }: AnimatedImageProps) {
  const { isDark } = useTheme();
  const placeholderBg = isDark ? '#1e1e1e' : '#e8e4dc';

  if (!uri) {
    return <View style={[styles.container, style, { backgroundColor: placeholderBg, opacity: 0.5 }]} />;
  }

  return (
    <View style={[styles.container, style, { backgroundColor: placeholderBg }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit={resizeMode}
        transition={200}
        cachePolicy="memory-disk"
        priority={priority}
        recyclingKey={uri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
