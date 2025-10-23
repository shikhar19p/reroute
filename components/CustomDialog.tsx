import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { AlertCircle, CheckCircle, X, AlertTriangle } from 'lucide-react-native';
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
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const { colors, isDark } = useTheme();

  const showDialog = useCallback((dialogConfig: DialogConfig) => {
    setConfig(dialogConfig);
    setVisible(true);
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
    setTimeout(() => setConfig(null), 300);
  }, []);

  const handleButtonPress = (button: DialogButton) => {
    if (button.onPress) {
      button.onPress();
    }
    hideDialog();
  };

  const getIcon = () => {
    switch (config?.type) {
      case 'success':
        return <CheckCircle size={48} color="#10B981" />;
      case 'error':
        return <AlertCircle size={48} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={48} color="#F59E0B" />;
      default:
        return <AlertCircle size={48} color={colors.primary} />;
    }
  };

  const buttons = config?.buttons || [{ text: 'OK', style: 'default' as const }];

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      {config && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={hideDialog}
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={hideDialog}
            />
            <View style={[styles.dialog, {
              backgroundColor: colors.cardBackground,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              <View style={styles.iconContainer}>
                {getIcon()}
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {config.title}
              </Text>

              <Text style={[styles.message, { color: colors.placeholder }]}>
                {config.message}
              </Text>

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  let buttonColor = colors.buttonBackground;
                  let textColor = colors.buttonText;

                  if (button.style === 'cancel') {
                    buttonColor = colors.border;
                    textColor = colors.text;
                  } else if (button.style === 'destructive') {
                    buttonColor = '#EF4444';
                    textColor = '#FFFFFF';
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        { backgroundColor: buttonColor },
                        buttons.length > 1 && { flex: 1 }
                      ]}
                      onPress={() => handleButtonPress(button)}
                    >
                      <Text style={[styles.buttonText, { color: textColor }]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
