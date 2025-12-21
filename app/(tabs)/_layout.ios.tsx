
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { isAdmin } = useAuth();

  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={colors.textSecondary}
      labelStyle={{
        color: colors.text,
      }}
    >
      <NativeTabs.Trigger name="(home)">
        <Label>Home</Label>
        <Icon sf="house.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <Label>Customers</Label>
        <Icon sf="person.2.fill" />
      </NativeTabs.Trigger>
      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <Label>Admin</Label>
          <Icon sf="shield.fill" />
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf="person.circle.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
