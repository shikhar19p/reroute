/**
 * Error state component for better error handling UX
 * Shows user-friendly error messages with retry options
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import RetryButton from './RetryButton';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  fullScreen?: boolean;
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying = false,
  fullScreen = true,
}: ErrorStateProps) {
  const { colors } = useTheme();

  const containerStyle = fullScreen 
    ? styles.fullScreenContainer 
    : styles.inlineContainer;

  return (
    <View style={[containerStyle, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
        <AlertCircle size={48} color="#EF4444" />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: colors.placeholder }]}>
        {message}
      </Text>
      
      {onRetry && (
        <RetryButton 
          onRetry={onRetry} 
          loading={retrying}
          variant="primary"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  inlineContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});
