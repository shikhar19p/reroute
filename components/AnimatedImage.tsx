import React, { useRef, useEffect } from 'react';
import { Animated, Image, ImageStyle, StyleProp } from 'react-native';

interface AnimatedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function AnimatedImage({ uri, style, resizeMode = 'cover' }: AnimatedImageProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    opacity.setValue(0);
  }, [uri]);

  return (
    <Animated.Image
      source={{ uri }}
      style={[style, { opacity }]}
      resizeMode={resizeMode}
      onLoad={onLoad}
    />
  );
}
