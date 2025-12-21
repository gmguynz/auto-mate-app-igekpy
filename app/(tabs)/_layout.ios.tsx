
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
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <Icon sf="person.2.fill" />
        <Label>Customers</Label>
      </NativeTabs.Trigger>
      {!isAdmin ? null : (
        <NativeTabs.Trigger name="admin">
          <Icon sf="shield.fill" />
          <Label>Admin</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Icon sf="person.circle.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
