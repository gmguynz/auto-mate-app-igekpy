
import React from 'react';
import { Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol.ios';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Dashboard</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <Label>Customers</Label>
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} drawable="people" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="admin">
        <Label>Admin</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} drawable="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} drawable="account-circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
