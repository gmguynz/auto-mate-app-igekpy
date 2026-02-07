
import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

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
        headerTintColor: '#007AFF',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Customer Database',
          headerShown: false, // Index screen has custom header
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          title: 'Add Customer',
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Customer Details',
        }} 
      />
      <Stack.Screen 
        name="add-job-card" 
        options={{ 
          title: 'Add Job Card',
        }} 
      />
      <Stack.Screen 
        name="job-card-detail" 
        options={{ 
          title: 'Job Card Details',
        }} 
      />
      <Stack.Screen 
        name="job-cards" 
        options={{ 
          title: 'All Job Cards',
        }} 
      />
      <Stack.Screen 
        name="parts" 
        options={{ 
          title: 'Parts Inventory',
        }} 
      />
      <Stack.Screen 
        name="reminders" 
        options={{ 
          title: 'Reminders',
        }} 
      />
      <Stack.Screen 
        name="vehicles" 
        options={{ 
          title: 'Vehicle Database',
        }} 
      />
      <Stack.Screen 
        name="customer-jobs" 
        options={{ 
          title: 'Customer Jobs',
        }} 
      />
      <Stack.Screen 
        name="vehicle-jobs" 
        options={{ 
          title: 'Vehicle Jobs',
        }} 
      />
    </Stack>
  );
}
