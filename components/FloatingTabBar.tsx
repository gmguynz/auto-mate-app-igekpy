
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface FloatingTabBarProps extends BottomTabBarProps {
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  containerWidth = screenWidth - 40,
  borderRadius = 35,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const animatedValue = useSharedValue(state.index);

  React.useEffect(() => {
    animatedValue.value = withSpring(state.index, {
      damping: 20,
      stiffness: 120,
      mass: 1,
    });
  }, [state.index, animatedValue]);

  const tabWidthPercent = ((100 / state.routes.length) - 1).toFixed(2);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / state.routes.length;
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, state.routes.length - 1],
            [0, tabWidth * (state.routes.length - 1)]
          ),
        },
      ],
    };
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            marginBottom: bottomMargin,
          },
        ]}
      >
        <BlurView
          intensity={80}
          style={[styles.blurContainer, { borderRadius }]}
        >
          <View style={styles.background} />
          <Animated.View
            style={[
              styles.indicator,
              {
                width: `${tabWidthPercent}%` as `${number}%`,
              },
              indicatorStyle,
            ]}
          />
          <View style={styles.tabsContainer}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label =
                options.tabBarLabel !== undefined
                  ? options.tabBarLabel
                  : options.title !== undefined
                  ? options.title
                  : route.name;

              const isFocused = state.index === index;

              const onPress = () => {
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
                  style={styles.tab}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabContent}>
                    {options.tabBarIcon &&
                      options.tabBarIcon({
                        focused: isFocused,
                        color: isFocused
                          ? options.tabBarActiveTintColor || '#007AFF'
                          : options.tabBarInactiveTintColor || '#8E8E93',
                        size: 24,
                      })}
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isFocused
                            ? options.tabBarActiveTintColor || '#007AFF'
                            : options.tabBarInactiveTintColor || '#8E8E93',
                          fontWeight: isFocused ? '600' : '500',
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {typeof label === 'string' ? label : route.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
      },
      android: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      },
      web: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 52,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 14,
  },
});
