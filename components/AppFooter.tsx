
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors } from '@/styles/commonStyles';

export function AppFooter() {
  const handlePress = () => {
    Linking.openURL('https://autoprog.co.nz').catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.footerText}>
          Designed by AutoProg - autoprog.co.nz
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
