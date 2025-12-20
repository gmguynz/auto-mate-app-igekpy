
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '@/types/customer';
import { supabaseStorage } from './supabaseStorage';

const CUSTOMERS_KEY = '@mechanic_customers';
const REMINDER_SETTINGS_KEY = '@reminder_settings';

// This utility now uses Supabase as the primary storage
// Falls back to AsyncStorage if Supabase is not configured
export const storageUtils = {
  // Check if we should use Supabase
  shouldUseSupabase(): boolean {
    try {
      return supabaseStorage.isConfigured();
    } catch (error) {
      console.error('Error checking Supabase configuration:', error);
      return false;
    }
  },

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    try {
      if (this.shouldUseSupabase()) {
        console.log('Using Supabase for storage');
        return await supabaseStorage.getCustomers();
      }

      // Fallback to AsyncStorage
      console.log('Using AsyncStorage for storage (Supabase not configured)');
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  },

  async saveCustomers(customers: Customer[]): Promise<void> {
    try {
      if (this.shouldUseSupabase()) {
        // When using Supabase, we don't need this method
        // Individual add/update/delete methods handle persistence
        console.log('Using Supabase - saveCustomers not needed');
        return;
      }

      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (error) {
      console.error('Error saving customers:', error);
    }
  },

  async addCustomer(customer: Customer): Promise<void> {
    try {
      if (this.shouldUseSupabase()) {
        return await supabaseStorage.addCustomer(customer);
      }

      // Fallback to AsyncStorage
      const customers = await this.getCustomers();
      customers.push(customer);
      await this.saveCustomers(customers);
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },

  async updateCustomer(updatedCustomer: Customer): Promise<void> {
    try {
      if (this.shouldUseSupabase()) {
        return await supabaseStorage.updateCustomer(updatedCustomer);
      }

      // Fallback to AsyncStorage
      const customers = await this.getCustomers();
      const index = customers.findIndex(c => c.id === updatedCustomer.id);
      if (index !== -1) {
        customers[index] = updatedCustomer;
        await this.saveCustomers(customers);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      if (this.shouldUseSupabase()) {
        return await supabaseStorage.deleteCustomer(customerId);
      }

      // Fallback to AsyncStorage
      const customers = await this.getCustomers();
      const filtered = customers.filter(c => c.id !== customerId);
      await this.saveCustomers(filtered);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      if (this.shouldUseSupabase()) {
        return await supabaseStorage.getCustomerById(customerId);
      }

      // Fallback to AsyncStorage
      const customers = await this.getCustomers();
      return customers.find(c => c.id === customerId) || null;
    } catch (error) {
      console.error('Error getting customer by id:', error);
      return null;
    }
  },

  // Reminder settings (still using AsyncStorage for user preferences)
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

  // Migration utility to move data from AsyncStorage to Supabase
  async migrateToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.shouldUseSupabase()) {
        return {
          success: false,
          message: 'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
        };
      }

      // Get data from AsyncStorage
      const localData = await AsyncStorage.getItem(CUSTOMERS_KEY);
      if (!localData) {
        return {
          success: true,
          message: 'No local data to migrate.',
        };
      }

      const customers: Customer[] = JSON.parse(localData);
      if (customers.length === 0) {
        return {
          success: true,
          message: 'No customers to migrate.',
        };
      }

      // Migrate each customer to Supabase
      let successCount = 0;
      let errorCount = 0;

      for (const customer of customers) {
        try {
          await supabaseStorage.addCustomer(customer);
          successCount++;
        } catch (error) {
          console.error(`Error migrating customer ${customer.id}:`, error);
          errorCount++;
        }
      }

      // Clear AsyncStorage after successful migration
      if (errorCount === 0) {
        await AsyncStorage.removeItem(CUSTOMERS_KEY);
        return {
          success: true,
          message: `Successfully migrated ${successCount} customer${successCount !== 1 ? 's' : ''} to Supabase.`,
        };
      } else {
        return {
          success: false,
          message: `Migrated ${successCount} customer${successCount !== 1 ? 's' : ''}, but ${errorCount} failed.`,
        };
      }
    } catch (error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        message: `Migration failed: ${error}`,
      };
    }
  },

  // Clear local storage (useful for testing)
  async clearLocalStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CUSTOMERS_KEY);
      console.log('Local storage cleared');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  },
};
