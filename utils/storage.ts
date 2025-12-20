
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '@/types/customer';

const CUSTOMERS_KEY = '@mechanic_customers';
const REMINDER_SETTINGS_KEY = '@reminder_settings';

export const storageUtils = {
  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  },

  async saveCustomers(customers: Customer[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (error) {
      console.error('Error saving customers:', error);
    }
  },

  async addCustomer(customer: Customer): Promise<void> {
    try {
      const customers = await this.getCustomers();
      customers.push(customer);
      await this.saveCustomers(customers);
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  },

  async updateCustomer(updatedCustomer: Customer): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const index = customers.findIndex(c => c.id === updatedCustomer.id);
      if (index !== -1) {
        customers[index] = updatedCustomer;
        await this.saveCustomers(customers);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const filtered = customers.filter(c => c.id !== customerId);
      await this.saveCustomers(filtered);
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers();
      return customers.find(c => c.id === customerId) || null;
    } catch (error) {
      console.error('Error getting customer by id:', error);
      return null;
    }
  },

  // Reminder settings
  async getReminderSettings() {
    try {
      const data = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      return data ? JSON.parse(data) : {
        enableEmailReminders: true,
        enableSmsReminders: false,
        reminderDaysBefore: 7,
      };
    } catch (error) {
      console.error('Error getting reminder settings:', error);
      return {
        enableEmailReminders: true,
        enableSmsReminders: false,
        reminderDaysBefore: 7,
      };
    }
  },

  async saveReminderSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving reminder settings:', error);
    }
  },
};
