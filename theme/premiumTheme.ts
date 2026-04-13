export interface PremiumColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;

  background: string;
  backgroundSecondary: string;
  cardBackground: string;
  surfaceOverlay: string;

  text: string;
  textSecondary: string;
  placeholder: string;
  textInverse: string;

  border: string;
  divider: string;

  buttonBackground: string;
  buttonText: string;

  // Status
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Booking status
  statusConfirmed: string;
  statusPending: string;
  statusCancelled: string;
  statusCompleted: string;

  // Semantic
  favorite: string;
  rating: string;

  // Gradients
  overlayGradient: string[];
}

export interface PremiumTheme {
  colors: PremiumColors;
  spacing: {
    xs: number; sm: number; md: number;
    lg: number; xl: number; xxl: number;
  };
  borderRadius: {
    xs: number; sm: number; md: number;
    lg: number; xl: number; round: number;
  };
  typography: {
    fontSize: {
      xs: number; sm: number; md: number;
      lg: number; xl: number; xxl: number;
    };
  };
}

export const premiumLightTheme: PremiumTheme = {
  colors: {
    primary:      '#C5A565',
    primaryLight: '#D4B97A',
    primaryDark:  '#A88945',

    background:          '#F7F7F7',
    backgroundSecondary: '#FFFFFF',
    cardBackground:      '#FFFFFF',
    surfaceOverlay:      'rgba(0,0,0,0.04)',

    text:          '#111111',
    textSecondary: '#555555',
    placeholder:   '#999999',
    textInverse:   '#FFFFFF',

    border:  '#E8E8E8',
    divider: '#E8E8E8',

    buttonBackground: '#C5A565',
    buttonText:       '#FFFFFF',

    success:      '#16A34A',
    successLight: '#DCFCE7',
    error:        '#DC2626',
    errorLight:   '#FEE2E2',
    warning:      '#D97706',
    warningLight: '#FEF3C7',
    info:         '#2563EB',
    infoLight:    '#DBEAFE',

    statusConfirmed:  '#16A34A',
    statusPending:    '#D97706',
    statusCancelled:  '#DC2626',
    statusCompleted:  '#2563EB',

    favorite: '#E53E3E',
    rating:   '#F6C90E',

    overlayGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'],
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  borderRadius: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, round: 9999,
  },
  typography: {
    fontSize: {
      xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28,
    },
  },
};

export const premiumDarkTheme: PremiumTheme = {
  ...premiumLightTheme,
  colors: {
    ...premiumLightTheme.colors,

    background:          '#000000',
    backgroundSecondary: '#0A0A0A',
    cardBackground:      '#111111',
    surfaceOverlay:      'rgba(255,255,255,0.06)',

    text:          '#FFFFFF',
    textSecondary: '#A0A0A0',
    placeholder:   '#616161',
    textInverse:   '#000000',

    border:  '#1F1F1F',
    divider: '#1F1F1F',

    buttonBackground: '#C5A565',
    buttonText:       '#000000',

    overlayGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'],
  },
};

export default premiumLightTheme;
