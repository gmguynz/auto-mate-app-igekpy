
import { Platform } from 'react-native';

export const webStyles = Platform.OS === 'web' ? {
  cursor: 'pointer' as const,
  userSelect: 'none' as const,
  outlineStyle: 'none' as const,
} : {};

export const webInputStyles = Platform.OS === 'web' ? {
  outlineStyle: 'none' as const,
  cursor: 'text' as const,
} : {};

export const webTextStyles = Platform.OS === 'web' ? {
  userSelect: 'text' as const,
} : {};

// Helper function to add web-specific styles to TouchableOpacity
export const addWebStyles = (baseStyle: any) => {
  if (Platform.OS === 'web') {
    return {
      ...baseStyle,
      ...webStyles,
    };
  }
  return baseStyle;
};

// Helper function to add web-specific styles to TextInput
export const addWebInputStyles = (baseStyle: any) => {
  if (Platform.OS === 'web') {
    return {
      ...baseStyle,
      ...webInputStyles,
    };
  }
  return baseStyle;
};
