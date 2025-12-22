
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Customer } from '@/types/customer';

// Retry configuration
const MAX_RETRIES = 2; // Reduced from 3 to fail faster
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 15000; // 15 seconds (increased from 10)

// Helper function to implement retry logic with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`${operationName} - Attempt ${attempt}/${retries}`);
      const startTime = Date.now();
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), TIMEOUT);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`${operationName} completed in ${duration}ms`);
      
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      
      // Check if it's a network/connection error
      const isNetworkError = 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.error(`${operationName} network error (attempt ${attempt}/${retries}):`, error.message);
      } else {
        console.error(`${operationName} failed (attempt ${attempt}/${retries}):`, error);
      }
      
      if (isLastAttempt) {
        // Provide a more user-friendly error message
        if (isNetworkError) {
          throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
        }
        throw error;
      }
      
      // Exponential backoff - only retry on network errors
      if (isNetworkError) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Don't retry on non-network errors (like auth errors, validation errors, etc.)
        throw error;
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${retries} attempts`);
}

export const supabaseStorage = {
  // Check if Supabase is properly configured
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // Customer operations with retry logic
  async getCustomers(): Promise<Customer[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured, returning empty array');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error getting customers from Supabase:', error);
          throw error;
        }

        // Transform Supabase data to match our Customer type
        return (data || []).map((item: any) => ({
          id: item.id,
          firstName: item.first_name || '',
          lastName: item.last_name || '',
          companyName: item.company_name || '',
          address: item.address || '',
          email: item.email || '',
          phone: item.phone || '',
          mobile: item.mobile || '',
          vehicles: item.vehicles || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }, 'getCustomers');
    } catch (error: any) {
      console.error('Error getting customers:', error);
      // Don't throw - return empty array to allow app to continue working
      return [];
    }
  },

  async addCustomer(customer: Customer): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      // Transform Customer type to Supabase schema
      const { error } = await supabase.from('customers').insert({
        id: customer.id,
        first_name: customer.firstName,
        last_name: customer.lastName,
        company_name: customer.companyName,
        address: customer.address,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        vehicles: customer.vehicles,
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
      });

      if (error) {
        console.error('Error adding customer to Supabase:', error);
        throw error;
      }
      
      console.log('Customer added successfully to Supabase');
    }, 'addCustomer');
  },

  async updateCustomer(updatedCustomer: Customer): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: updatedCustomer.firstName,
          last_name: updatedCustomer.lastName,
          company_name: updatedCustomer.companyName,
          address: updatedCustomer.address,
          email: updatedCustomer.email,
          phone: updatedCustomer.phone,
          mobile: updatedCustomer.mobile,
          vehicles: updatedCustomer.vehicles,
          updated_at: updatedCustomer.updatedAt,
        })
        .eq('id', updatedCustomer.id);

      if (error) {
        console.error('Error updating customer in Supabase:', error);
        throw error;
      }
      
      console.log('Customer updated successfully in Supabase');
    }, 'updateCustomer');
  },

  async deleteCustomer(customerId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Error deleting customer from Supabase:', error);
        throw error;
      }
      
      console.log('Customer deleted successfully from Supabase');
    }, 'deleteCustomer');
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return null;
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (error) {
          console.error('Error getting customer by id from Supabase:', error);
          throw error;
        }

        if (!data) return null;

        // Transform Supabase data to match our Customer type
        return {
          id: data.id,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          companyName: data.company_name || '',
          address: data.address || '',
          email: data.email || '',
          phone: data.phone || '',
          mobile: data.mobile || '',
          vehicles: data.vehicles || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }, 'getCustomerById');
    } catch (error: any) {
      console.error('Error getting customer by id:', error);
      return null;
    }
  },

  // Reminder settings (can still use local storage for user preferences)
  async getReminderSettings() {
    // For now, return default settings
    // You can implement this with Supabase user preferences table if needed
    return {
      enableEmailReminders: true,
      enableSmsReminders: false,
      reminderDaysBefore: 7,
    };
  },

  async saveReminderSettings(settings: any): Promise<void> {
    // For now, just log
    // You can implement this with Supabase user preferences table if needed
    console.log('Reminder settings:', settings);
  },
};
