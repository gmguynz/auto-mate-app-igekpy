
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { notificationService } from '@/utils/notificationService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading fonts:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize notifications when app starts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('Initializing notifications on app start...');
        const initialized = await notificationService.initialize();
        
        if (initialized) {
          console.log('Scheduling reminders...');
          await notificationService.scheduleAllReminders();
          
          const stats = await notificationService.getNotificationStats();
          console.log(`Notification stats: ${stats.total} total (${stats.inspections} inspections, ${stats.services} services)`);
        } else {
          console.log('Notification initialization failed - permissions not granted');
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
        <Stack.Screen
          name="transparent-modal"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}
