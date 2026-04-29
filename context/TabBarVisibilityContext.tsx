import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

interface TabBarContextType {
  tabBarHeight: number;
  translateY: Animated.Value;
  onScroll: (event: any) => void;
  showTabBar: () => void;
  hideTabBar: () => void;
  setTabBarVisible: (visible: boolean) => void;
}

const TabBarVisibilityContext = createContext<TabBarContextType | undefined>(undefined);

export const TAB_BAR_HEIGHT = 60;
const SCROLL_THRESHOLD_HIDE = 5;
const SCROLL_THRESHOLD_SHOW = 1;
const ANIM_DURATION = 220;

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isVisibleRef = useRef(true);

  const showTabBar = useCallback(() => {
    if (isVisibleRef.current) return;
    isVisibleRef.current = true;
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: 0,
      duration: ANIM_DURATION,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [translateY]);

  const hideTabBar = useCallback(() => {
    if (!isVisibleRef.current) return;
    isVisibleRef.current = false;
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: TAB_BAR_HEIGHT + 20,
      duration: ANIM_DURATION,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start();
  }, [translateY]);

  const setTabBarVisible = useCallback((visible: boolean) => {
    visible ? showTabBar() : hideTabBar();
  }, [showTabBar, hideTabBar]);

  const onScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = currentScrollY - lastScrollY.current;

    // Always show when near top
    if (currentScrollY <= 5) {
      showTabBar();
      lastScrollY.current = currentScrollY;
      return;
    }

    // Scroll down → sink
    if (scrollDelta > SCROLL_THRESHOLD_HIDE && currentScrollY > 50) {
      hideTabBar();
    }
    // Any upward scroll → float up
    else if (scrollDelta < -SCROLL_THRESHOLD_SHOW) {
      showTabBar();
    }

    lastScrollY.current = currentScrollY;
  }, [showTabBar, hideTabBar]);

  return (
    <TabBarVisibilityContext.Provider
      value={{
        tabBarHeight: TAB_BAR_HEIGHT,
        translateY,
        onScroll,
        showTabBar,
        hideTabBar,
        setTabBarVisible,
      }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  }
  return context;
}

export function useScrollHandler() {
  const { onScroll } = useTabBarVisibility();
  return {
    onScroll,
    scrollEventThrottle: 16,
  };
}
