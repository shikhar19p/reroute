import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Colors {
  text: string;
  background: string;
  buttonBackground: string;
  buttonText: string;
  cardBackground: string;
  border: string;
  placeholder: string;
}

interface ThemeContextType {
  colors: Colors;
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
      const savedTheme = await AsyncStorage.getItem('theme');
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
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors: { light: Colors; dark: Colors } = {
    light: {
      text: '#000000',
      background: '#ffffff',
      buttonBackground: '#02444d',
      buttonText: '#ffffff',
      cardBackground: '#ffffff',
      border: '#e0e0e0',
      placeholder: '#666666',
    },
    dark: {
      text: '#ffffff',
      background: '#000000',
      buttonBackground: '#02444d',
      buttonText: '#ffffff',
      cardBackground: '#1a1a1a',
      border: '#333333',
      placeholder: '#999999',
    },
  };

  const theme: ThemeContextType = {
    colors: isDark ? colors.dark : colors.light,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
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
