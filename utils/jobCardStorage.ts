
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { JobCard } from '@/types/jobCard';
import { Customer } from '@/types/customer';

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const TIMEOUT = 15000;

// Helper function to implement retry logic
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`${operationName} - Attempt ${attempt}/${retries}`);
      const startTime = Date.now();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), TIMEOUT);
      });
      
      const result = await Promise.race([operation(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`${operationName} completed in ${duration}ms`);
      
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      
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
        if (isNetworkError) {
          throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
        }
        throw error;
      }
      
      if (isNetworkError) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${retries} attempts`);
}

// Generate unique job number
function generateJobNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `JOB${year}${month}${day}-${random}`;
}

export const jobCardStorage = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  async getJobCards(): Promise<JobCard[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured, returning empty array');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('job_cards')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error getting job cards from Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => ({
          id: item.id,
          jobNumber: item.job_number,
          customerId: item.customer_id,
          customerName: item.customer_name || '',
          customerEmail: item.customer_email || '',
          customerPhone: item.customer_phone || '',
          vehicleId: item.vehicle_id,
          vehicleReg: item.vehicle_reg || '',
          vehicleMake: item.vehicle_make || '',
          vehicleModel: item.vehicle_model || '',
          vehicleYear: item.vehicle_year || '',
          status: item.status,
          description: item.description || '',
          notes: item.notes || '',
          labourCost: parseFloat(item.labour_cost || '0'),
          partsCost: parseFloat(item.parts_cost || '0'),
          totalCost: parseFloat(item.total_cost || '0'),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          completedAt: item.completed_at,
          createdBy: item.created_by,
        }));
      }, 'getJobCards');
    } catch (error: any) {
      console.error('Error getting job cards:', error);
      return [];
    }
  },

  async getJobCardById(jobCardId: string): Promise<JobCard | null> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return null;
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('job_cards')
          .select('*')
          .eq('id', jobCardId)
          .single();

        if (error) {
          console.error('Error getting job card by id from Supabase:', error);
          throw error;
        }

        if (!data) return null;

        return {
          id: data.id,
          jobNumber: data.job_number,
          customerId: data.customer_id,
          customerName: data.customer_name || '',
          customerEmail: data.customer_email || '',
          customerPhone: data.customer_phone || '',
          vehicleId: data.vehicle_id,
          vehicleReg: data.vehicle_reg || '',
          vehicleMake: data.vehicle_make || '',
          vehicleModel: data.vehicle_model || '',
          vehicleYear: data.vehicle_year || '',
          status: data.status,
          description: data.description || '',
          notes: data.notes || '',
          labourCost: parseFloat(data.labour_cost || '0'),
          partsCost: parseFloat(data.parts_cost || '0'),
          totalCost: parseFloat(data.total_cost || '0'),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          completedAt: data.completed_at,
          createdBy: data.created_by,
        };
      }, 'getJobCardById');
    } catch (error: any) {
      console.error('Error getting job card by id:', error);
      return null;
    }
  },

  async addJobCard(jobCard: Partial<JobCard>, customer: Customer): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const vehicle = customer.vehicles.find(v => v.id === jobCard.vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const jobNumber = generateJobNumber();
      const labourCost = jobCard.labourCost || 0;
      const partsCost = jobCard.partsCost || 0;
      const totalCost = labourCost + partsCost;

      const { error } = await supabase.from('job_cards').insert({
        job_number: jobNumber,
        customer_id: jobCard.customerId,
        customer_name: customer.companyName || `${customer.firstName} ${customer.lastName}`.trim(),
        customer_email: customer.email,
        customer_phone: customer.phone || customer.mobile,
        vehicle_id: jobCard.vehicleId,
        vehicle_reg: vehicle.registrationNumber,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        vehicle_year: vehicle.year,
        status: jobCard.status || 'open',
        description: jobCard.description || '',
        notes: jobCard.notes || '',
        labour_cost: labourCost,
        parts_cost: partsCost,
        total_cost: totalCost,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding job card to Supabase:', error);
        throw error;
      }
      
      console.log('Job card added successfully to Supabase');
    }, 'addJobCard');
  },

  async updateJobCard(updatedJobCard: JobCard): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const totalCost = updatedJobCard.labourCost + updatedJobCard.partsCost;
      
      const updateData: any = {
        status: updatedJobCard.status,
        description: updatedJobCard.description,
        notes: updatedJobCard.notes,
        labour_cost: updatedJobCard.labourCost,
        parts_cost: updatedJobCard.partsCost,
        total_cost: totalCost,
        updated_at: new Date().toISOString(),
      };

      if (updatedJobCard.status === 'completed' && !updatedJobCard.completedAt) {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('job_cards')
        .update(updateData)
        .eq('id', updatedJobCard.id);

      if (error) {
        console.error('Error updating job card in Supabase:', error);
        throw error;
      }
      
      console.log('Job card updated successfully in Supabase');
    }, 'updateJobCard');
  },

  async deleteJobCard(jobCardId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('job_cards')
        .delete()
        .eq('id', jobCardId);

      if (error) {
        console.error('Error deleting job card from Supabase:', error);
        throw error;
      }
      
      console.log('Job card deleted successfully from Supabase');
    }, 'deleteJobCard');
  },

  async getJobCardsByCustomer(customerId: string): Promise<JobCard[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('job_cards')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error getting job cards by customer from Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => ({
          id: item.id,
          jobNumber: item.job_number,
          customerId: item.customer_id,
          customerName: item.customer_name || '',
          customerEmail: item.customer_email || '',
          customerPhone: item.customer_phone || '',
          vehicleId: item.vehicle_id,
          vehicleReg: item.vehicle_reg || '',
          vehicleMake: item.vehicle_make || '',
          vehicleModel: item.vehicle_model || '',
          vehicleYear: item.vehicle_year || '',
          status: item.status,
          description: item.description || '',
          notes: item.notes || '',
          labourCost: parseFloat(item.labour_cost || '0'),
          partsCost: parseFloat(item.parts_cost || '0'),
          totalCost: parseFloat(item.total_cost || '0'),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          completedAt: item.completed_at,
          createdBy: item.created_by,
        }));
      }, 'getJobCardsByCustomer');
    } catch (error: any) {
      console.error('Error getting job cards by customer:', error);
      return [];
    }
  },
};
