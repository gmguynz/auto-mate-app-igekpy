
import { Platform, ViewStyle, TextStyle } from 'react-native';

/**
 * Web-specific styles for interactive elements
 * These styles ensure that buttons and touchable elements work properly on web
 */

export const webInteractiveStyles = {
  /**
   * Apply to any TouchableOpacity, Pressable, or clickable View
   */
  touchable: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  } as ViewStyle,

  /**
   * Apply to text inside buttons or touchable elements
   */
  touchableText: {
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  } as TextStyle,

  /**
   * Apply to disabled touchable elements
   */
  touchableDisabled: {
    cursor: Platform.OS === 'web' ? 'not-allowed' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  } as ViewStyle,

  /**
   * Apply to input fields
   */
  input: {
    cursor: Platform.OS === 'web' ? 'text' : undefined,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  } as ViewStyle,
};

/**
 * Helper function to merge web-interactive styles with existing styles
 */
export function makeInteractive(style?: ViewStyle | ViewStyle[]): ViewStyle | ViewStyle[] {
  if (Array.isArray(style)) {
    return [...style, webInteractiveStyles.touchable];
  }
  return [style, webInteractiveStyles.touchable].filter(Boolean);
}

/**
 * Helper function for text in interactive elements
 */
export function makeTextInteractive(style?: TextStyle | TextStyle[]): TextStyle | TextStyle[] {
  if (Array.isArray(style)) {
    return [...style, webInteractiveStyles.touchableText];
  }
  return [style, webInteractiveStyles.touchableText].filter(Boolean);
}
