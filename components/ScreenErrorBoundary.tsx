import React, { ComponentType } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ErrorBoundary from './ErrorBoundary';
import { trackUserAction, addBreadcrumb } from '../utils/sentryUtils';

interface ScreenErrorBoundaryProps {
  screenName: string;
}

function ScreenErrorFallback({ screenName }: { screenName: string }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.indicator} />
        <Text style={styles.title}>Unable to load {screenName}</Text>
        <Text style={styles.subtitle}>
          There was a problem loading this screen. Please try again.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function withScreenErrorBoundary<P extends object>(
  ScreenComponent: ComponentType<P>,
  screenName: string
): ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary
      fallback={<ScreenErrorFallback screenName={screenName} />}
      onError={(error) => {
        addBreadcrumb(`Screen error: ${screenName}`, {
          screenName,
          errorMessage: error.message,
        }, 'error');
        console.error(`Error in ${screenName}:`, error);
      }}
    >
      <ScreenComponent {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withScreenErrorBoundary(${screenName})`;
  return Wrapped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'flex-start',
    maxWidth: 360,
    width: '100%',
  },
  indicator: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
