
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storageUtils } from './storage';
import { dateUtils } from './dateUtils';
import { Customer } from '@/types/customer';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NOTIFICATION_CHANNEL_ID = 'service-reminders';
const REMINDER_DAYS_BEFORE = 14; // 2 weeks before due date

export const notificationService = {
  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing notification service...');
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
          name: 'Service Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        console.log('Android notification channel created');
      }

      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  },

  /**
   * Schedule all reminders for all customers
   */
  async scheduleAllReminders(): Promise<void> {
    try {
      console.log('Scheduling all reminders...');
      
      // Cancel all existing scheduled notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all existing notifications');

      // Get all customers
      const customers = await storageUtils.getCustomers();
      console.log(`Found ${customers.length} customers`);

      let scheduledCount = 0;

      // Schedule reminders for each customer's vehicles
      for (const customer of customers) {
        for (const vehicle of customer.vehicles) {
          // Schedule inspection reminder
          if (vehicle.inspectionDueDate) {
            const scheduled = await this.scheduleReminderForDate(
              customer,
              vehicle,
              'inspection',
              vehicle.inspectionDueDate
            );
            if (scheduled) scheduledCount++;
          }

          // Schedule service reminder
          if (vehicle.serviceDueDate) {
            const scheduled = await this.scheduleReminderForDate(
              customer,
              vehicle,
              'service',
              vehicle.serviceDueDate
            );
            if (scheduled) scheduledCount++;
          }
        }
      }

      console.log(`Successfully scheduled ${scheduledCount} reminders`);
    } catch (error) {
      console.error('Error scheduling all reminders:', error);
    }
  },

  /**
   * Schedule a reminder for a specific date
   */
  async scheduleReminderForDate(
    customer: Customer,
    vehicle: any,
    type: 'inspection' | 'service',
    dueDate: string
  ): Promise<boolean> {
    try {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate reminder date (14 days before due date)
      const reminderDate = new Date(dueDateObj);
      reminderDate.setDate(reminderDate.getDate() - REMINDER_DAYS_BEFORE);
      reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM

      // Only schedule if reminder date is in the future
      if (reminderDate <= today) {
        console.log(`Skipping past reminder for ${vehicle.registrationNumber} - ${type}`);
        return false;
      }

      const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
      const vehicleInfo = `${vehicle.registrationNumber} (${vehicle.year} ${vehicle.make} ${vehicle.model})`;
      
      const title = `${type === 'inspection' ? 'Inspection' : 'Service'} Reminder`;
      const body = `${customerName}'s vehicle ${vehicleInfo} is due for ${type} in 2 weeks on ${dateUtils.formatDate(dueDate)}`;

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            customerId: customer.id,
            vehicleId: vehicle.id,
            type,
            dueDate,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });

      console.log(`Scheduled ${type} reminder for ${vehicleInfo} on ${reminderDate.toLocaleDateString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return false;
    }
  },

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.Notification[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  },

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    inspections: number;
    services: number;
  }> {
    try {
      const notifications = await this.getScheduledNotifications();
      
      let inspections = 0;
      let services = 0;

      notifications.forEach((notification) => {
        const type = notification.request.content.data?.type;
        if (type === 'inspection') inspections++;
        if (type === 'service') services++;
      });

      return {
        total: notifications.length,
        inspections,
        services,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, inspections: 0, services: 0 };
    }
  },
};
