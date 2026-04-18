import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
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
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const TYPE_BORDER: Record<ToastType, string> = {
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3200) => {
    const id = Date.now().toString();
    // Keep at most 3 toasts stacked
    setToasts(prev => [...prev.slice(-2), { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} index={index} onDismiss={() => dismiss(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, index, onDismiss }: { toast: ToastMessage; index: number; onDismiss: () => void }) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-72)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const exitAt = (toast.duration || 3200) - 300;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -72, duration: 260, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }, exitAt);

    return () => clearTimeout(timer);
  }, []);

  const borderColor = TYPE_BORDER[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.cardBackground,
          borderLeftColor: borderColor,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          top: index * 66,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: borderColor }]} />
      <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <X size={14} color={colors.placeholder} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    position: 'absolute',
    width: width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 14,
    paddingLeft: 16,
    borderRadius: 10,
    borderLeftWidth: 3,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
