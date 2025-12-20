
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Customer } from '@/types/customer';

export const supabaseStorage = {
  // Check if Supabase is properly configured
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return [];
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting customers from Supabase:', error);
        return [];
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
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  },

  async addCustomer(customer: Customer): Promise<void> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

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
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },

  async updateCustomer(updatedCustomer: Customer): Promise<void> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

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
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Error deleting customer from Supabase:', error);
        throw error;
      }
      
      console.log('Customer deleted successfully from Supabase');
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return null;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error getting customer by id from Supabase:', error);
        return null;
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
    } catch (error) {
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
