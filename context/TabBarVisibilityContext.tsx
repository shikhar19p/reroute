import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import { Animated } from 'react-native';

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
const SCROLL_THRESHOLD = 5; // Minimum scroll distance to trigger hide/show

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  const [isVisible, setIsVisible] = useState(true);

  const showTabBar = useCallback(() => {
    if (!isVisible) {
      setIsVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }
  }, [isVisible, translateY]);

  const hideTabBar = useCallback(() => {
    if (isVisible) {
      setIsVisible(false);
      Animated.spring(translateY, {
        toValue: TAB_BAR_HEIGHT + 20,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }
  }, [isVisible, translateY]);

  const setTabBarVisible = useCallback((visible: boolean) => {
    if (visible) {
      showTabBar();
    } else {
      hideTabBar();
    }
  }, [showTabBar, hideTabBar]);

  const onScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = currentScrollY - lastScrollY.current;

    // Only react to significant scroll movements
    if (Math.abs(scrollDelta) < SCROLL_THRESHOLD) {
      return;
    }

    // Scrolling down (hide tab bar)
    if (scrollDelta > 0 && currentScrollY > 50) {
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        hideTabBar();
      }
    }
    // Scrolling up (show tab bar)
    else if (scrollDelta < 0) {
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        showTabBar();
      }
    }

    lastScrollY.current = currentScrollY;
  }, [hideTabBar, showTabBar]);

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

// Hook for screens to easily integrate scroll handling
export function useScrollHandler() {
  const { onScroll } = useTabBarVisibility();

  return {
    onScroll,
    scrollEventThrottle: 16, // 60fps
  };
}
