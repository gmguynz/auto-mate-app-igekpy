
import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        animation: 'default',
        headerStyle: {
          backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : undefined,
        },
        headerTintColor: colors.primary,
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Customer Database',
          headerShown: false, // Index screen has custom header with search
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          title: 'Add Customer',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Customer Details',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="add-job-card" 
        options={{ 
          title: 'Add Job Card',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="job-card-detail" 
        options={{ 
          title: 'Job Card Details',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="job-cards" 
        options={{ 
          title: 'All Job Cards',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="parts" 
        options={{ 
          title: 'Parts Inventory',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="reminders" 
        options={{ 
          title: 'Reminders',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="vehicles" 
        options={{ 
          title: 'Vehicle Database',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="customer-jobs" 
        options={{ 
          title: 'Customer Jobs',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="vehicle-jobs" 
        options={{ 
          title: 'Vehicle Jobs',
          presentation: 'card',
        }} 
      />
    </Stack>
  );
}
