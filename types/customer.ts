
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
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  email: string;
  phone: string;
  mobile: string;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  enableEmailReminders: boolean;
  enableSmsReminders: boolean;
  reminderDaysBefore: number;
}
