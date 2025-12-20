
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

interface MergedReminder {
  customer: Customer;
  vehicle: any;
  types: ('inspection' | 'service')[];
  dueDate: string;
}

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
          // Merge reminders if both inspection and service are due on the same day
          const mergedReminders = this.getMergedReminders(customer, vehicle);
          
          for (const merged of mergedReminders) {
            const scheduled = await this.scheduleReminderForMerged(merged);
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
   * Get merged reminders for a vehicle (merge if due on same day)
   */
  getMergedReminders(customer: Customer, vehicle: any): MergedReminder[] {
    const reminders: MergedReminder[] = [];
    
    const inspectionDate = vehicle.inspectionDueDate;
    const serviceDate = vehicle.serviceDueDate;

    // Check if both dates exist and are the same
    if (inspectionDate && serviceDate && inspectionDate === serviceDate) {
      // Merge into one reminder
      reminders.push({
        customer,
        vehicle,
        types: ['inspection', 'service'],
        dueDate: inspectionDate,
      });
    } else {
      // Create separate reminders
      if (inspectionDate) {
        reminders.push({
          customer,
          vehicle,
          types: ['inspection'],
          dueDate: inspectionDate,
        });
      }
      if (serviceDate) {
        reminders.push({
          customer,
          vehicle,
          types: ['service'],
          dueDate: serviceDate,
        });
      }
    }

    return reminders;
  },

  /**
   * Schedule a merged reminder
   */
  async scheduleReminderForMerged(merged: MergedReminder): Promise<boolean> {
    try {
      const dueDateObj = new Date(merged.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate reminder date (14 days before due date)
      const reminderDate = new Date(dueDateObj);
      reminderDate.setDate(reminderDate.getDate() - REMINDER_DAYS_BEFORE);
      reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM

      // Only schedule if reminder date is in the future
      if (reminderDate <= today) {
        console.log(`Skipping past reminder for ${merged.vehicle.registrationNumber}`);
        return false;
      }

      const customerName = merged.customer.companyName || `${merged.customer.firstName} ${merged.customer.lastName}`;
      const vehicleInfo = `${merged.vehicle.registrationNumber} (${merged.vehicle.year} ${merged.vehicle.make} ${merged.vehicle.model})`;
      
      // Create title and body based on merged types
      let title: string;
      let body: string;
      
      if (merged.types.length > 1) {
        title = 'Inspection & Service Reminder';
        body = `${customerName}'s vehicle ${vehicleInfo} is due for both inspection and service in 2 weeks on ${dateUtils.formatDate(merged.dueDate)}`;
      } else {
        const type = merged.types[0];
        title = `${type === 'inspection' ? 'Inspection' : 'Service'} Reminder`;
        body = `${customerName}'s vehicle ${vehicleInfo} is due for ${type} in 2 weeks on ${dateUtils.formatDate(merged.dueDate)}`;
      }

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            customerId: merged.customer.id,
            vehicleId: merged.vehicle.id,
            types: merged.types,
            dueDate: merged.dueDate,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });

      console.log(`Scheduled ${merged.types.join(' & ')} reminder for ${vehicleInfo} on ${reminderDate.toLocaleDateString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return false;
    }
  },

  /**
   * Schedule a reminder for a specific date (legacy method for backward compatibility)
   */
  async scheduleReminderForDate(
    customer: Customer,
    vehicle: any,
    type: 'inspection' | 'service',
    dueDate: string
  ): Promise<boolean> {
    const merged: MergedReminder = {
      customer,
      vehicle,
      types: [type],
      dueDate,
    };
    return this.scheduleReminderForMerged(merged);
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
    merged: number;
  }> {
    try {
      const notifications = await this.getScheduledNotifications();
      
      let inspections = 0;
      let services = 0;
      let merged = 0;

      notifications.forEach((notification) => {
        const types = notification?.request?.content?.data?.types;
        if (Array.isArray(types)) {
          if (types.length > 1) {
            merged++;
          } else if (types[0] === 'inspection') {
            inspections++;
          } else if (types[0] === 'service') {
            services++;
          }
        } else {
          // Legacy format
          const type = notification?.request?.content?.data?.type;
          if (type === 'inspection') inspections++;
          if (type === 'service') services++;
        }
      });

      return {
        total: notifications.length,
        inspections,
        services,
        merged,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, inspections: 0, services: 0, merged: 0 };
    }
  },
};
