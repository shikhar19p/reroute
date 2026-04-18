import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, StyleSheet as RN,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

type DialogType = 'success' | 'error' | 'warning' | 'confirm';

interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface DialogConfig {
  title: string;
  message: string;
  type?: DialogType;
  buttons?: DialogButton[];
}

interface DialogContextType {
  showDialog: (config: DialogConfig) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}

// Color of the action button text based on type
const ACTION_COLOR: Record<string, string> = {
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  confirm: '', // falls back to brand primary
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const showDialog = useCallback((dialogConfig: DialogConfig) => {
    setConfig(dialogConfig);
    scaleAnim.setValue(0.92);
    overlayAnim.setValue(0);
    setVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 14, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, overlayAnim]);

  const hideDialog = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 140, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setTimeout(() => setConfig(null), 50);
    });
  }, [scaleAnim, overlayAnim]);

  const handleButtonPress = (button: DialogButton) => {
    if (button.onPress) button.onPress();
    hideDialog();
  };

  if (!config) return <DialogContext.Provider value={{ showDialog, hideDialog }}>{children}</DialogContext.Provider>;

  const buttons = config.buttons || [{ text: 'OK', style: 'default' as const }];
  const isSingle = buttons.length === 1;
  const typeActionColor = config.type ? ACTION_COLOR[config.type] : '';

  const getButtonTextColor = (btn: DialogButton) => {
    if (btn.style === 'cancel') return colors.placeholder;
    if (btn.style === 'destructive') return '#EF4444';
    // default — use type color if available, else brand primary
    return typeActionColor || colors.buttonBackground;
  };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={hideDialog}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={hideDialog} />

          <Animated.View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Text area */}
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
              <Text style={[styles.message, { color: colors.placeholder }]}>{config.message}</Text>
            </View>

            {/* Divider */}
            <View style={[styles.dividerH, { backgroundColor: colors.border }]} />

            {/* Buttons */}
            {isSingle ? (
              <TouchableOpacity
                style={styles.singleBtn}
                onPress={() => handleButtonPress(buttons[0])}
              >
                <Text style={[styles.singleBtnText, { color: getButtonTextColor(buttons[0]) }]}>
                  {buttons[0].text}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonRow}>
                {buttons.map((btn, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
                    )}
                    <TouchableOpacity
                      style={styles.multiBtn}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.multiBtnText,
                          { color: getButtonTextColor(btn) },
                          btn.style === 'cancel' && styles.cancelWeight,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 40,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  dividerH: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  dividerV: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  singleBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    height: 46,
  },
  multiBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelWeight: {
    fontWeight: '400',
  },
});
