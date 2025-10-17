// Premium Theme Configuration - Elegant Gold Scheme
// Inspired by luxury booking platforms (Airbnb, Booking.com)

export interface PremiumColors {
  // Primary Brand Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;

  // Backgrounds
  background: string;
  backgroundSecondary: string;
  cardBackground: string;
  surfaceOverlay: string;

  // Text Colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  placeholder: string;

  // UI Elements
  border: string;
  borderLight: string;
  divider: string;
  shadow: string;
  ripple: string;

  // Button Colors
  buttonBackground: string;
  buttonText: string;

  // Status Colors
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Semantic Colors
  favorite: string;
  rating: string;
  verified: string;
  premium: string;

  // Gradients
  primaryGradient: string[];
  secondaryGradient: string[];
  goldGradient: string[];
  overlayGradient: string[];
}

export interface PremiumTheme {
  colors: PremiumColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    round: number;
  };
  shadows: {
    sm: object;
    md: object;
    lg: object;
    xl: object;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
}

// Light Theme - Elegant Gold
export const premiumLightTheme: PremiumTheme = {
  colors: {
    // Primary - Elegant Gold
    primary: '#D4AF37',
    primaryLight: '#E6C966',
    primaryDark: '#B8941F',

    // Secondary - Deep Blue
    secondary: '#2C3E50',
    secondaryLight: '#34495E',

    // Accent - Warm Orange
    accent: '#E67E22',
    accentLight: '#F39C12',

    // Backgrounds
    background: '#F8F9FA',
    backgroundSecondary: '#FFFFFF',
    cardBackground: '#FFFFFF',
    surfaceOverlay: 'rgba(0, 0, 0, 0.05)',

    // Text
    text: '#1A1A1A',
    textSecondary: '#6C757D',
    textTertiary: '#ADB5BD',
    textInverse: '#FFFFFF',
    placeholder: '#9CA3AF',

    // UI Elements
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.1)',
    ripple: 'rgba(212, 175, 55, 0.2)',

    // Buttons
    buttonBackground: '#D4AF37',
    buttonText: '#FFFFFF',

    // Status
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',

    // Semantic
    favorite: '#EF4444',
    rating: '#FCD34D',
    verified: '#10B981',
    premium: '#D4AF37',

    // Gradients
    primaryGradient: ['#D4AF37', '#B8941F'],
    secondaryGradient: ['#2C3E50', '#34495E'],
    goldGradient: ['#D4AF37', '#E6C966', '#F9E79F'],
    overlayGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  },
  typography: {
    fontFamily: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semiBold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32,
      xxxl: 40,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },
};

// Dark Theme - Elegant Gold
export const premiumDarkTheme: PremiumTheme = {
  ...premiumLightTheme,
  colors: {
    ...premiumLightTheme.colors,

    // Backgrounds
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    cardBackground: '#1E293B',
    surfaceOverlay: 'rgba(255, 255, 255, 0.05)',

    // Text
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',
    placeholder: '#9CA3AF',

    // UI Elements
    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Buttons
    buttonBackground: '#D4AF37',
    buttonText: '#0F172A',

    // Gradients
    overlayGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)'],
  },
};

// Export default theme
export default premiumLightTheme;
