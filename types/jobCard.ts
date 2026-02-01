
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
  technicianId?: string;
  technicianName?: string;
  vinNumber?: string;
  odometer?: number;
  wofExpiry?: string;
  serviceDueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  notes: string;
  partsUsed: JobCardPart[];
  labourEntries: JobCardLabour[];
  labourCost: number;
  partsCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy?: string;
}

export interface JobCardPart {
  partId: string;
  partName: string;
  quantity: number;
  pricePerUnit: number;
  notes?: string;
}

export interface JobCardLabour {
  id: string;
  description: string;
  hours: number;
  ratePerHour: number;
}

export interface Part {
  id: string;
  name: string;
  description?: string;
  stockQuantity: number;
  costPrice: number;
  sellPrice: number;
  supplier?: string;
  sku?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCardFormData {
  customerId: string;
  vehicleId: string;
  technicianId: string;
  vinNumber: string;
  odometer: string;
  wofExpiry: string;
  serviceDueDate: string;
  description: string;
  notes: string;
  partsUsed: JobCardPart[];
  labourEntries: JobCardLabour[];
}
