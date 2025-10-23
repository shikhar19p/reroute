import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale size based on screen width
 */
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height
 */
export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale font size based on screen width
 */
export const scaleFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderate scale - less aggressive scaling
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scaleWidth(size) - size) * factor;
};

/**
 * Check if screen is small (width < 375)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if screen is large (width > 414)
 */
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH > 414;
};

/**
 * Get responsive padding
 */
export const getResponsivePadding = (base: number): number => {
  if (isSmallDevice()) {
    return base * 0.75; // 25% less padding on small devices
  }
  if (isLargeDevice()) {
    return base * 1.1; // 10% more padding on large devices
  }
  return base;
};

/**
 * Get responsive gap
 */
export const getResponsiveGap = (base: number): number => {
  if (isSmallDevice()) {
    return base * 0.7; // 30% less gap on small devices
  }
  return base;
};

export const dimensions = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmall: isSmallDevice(),
  isLarge: isLargeDevice(),
};
