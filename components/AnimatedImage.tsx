import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageResizeMode, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AnimatedImageProps {
  uri: string;
  style?: any;
  resizeMode?: ImageResizeMode;
}

/**
 * Drop-in Image replacement that shows a shimmer skeleton while loading
 * then fades in the image once loaded.
 */
export default function AnimatedImage({ uri, style, resizeMode = 'cover' }: AnimatedImageProps) {
  const { isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.04)).current;

  // Shimmer loop — runs until image loads
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  // Fade + descale in once loaded
  const handleLoad = () => {
    setLoaded(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.6],
  });

  const placeholderBg = isDark ? '#1e1e1e' : '#e8e4dc';
  const shimmerColor = isDark ? '#333' : '#d4cfc6';

  return (
    <View style={[styles.container, style]}>
      {/* Shimmer skeleton — visible until image loads */}
      {!loaded && !error && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmerBase,
            { backgroundColor: placeholderBg },
          ]}
        >
          {/* Shimmer highlight stripe */}
          <Animated.View
            style={[
              styles.shimmerStripe,
              {
                backgroundColor: shimmerColor,
                opacity: shimmerOpacity,
              },
            ]}
          />
          {/* Subtle grid lines to hint at a map/photo */}
          <View style={styles.shimmerLines}>
            <Animated.View style={[styles.shimmerLine, { opacity: shimmerOpacity, backgroundColor: shimmerColor }]} />
            <Animated.View style={[styles.shimmerLine, { opacity: shimmerOpacity, backgroundColor: shimmerColor, marginTop: 24 }]} />
          </View>
        </Animated.View>
      )}

      {/* Actual image — fades in from slightly zoomed */}
      <Animated.Image
        source={{ uri }}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={() => setError(true)}
      />

      {/* Error state */}
      {error && (
        <View style={[StyleSheet.absoluteFill, styles.error, { backgroundColor: placeholderBg }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  shimmerBase: {
    overflow: 'hidden',
  },
  shimmerStripe: {
    position: 'absolute',
    top: 0,
    left: '-30%',
    width: '60%',
    height: '100%',
    transform: [{ skewX: '-15deg' }],
  },
  shimmerLines: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
  },
  shimmerLine: {
    height: 2,
    borderRadius: 1,
    width: '70%',
  },
  error: {
    opacity: 0.5,
  },
});
