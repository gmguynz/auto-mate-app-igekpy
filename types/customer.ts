
export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  inspectionDueDate: string;
  serviceDueDate: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  enableEmailReminders: boolean;
  enableSmsReminders: boolean;
  reminderDaysBefore: number;
}
