
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Modern, sharp color scheme prioritizing efficiency and readability
export const colors = {
  // Primary brand colors - Sharp blue for professionalism
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#3385FF',
  
  // Secondary colors - Vibrant accent
  secondary: '#00C9A7',
  secondaryDark: '#00A88A',
  
  // Status colors
  success: '#00C853',
  warning: '#FFB300',
  error: '#FF3D00',
  info: '#00B0FF',
  
  // Job card status colors
  statusOpen: '#FF9800',
  statusInProgress: '#2196F3',
  statusCompleted: '#4CAF50',
  statusCancelled: '#9E9E9E',
  
  // Neutral colors - Clean and modern
  background: '#F5F7FA',
  backgroundDark: '#E8ECF1',
  card: '#FFFFFF',
  cardHover: '#FAFBFC',
  
  // Text colors
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Border and divider colors
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  divider: '#F3F4F6',
  
  // Accent and highlight
  accent: '#FF6B35',
  highlight: '#FFF4E6',
  highlightBlue: '#E3F2FD',
  highlightGreen: '#E8F5E9',
  highlightRed: '#FFEBEE',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.card,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.text,
  },
});
