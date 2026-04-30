import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { captureException, addBreadcrumb } from '../utils/sentryUtils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  isRecoverable: boolean;
}

// Errors that don't need error boundary recovery
const RECOVERABLE_ERRORS = [
  'Non-Error promise rejection detected',
  'Network request failed',
  'Firebase: Error (auth/',
];

const FATAL_ERRORS = [
  'Maximum call stack size exceeded',
  'Cannot read properties of null',
  'Cannot read properties of undefined',
];

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      isRecoverable: true,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error?.message || '';
    const isFatal = FATAL_ERRORS.some(msg => errorMessage.includes(msg));
    const isRecoverable = !isFatal;
    const errorCount = this.state.errorCount + 1;

    this.setState({ errorInfo, errorCount, isRecoverable });

    // Add breadcrumb for error boundary catch
    addBreadcrumb('Error caught by ErrorBoundary', {
      message: errorMessage,
      isFatal,
      errorCount,
      componentStack: errorInfo.componentStack,
    }, isFatal ? 'fatal' : 'error');

    // Capture exception with enhanced context
    captureException(error, {
      level: isFatal ? 'fatal' : 'error',
      operation: 'ErrorBoundary',
      tags: {
        'error_boundary': 'true',
        'recoverable': isRecoverable.toString(),
        'error_count': errorCount.toString(),
        'error_type': isFatal ? 'fatal' : 'recoverable',
      },
      context: {
        message: errorMessage,
        isFatal,
        errorCount,
        componentStack: errorInfo.componentStack.substring(0, 500),
        recovered: false,
      },
    });

    if (__DEV__) {
      console.error('ErrorBoundary caught error:', {
        message: errorMessage,
        isFatal,
        errorCount,
        stack: error?.stack,
      });
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRestart = () => {
    if (this.props.fallback) {
      this.handleReset();
    } else {
      // Hard restart for critical errors
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  render() {
    const { hasError, error, errorInfo, isRecoverable, errorCount } = this.state;

    if (hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const shouldShowDetails = __DEV__ && errorCount < 3;
      const errorTitle = isRecoverable
        ? 'Something went wrong'
        : 'Critical error - please restart';

      return (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={[styles.indicator, !isRecoverable && styles.indicatorFatal]} />
              <Text style={styles.title}>{errorTitle}</Text>

              <Text style={styles.subtitle}>
                {isRecoverable
                  ? 'This has been reported. Try again or restart the app.'
                  : 'A critical error occurred. Please restart the app.'}
              </Text>

              {shouldShowDetails && error && (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsTitle}>Error Details:</Text>
                  <Text style={styles.detailsText}>{error.message}</Text>
                  {errorCount > 1 && (
                    <Text style={styles.errorCountText}>
                      (Error occurred {errorCount} times)
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.buttonContainer}>
                {isRecoverable && (
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={this.handleReset}
                  >
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, !isRecoverable && styles.dangerButton]}
                  onPress={this.handleRestart}
                >
                  <Text style={styles.buttonText}>
                    {!isRecoverable ? 'Restart App' : 'Restart'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'flex-start',
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    justifyContent: 'center',
    minHeight: '100%',
  },
  indicator: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginBottom: 20,
  },
  indicatorFatal: {
    backgroundColor: '#7F1D1D',
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
    marginBottom: 24,
  },
  detailsBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  errorCountText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#111827',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
