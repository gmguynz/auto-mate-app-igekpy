
export interface JobCard {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  notes: string;
  labourCost: number;
  partsCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy?: string;
}

export interface JobCardFormData {
  customerId: string;
  vehicleId: string;
  description: string;
  notes: string;
  labourCost: string;
  partsCost: string;
}
