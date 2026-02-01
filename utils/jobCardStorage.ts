
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { JobCard, Part, JobCardPart, JobCardLabour, AppSettings } from '@/types/jobCard';
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
          .select(`
            *,
            technician:user_profiles!job_cards_technician_id_fkey(full_name)
          `)
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
          technicianId: item.technician_id || undefined,
          technicianName: item.technician?.full_name || undefined,
          vinNumber: item.vin_number || undefined,
          odometer: item.odometer || undefined,
          wofExpiry: item.wof_expiry || undefined,
          serviceDueDate: item.service_due_date || undefined,
          status: item.status,
          description: item.description || undefined,
          workDone: item.work_done || undefined,
          notes: item.notes || '',
          partsUsed: item.parts_used || [],
          labourEntries: item.labour_entries || [],
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
          .select(`
            *,
            technician:user_profiles!job_cards_technician_id_fkey(full_name)
          `)
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
          technicianId: data.technician_id || undefined,
          technicianName: data.technician?.full_name || undefined,
          vinNumber: data.vin_number || undefined,
          odometer: data.odometer || undefined,
          wofExpiry: data.wof_expiry || undefined,
          serviceDueDate: data.service_due_date || undefined,
          status: data.status,
          description: data.description || undefined,
          workDone: data.work_done || undefined,
          notes: data.notes || '',
          partsUsed: data.parts_used || [],
          labourEntries: data.labour_entries || [],
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
      
      // Calculate costs
      const partsCost = (jobCard.partsUsed || []).reduce((sum, part) => sum + (part.quantity * part.pricePerUnit), 0);
      const labourCost = (jobCard.labourEntries || []).reduce((sum, labour) => sum + (labour.hours * labour.ratePerHour), 0);
      const totalCost = partsCost + labourCost;

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
        technician_id: jobCard.technicianId || null,
        vin_number: jobCard.vinNumber || null,
        odometer: jobCard.odometer || null,
        wof_expiry: jobCard.wofExpiry || null,
        service_due_date: jobCard.serviceDueDate || null,
        status: jobCard.status || 'open',
        description: jobCard.description || null,
        work_done: jobCard.workDone || null,
        notes: jobCard.notes || '',
        parts_used: jobCard.partsUsed || [],
        labour_entries: jobCard.labourEntries || [],
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
      
      console.log('Job card added successfully to Supabase with job number:', jobNumber);
    }, 'addJobCard');
  },

  async updateJobCard(updatedJobCard: JobCard): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      // Calculate costs
      const partsCost = (updatedJobCard.partsUsed || []).reduce((sum, part) => sum + (part.quantity * part.pricePerUnit), 0);
      const labourCost = (updatedJobCard.labourEntries || []).reduce((sum, labour) => sum + (labour.hours * labour.ratePerHour), 0);
      const totalCost = partsCost + labourCost;
      
      const updateData: any = {
        technician_id: updatedJobCard.technicianId || null,
        vin_number: updatedJobCard.vinNumber || null,
        odometer: updatedJobCard.odometer || null,
        wof_expiry: updatedJobCard.wofExpiry || null,
        service_due_date: updatedJobCard.serviceDueDate || null,
        status: updatedJobCard.status,
        description: updatedJobCard.description || null,
        work_done: updatedJobCard.workDone || null,
        notes: updatedJobCard.notes,
        parts_used: updatedJobCard.partsUsed || [],
        labour_entries: updatedJobCard.labourEntries || [],
        labour_cost: labourCost,
        parts_cost: partsCost,
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
          .select(`
            *,
            technician:user_profiles!job_cards_technician_id_fkey(full_name)
          `)
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
          technicianId: item.technician_id || undefined,
          technicianName: item.technician?.full_name || undefined,
          vinNumber: item.vin_number || undefined,
          odometer: item.odometer || undefined,
          wofExpiry: item.wof_expiry || undefined,
          serviceDueDate: item.service_due_date || undefined,
          status: item.status,
          description: item.description || undefined,
          workDone: item.work_done || undefined,
          notes: item.notes || '',
          partsUsed: item.parts_used || [],
          labourEntries: item.labour_entries || [],
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

  // Parts management
  async getParts(): Promise<Part[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('parts')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error getting parts from Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || undefined,
          stockQuantity: item.stock_quantity,
          costPrice: parseFloat(item.cost_price),
          sellPrice: parseFloat(item.sell_price),
          supplier: item.supplier || undefined,
          sku: item.sku || undefined,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }, 'getParts');
    } catch (error: any) {
      console.error('Error getting parts:', error);
      return [];
    }
  },

  async searchParts(query: string): Promise<Part[]> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('parts')
          .select('*')
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error searching parts from Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || undefined,
          stockQuantity: item.stock_quantity,
          costPrice: parseFloat(item.cost_price),
          sellPrice: parseFloat(item.sell_price),
          supplier: item.supplier || undefined,
          sku: item.sku || undefined,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }, 'searchParts');
    } catch (error: any) {
      console.error('Error searching parts:', error);
      return [];
    }
  },

  async addPart(part: Partial<Part>): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase.from('parts').insert({
        name: part.name,
        description: part.description || null,
        stock_quantity: part.stockQuantity || 0,
        cost_price: part.costPrice || 0,
        sell_price: part.sellPrice || 0,
        supplier: part.supplier || null,
        sku: part.sku || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding part to Supabase:', error);
        throw error;
      }
      
      console.log('Part added successfully to Supabase');
    }, 'addPart');
  },

  async updatePart(updatedPart: Part): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('parts')
        .update({
          name: updatedPart.name,
          description: updatedPart.description || null,
          stock_quantity: updatedPart.stockQuantity,
          cost_price: updatedPart.costPrice,
          sell_price: updatedPart.sellPrice,
          supplier: updatedPart.supplier || null,
          sku: updatedPart.sku || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedPart.id);

      if (error) {
        console.error('Error updating part in Supabase:', error);
        throw error;
      }
      
      console.log('Part updated successfully in Supabase');
    }, 'updatePart');
  },

  async deletePart(partId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId);

      if (error) {
        console.error('Error deleting part from Supabase:', error);
        throw error;
      }
      
      console.log('Part deleted successfully from Supabase');
    }, 'deletePart');
  },

  // Get technicians for selection
  async getTechnicians(): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured');
        return [];
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('role', ['admin', 'user', 'technician'])
          .order('full_name', { ascending: true });

        if (error) {
          console.error('Error getting technicians from Supabase:', error);
          throw error;
        }

        return (data || []).map((item: any) => ({
          id: item.id,
          name: item.full_name || item.email,
          email: item.email,
        }));
      }, 'getTechnicians');
    } catch (error: any) {
      console.error('Error getting technicians:', error);
      return [];
    }
  },

  // App Settings
  async getSettings(): Promise<AppSettings> {
    try {
      if (!this.isConfigured()) {
        console.log('Supabase not configured, returning default settings');
        return { defaultHourlyRate: 0 };
      }

      return await retryOperation(async () => {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('key', 'default_hourly_rate')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error getting settings from Supabase:', error);
          throw error;
        }

        return {
          defaultHourlyRate: data ? parseFloat(data.value) : 0,
        };
      }, 'getSettings');
    } catch (error: any) {
      console.error('Error getting settings:', error);
      return { defaultHourlyRate: 0 };
    }
  },

  async updateSettings(settings: AppSettings): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Database not configured. Please contact your administrator.');
    }

    await retryOperation(async () => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'default_hourly_rate',
          value: settings.defaultHourlyRate.toString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Error updating settings in Supabase:', error);
        throw error;
      }
      
      console.log('Settings updated successfully in Supabase');
    }, 'updateSettings');
  },
};
