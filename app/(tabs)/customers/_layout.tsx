
import React from 'react';
import { Stack } from 'expo-router';

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add-job-card" />
      <Stack.Screen name="job-card-detail" />
      <Stack.Screen name="job-cards" />
      <Stack.Screen name="parts" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="customer-jobs" />
      <Stack.Screen name="vehicle-jobs" />
    </Stack>
  );
}
