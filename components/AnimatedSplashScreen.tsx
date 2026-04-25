import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Text,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GOLD = 'rgb(212, 175, 55)';

interface AnimatedSplashScreenProps {
  message?: string;
  onAnimationComplete?: () => void;
  onReady?: () => void;
}

export default function AnimatedSplashScreen({
  onAnimationComplete,
  onReady,
}: AnimatedSplashScreenProps) {
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(-10)).current;

  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const dotLoopRef = useRef<any>(null);

  const onReadyCalled = useRef(false);

  useEffect(() => {
    if (onReady && !onReadyCalled.current) {
      onReadyCalled.current = true;
      setTimeout(onReady, 50);
    }

    // Fade-in + slide-down entrance
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Dots start after text is visible
    const dotsTimer = setTimeout(() => {
      dotLoopRef.current = Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dotAnim1, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim1, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim2, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim3, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ])
      );
      dotLoopRef.current.start();
    }, 400);

    // Fade-out text only — photo stays for seamless transition to WelcomeScreen
    const exitTimer = setTimeout(() => {
      if (dotLoopRef.current) dotLoopRef.current.stop();

      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished && onAnimationComplete) onAnimationComplete();
      });
    }, 1400);

    return () => {
      clearTimeout(dotsTimer);
      clearTimeout(exitTimer);
      if (dotLoopRef.current) dotLoopRef.current.stop();
    };
  }, [onReady, onAnimationComplete]);

  const makeDotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }],
  });

  return (
    <ImageBackground
      source={require('../assets/farmhouse-bg.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.monogram}>RR</Text>

        <View style={styles.nameRow}>
          <View style={styles.rule} />
          <Text style={styles.wordmark}>REROUT AVENTURES</Text>
          <View style={styles.rule} />
        </View>

        {/* Dots directly below wordmark */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, makeDotStyle(dotAnim1)]} />
          <Animated.View style={[styles.dot, makeDotStyle(dotAnim2)]} />
          <Animated.View style={[styles.dot, makeDotStyle(dotAnim3)]} />
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  textBlock: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  monogram: {
    fontFamily: 'Seasons-Light',
    fontSize: 72,
    fontWeight: '300',
    color: '#D4AF37',
    lineHeight: 76,
    marginBottom: 10,
    letterSpacing: -2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  rule: {
    flex: 1,
    maxWidth: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  wordmark: {
    fontFamily: 'Seasons-Light',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
});
