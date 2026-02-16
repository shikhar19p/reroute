/**
 * Professional loading screen component
 * Provides consistent loading experience across the app
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  fullScreen = true,
  size = 'large' 
}: LoadingScreenProps) {
  const { colors } = useTheme();

  const containerStyle = fullScreen 
    ? styles.fullScreenContainer 
    : styles.inlineContainer;

  return (
    <View style={[containerStyle, { backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={colors.buttonBackground} />
      {message && (
        <Text style={[styles.message, { color: colors.text }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
