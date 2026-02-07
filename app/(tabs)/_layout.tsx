
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'house.fill' : 'house'}
              android_material_icon_name="home"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'person.2.fill' : 'person.2'}
              android_material_icon_name="people"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'gearshape.fill' : 'gearshape'}
              android_material_icon_name="settings"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'person.crop.circle.fill' : 'person.crop.circle'}
              android_material_icon_name="account-circle"
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
