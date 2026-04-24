import React, { useState } from 'react';
import { View, Image, StyleSheet, ImageResizeMode } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AnimatedImageProps {
  uri: string;
  style?: any;
  resizeMode?: ImageResizeMode;
}

export default function AnimatedImage({ uri, style, resizeMode = 'cover' }: AnimatedImageProps) {
  const { isDark } = useTheme();
  const [error, setError] = useState(false);

  const placeholderBg = isDark ? '#1e1e1e' : '#e8e4dc';

  if (error || !uri) {
    return <View style={[styles.container, style, { backgroundColor: placeholderBg, opacity: 0.5 }]} />;
  }

  return (
    <View style={[styles.container, style, { backgroundColor: placeholderBg }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onError={() => setError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
