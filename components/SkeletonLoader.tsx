/**
 * Skeleton loader for better perceived performance
 * Shows placeholder content while data is loading
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ 
  width: customWidth = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: customWidth,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function FarmhouseCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader height={200} borderRadius={12} style={styles.image} />
      <View style={styles.details}>
        <SkeletonLoader width="70%" height={20} style={styles.title} />
        <SkeletonLoader width="50%" height={16} style={styles.subtitle} />
        <View style={styles.row}>
          <SkeletonLoader width="40%" height={18} />
          <SkeletonLoader width="30%" height={18} />
        </View>
      </View>
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.row}>
        <SkeletonLoader width={80} height={80} borderRadius={12} />
        <View style={styles.bookingDetails}>
          <SkeletonLoader width="80%" height={18} style={styles.spacing} />
          <SkeletonLoader width="60%" height={16} style={styles.spacing} />
          <SkeletonLoader width="50%" height={16} />
        </View>
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      <SkeletonLoader width={100} height={100} borderRadius={50} style={styles.avatar} />
      <SkeletonLoader width="60%" height={24} style={styles.spacing} />
      <SkeletonLoader width="40%" height={18} style={styles.spacing} />
      
      <View style={styles.section}>
        <SkeletonLoader width="30%" height={20} style={styles.spacing} />
        <SkeletonLoader width="100%" height={50} borderRadius={12} style={styles.spacing} />
        <SkeletonLoader width="100%" height={50} borderRadius={12} style={styles.spacing} />
        <SkeletonLoader width="100%" height={50} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    marginBottom: 12,
  },
  details: {
    padding: 12,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  bookingDetails: {
    flex: 1,
    marginLeft: 12,
  },
  spacing: {
    marginBottom: 8,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  section: {
    width: '100%',
    marginTop: 24,
  },
});
