/**
 * Retry button component for error states
 * Provides consistent retry UX across the app
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export default function RetryButton({ 
  onRetry, 
  loading = false, 
  label = 'Try Again',
  variant = 'primary' 
}: RetryButtonProps) {
  const { colors } = useTheme();

  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? colors.buttonBackground : 'transparent';
  const textColor = isPrimary ? colors.buttonText : colors.buttonBackground;
  const borderColor = isPrimary ? 'transparent' : colors.buttonBackground;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor, 
          borderColor,
          borderWidth: isPrimary ? 0 : 2,
        },
      ]}
      onPress={onRetry}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          <RefreshCw size={20} color={textColor} style={styles.icon} />
          <Text style={[styles.text, { color: textColor }]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
