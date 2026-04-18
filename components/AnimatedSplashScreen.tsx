import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Calculate zoom scale so logo square fits screen height
// Logo is 180px, so scale needed is screen_height / 180
const LOGO_SIZE = 180;
const ZOOM_SCALE = (height / LOGO_SIZE) * 1.1; // 1.1x extra to ensure full coverage

interface AnimatedSplashScreenProps {
  message?: string;
  onAnimationComplete?: () => void;
  onReady?: () => void;
}

export default function AnimatedSplashScreen({
  message = 'Loading...',
  onAnimationComplete,
  onReady
}: AnimatedSplashScreenProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const decorCircles = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const blurIntensity = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<any>(null);

  const startExitAnimation = React.useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    // Stop the pulse loop
    if (pulseLoop.current) {
      pulseLoop.current.stop();
    }

    // Zoom in animation - logo grows until square fills screen height
    Animated.parallel([
      Animated.timing(containerScale, {
        toValue: ZOOM_SCALE,
        duration: 800,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 800,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(blurIntensity, {
        toValue: 50,
        duration: 800,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false, // Blur doesn't support native driver
      }),
    ]).start(({ finished }) => {
      if (finished && onAnimationComplete) {
        // Delay to ensure logo fully covers screen before showing app
        setTimeout(() => {
          onAnimationComplete();
        }, 100);
      }
    });
  }, [isExiting, onAnimationComplete]);

  // Track if onReady has been called
  const onReadyCalled = useRef(false);

  useEffect(() => {
    // Signal that custom splash is ready - hide native splash (only once)
    if (onReady && !onReadyCalled.current) {
      onReadyCalled.current = true;
      // Small delay to ensure this component is fully rendered
      setTimeout(() => {
        onReady();
      }, 50);
    }

    // Logo entrance zoom - comes from small to normal
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 30,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Decorative circles fade in
    Animated.timing(decorCircles, {
      toValue: 1,
      duration: 1500,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Subtle continuous pulse for premium feel
    setTimeout(() => {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.03,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(logoPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseLoop.current.start();
    }, 1000);

    // Auto-start exit animation after 2.5 seconds
    const exitTimer = setTimeout(() => {
      startExitAnimation();
    }, 2500);

    return () => {
      clearTimeout(exitTimer);
      if (pulseLoop.current) {
        pulseLoop.current.stop();
      }
    };
  }, [startExitAnimation, onReady]);

  useEffect(() => {
    // Elegant loading dots animation
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dotAnim1, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(dotAnim1, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(dotAnim2, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(dotAnim3, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ])
      ).start();
    };

    setTimeout(() => animateDots(), 800);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
          pointerEvents: isExiting ? 'none' : 'auto',
        },
      ]}
    >
      {/* Decorative circles - varied sizes, positions, and opacities */}
      {/* Top area circles */}
      <Animated.View style={[styles.decorCircle, styles.circle1, { opacity: Animated.multiply(decorCircles, 0.6) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle2, { opacity: Animated.multiply(decorCircles, 1) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle3, { opacity: Animated.multiply(decorCircles, 0.4) }]} />

      {/* Right area circles */}
      <Animated.View style={[styles.decorCircle, styles.circle4, { opacity: Animated.multiply(decorCircles, 0.8) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle5, { opacity: Animated.multiply(decorCircles, 0.5) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle6, { opacity: Animated.multiply(decorCircles, 0.7) }]} />

      {/* Bottom area circles */}
      <Animated.View style={[styles.decorCircle, styles.circle7, { opacity: Animated.multiply(decorCircles, 0.9) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle8, { opacity: Animated.multiply(decorCircles, 0.5) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle9, { opacity: Animated.multiply(decorCircles, 0.6) }]} />

      {/* Left area circles */}
      <Animated.View style={[styles.decorCircle, styles.circle10, { opacity: Animated.multiply(decorCircles, 0.7) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle11, { opacity: Animated.multiply(decorCircles, 0.4) }]} />
      <Animated.View style={[styles.decorCircle, styles.circle12, { opacity: Animated.multiply(decorCircles, 0.8) }]} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                {
                  scale: Animated.multiply(logoScale, logoPulse),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Blur and white overlay during exit animation */}
        {isExiting && (
          <>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: blurIntensity.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            >
              <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="light" />
            </Animated.View>
            {/* White overlay for smooth transition - fully covers at end */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgb(249, 248, 239)',
                  opacity: blurIntensity.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            />
          </>
        )}

        {/* Loading dots */}
        <View style={styles.loadingContainer}>
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dotAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dotAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dotAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dotAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dotAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dotAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(249, 248, 239)',
  },
  decorCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(244, 173, 50, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 173, 50, 0.45)',
  },
  // Top area circles
  circle1: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    top: -10,
    left: '12%',
  },
  circle2: {
    width: 90,
    height: 90,
    borderRadius: 45,
    top: -50,
    right: '20%',
  },
  circle3: {
    width: 120,
    height: 120,
    borderRadius: 60,
    top: 30,
    right: 20,
  },
  // Right area circles
  circle4: {
    width: 70,
    height: 70,
    borderRadius: 35,
    right: -40,
    top: '18%',
  },
  circle5: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    right: 15,
    top: '38%',
  },
  circle6: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    right: -55,
    top: '55%',
  },
  // Bottom area circles
  circle7: {
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -60,
    left: '15%',
  },
  circle8: {
    width: 40,
    height: 40,
    borderRadius: 20,
    bottom: 25,
    left: '8%',
  },
  circle9: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    bottom: -25,
    right: '18%',
  },
  // Left area circles
  circle10: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    left: -35,
    top: '25%',
  },
  circle11: {
    width: 110,
    height: 110,
    borderRadius: 55,
    left: 25,
    top: '12%',
  },
  circle12: {
    width: 50,
    height: 50,
    borderRadius: 25,
    left: -15,
    bottom: '28%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgb(244, 173, 50)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  appIcon: {
    width: 180,
    height: 180,
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgb(244, 173, 50)',
  },
});
