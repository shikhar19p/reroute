import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  index: number;
  onDismiss: () => void;
}

function ToastItem({ toast, index, onDismiss }: ToastItemProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit animation before auto-dismiss
    const exitTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, (toast.duration || 3000) - 300);

    return () => clearTimeout(exitTimeout);
  }, []);

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle size={22} color="#FFFFFF" />,
          backgroundColor: '#10B981',
          borderColor: '#059669',
        };
      case 'error':
        return {
          icon: <XCircle size={22} color="#FFFFFF" />,
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
        };
      case 'warning':
        return {
          icon: <AlertCircle size={22} color="#FFFFFF" />,
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
        };
      case 'info':
      default:
        return {
          icon: <Info size={22} color="#FFFFFF" />,
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginTop: index * 70, // Stack toasts vertically
        },
      ]}
    >
      <View style={styles.toastContent}>
        <View style={styles.iconContainer}>{config.icon}</View>
        <Text style={styles.toastMessage} numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    width: width - 32,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    flexShrink: 0,
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  closeButton: {
    flexShrink: 0,
    padding: 4,
  },
});
