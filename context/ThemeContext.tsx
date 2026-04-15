import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { premiumLightTheme, premiumDarkTheme, PremiumTheme } from '../theme/premiumTheme';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(key, value);
}

interface ThemeContextType {
  theme: PremiumTheme;
  colors: PremiumTheme['colors'];
  spacing: PremiumTheme['spacing'];
  borderRadius: PremiumTheme['borderRadius'];
  typography: PremiumTheme['typography'];
  isDark: boolean;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await storageGet('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await storageSet('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const currentTheme = isDark ? premiumDarkTheme : premiumLightTheme;

  const themeContext: ThemeContextType = {
    theme: currentTheme,
    colors: currentTheme.colors,
    spacing: currentTheme.spacing,
    borderRadius: currentTheme.borderRadius,
    typography: currentTheme.typography,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
