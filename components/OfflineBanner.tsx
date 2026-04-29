import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';

export const OFFLINE_BANNER_HEIGHT = 38;

export default function OfflineBanner() {
  const { isConnected, wasOffline } = useNetwork();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(OFFLINE_BANNER_HEIGHT + insets.top))).current;
  const [visible, setVisible] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setBackOnline(false);
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      setBackOnline(true);
      const hide = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -(OFFLINE_BANNER_HEIGHT + insets.top),
          duration: 300,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 2000);
      return () => clearTimeout(hide);
    } else {
      setVisible(false);
      translateY.setValue(-(OFFLINE_BANNER_HEIGHT + insets.top));
    }
  }, [isConnected, wasOffline, insets.top]);

  if (!visible) return null;

  const bgColor = backOnline ? '#2e7d32' : '#212121';
  const label = backOnline ? 'Back online' : 'No internet connection';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top,
          height: OFFLINE_BANNER_HEIGHT,
          transform: [{ translateY }],
          backgroundColor: bgColor,
        },
        Platform.OS === 'web' && (styles.webFixed as any),
      ]}
    >
      <View style={styles.row}>
        {!backOnline && <WifiOff size={15} color="#fff" strokeWidth={2.2} />}
        <Text style={styles.text}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFixed: {
    position: 'fixed',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
