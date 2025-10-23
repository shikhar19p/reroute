import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTabBarVisibility } from '../context/TabBarVisibilityContext';
import * as Haptics from 'expo-haptics';

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, typography, shadows, isDark } = useTheme();
  const { translateY } = useTabBarVisibility();

  const getTabIcon = (routeName: string): string => {
    switch (routeName) {
      case 'Explore':
        return 'compass-outline';
      case 'Bookings':
        return 'calendar-check';
      case 'Wishlist':
        return 'heart-outline';
      case 'Profile':
        return 'account-circle-outline';
      default:
        return 'circle';
    }
  };

  const getTabIconFocused = (routeName: string): string => {
    switch (routeName) {
      case 'Explore':
        return 'compass';
      case 'Bookings':
        return 'calendar-check';
      case 'Wishlist':
        return 'heart';
      case 'Profile':
        return 'account-circle';
      default:
        return 'circle';
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <BlurView
        intensity={100}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blurContainer, {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
        }]}
      >
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isFocused && {
                    backgroundColor: colors.primaryLight,
                    transform: [{ scale: 1.1 }],
                  }
                ]}>
                  <MaterialCommunityIcons
                    name={isFocused ? getTabIconFocused(route.name) : getTabIcon(route.name)}
                    size={24}
                    color={isFocused ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? colors.primary : colors.textSecondary,
                      fontFamily: isFocused ? typography.fontFamily.semiBold : typography.fontFamily.regular,
                    }
                  ]}
                >
                  {label as string}
                </Text>
                {isFocused && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 16,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
});
