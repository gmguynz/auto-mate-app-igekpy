
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { storageUtils } from '@/utils/storage';
import { jobCardStorage } from '@/utils/jobCardStorage';
import { Customer, Vehicle } from '@/types/customer';
import { JobCard, JobCardPart, JobCardLabour, Part } from '@/types/jobCard';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddJobCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jobCardId = params.id as string | undefined;
  const preselectedCustomerId = params.customerId as string | undefined;
  const preselectedVehicleId = params.vehicleId as string | undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(0);
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  const [odometer, setOdometer] = useState('');
  const [wofExpiry, setWofExpiry] = useState('');
  const [serviceDueDate, setServiceDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [notes, setNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState<JobCardPart[]>([]);
  const [labourEntries, setLabourEntries] = useState<JobCardLabour[]>([]);
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'wof' | 'service' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  useEffect(() => {
    console.log('Add Job Card screen loaded');
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading customers, technicians, parts, and settings...');
      const [customersData, techniciansData, partsData, settings] = await Promise.all([
        storageUtils.getCustomers(),
        jobCardStorage.getTechnicians(),
        jobCardStorage.getParts(),
        jobCardStorage.getSettings(),
      ]);
      
      setCustomers(customersData);
      setTechnicians(techniciansData);
      setParts(partsData);
      setDefaultHourlyRate(settings.defaultHourlyRate);
      
      // If editing, load job card
      if (jobCardId) {
        const jobCard = await jobCardStorage.getJobCardById(jobCardId);
        if (jobCard) {
          populateFormFromJobCard(jobCard, customersData);
        }
      } else if (preselectedCustomerId) {
        // Preselect customer and vehicle if provided
        const customer = customersData.find(c => c.id === preselectedCustomerId);
        if (customer) {
          setSelectedCustomer(customer);
          if (preselectedVehicleId) {
            const vehicle = customer.vehicles.find(v => v.id === preselectedVehicleId);
            if (vehicle) {
              setSelectedVehicle(vehicle);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateFormFromJobCard = (jobCard: JobCard, customersData: Customer[]) => {
    const customer = customersData.find(c => c.id === jobCard.customerId);
    if (customer) {
      setSelectedCustomer(customer);
      const vehicle = customer.vehicles.find(v => v.id === jobCard.vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
      }
    }
    
    setSelectedTechnicianId(jobCard.technicianId || '');
    setVinNumber(jobCard.vinNumber || '');
    setOdometer(jobCard.odometer?.toString() || '');
    setWofExpiry(jobCard.wofExpiry || '');
    setServiceDueDate(jobCard.serviceDueDate || '');
    setDescription(jobCard.description || '');
    setWorkDone(jobCard.workDone || '');
    setNotes(jobCard.notes);
    setPartsUsed(jobCard.partsUsed || []);
    setLabourEntries(jobCard.labourEntries || []);
  };

  const handleSave = async () => {
    console.log('User tapped Save Job Card button');
    
    // Validation
    if (!selectedCustomer) {
      showErrorModal('Please select a customer');
      return;
    }
    
    if (!selectedVehicle) {
      showErrorModal('Please select a vehicle');
      return;
    }
    
    if (!selectedTechnicianId) {
      showErrorModal('Please select a technician');
      return;
    }

    setSaving(true);
    try {
      const jobCardData: Partial<JobCard> = {
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
        technicianId: selectedTechnicianId,
        vinNumber: vinNumber.trim() || undefined,
        odometer: odometer ? parseInt(odometer) : undefined,
        wofExpiry: wofExpiry || undefined,
        serviceDueDate: serviceDueDate || undefined,
        description: description.trim() || undefined,
        workDone: workDone.trim() || undefined,
        notes: notes.trim(),
        partsUsed,
        labourEntries,
      };

      if (jobCardId) {
        // Update existing job card
        const existingJobCard = await jobCardStorage.getJobCardById(jobCardId);
        if (existingJobCard) {
          await jobCardStorage.updateJobCard({
            ...existingJobCard,
            ...jobCardData,
          } as JobCard);
        }
        console.log('Job card updated successfully');
      } else {
        // Create new job card
        await jobCardStorage.addJobCard(jobCardData, selectedCustomer);
        console.log('Job card created successfully');
      }

      router.back();
    } catch (error: any) {
      console.error('Error saving job card:', error);
      showErrorModal(error.message || 'Failed to save job card');
    } finally {
      setSaving(false);
    }
  };

  const showErrorModal = (message: string) => {
    // Using a simple modal for error display
    console.error('Validation error:', message);
    alert(message);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && datePickerField) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (datePickerField === 'wof') {
        setWofExpiry(dateString);
      } else {
        setServiceDueDate(dateString);
      }
    }
  };

  const handleIOSDatePickerDone = () => {
    if (datePickerField) {
      const dateString = tempDate.toISOString().split('T')[0];
      if (datePickerField === 'wof') {
        setWofExpiry(dateString);
      } else {
        setServiceDueDate(dateString);
      }
    }
    setShowDatePicker(false);
    setDatePickerField(null);
  };

  const showDatePickerFor = (field: 'wof' | 'service') => {
    console.log(`User tapped ${field} date picker`);
    setDatePickerField(field);
    const currentDate = field === 'wof' ? wofExpiry : serviceDueDate;
    setTempDate(currentDate ? new Date(currentDate) : new Date());
    setShowDatePicker(true);
  };

  const addLabourEntry = () => {
    console.log('User tapped Add Labour Entry button');
    const newEntry: JobCardLabour = {
      id: Date.now().toString(),
      description: '',
      hours: 0,
      ratePerHour: defaultHourlyRate,
    };
    setLabourEntries([...labourEntries, newEntry]);
  };

  const updateLabourEntry = (index: number, field: keyof JobCardLabour, value: any) => {
    const updated = [...labourEntries];
    updated[index] = { ...updated[index], [field]: value };
    setLabourEntries(updated);
  };

  const removeLabourEntry = (index: number) => {
    console.log('User tapped Remove Labour Entry button');
    setLabourEntries(labourEntries.filter((_, i) => i !== index));
  };

  const addPartFromModal = (part: Part) => {
    console.log('User selected part:', part.name);
    const newPart: JobCardPart = {
      partId: part.id,
      partName: part.name,
      quantity: 1,
      pricePerUnit: part.sellPrice,
      notes: '',
    };
    setPartsUsed([...partsUsed, newPart]);
    setShowPartModal(false);
    setPartSearch('');
  };

  const updatePartUsed = (index: number, field: keyof JobCardPart, value: any) => {
    const updated = [...partsUsed];
    updated[index] = { ...updated[index], [field]: value };
    setPartsUsed(updated);
  };

  const removePartUsed = (index: number) => {
    console.log('User tapped Remove Part button');
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    const partsCost = partsUsed.reduce((sum, part) => sum + (part.quantity * part.pricePerUnit), 0);
    const labourCost = labourEntries.reduce((sum, labour) => sum + (labour.hours * labour.ratePerHour), 0);
    return partsCost + labourCost;
  };

  const getFilteredCustomers = () => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.firstName.toLowerCase().includes(query) ||
      c.lastName.toLowerCase().includes(query) ||
      c.companyName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  };

  const getFilteredParts = () => {
    if (!partSearch.trim()) return parts;
    const query = partSearch.toLowerCase();
    return parts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const totalCost = calculateTotalCost();
  const selectedTechnician = technicians.find(t => t.id === selectedTechnicianId);
  const customerDisplayName = selectedCustomer 
    ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim())
    : '';
  const vehicleDisplayName = selectedVehicle
    ? `${selectedVehicle.registrationNumber} - ${selectedVehicle.make} ${selectedVehicle.model}`
    : '';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>{jobCardId ? 'Edit Job Card' : 'New Job Card'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
          
          <Text style={styles.label}>Customer *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCustomerModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectButtonText, !selectedCustomer && styles.selectButtonPlaceholder]}>
              {customerDisplayName || 'Select Customer'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Vehicle *</Text>
          <TouchableOpacity
            style={[styles.selectButton, !selectedCustomer && styles.selectButtonDisabled]}
            onPress={() => selectedCustomer && setShowVehicleModal(true)}
            activeOpacity={0.7}
            disabled={!selectedCustomer}
          >
            <Text style={[styles.selectButtonText, !selectedVehicle && styles.selectButtonPlaceholder]}>
              {vehicleDisplayName || 'Select Vehicle'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Technician Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technician</Text>
          
          <Text style={styles.label}>Assigned Technician *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowTechnicianModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectButtonText, !selectedTechnician && styles.selectButtonPlaceholder]}>
              {selectedTechnician?.name || 'Select Technician'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          
          <Text style={styles.label}>VIN Number</Text>
          <TextInput
            style={styles.input}
            value={vinNumber}
            onChangeText={setVinNumber}
            placeholder="Enter VIN number"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Odometer Reading</Text>
          <TextInput
            style={styles.input}
            value={odometer}
            onChangeText={setOdometer}
            placeholder="Enter odometer reading"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.label}>WOF Expiry</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('wof')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateButtonText, !wofExpiry && styles.selectButtonPlaceholder]}>
              {wofExpiry || 'Select WOF expiry date'}
            </Text>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Service Due Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => showDatePickerFor('service')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateButtonText, !serviceDueDate && styles.selectButtonPlaceholder]}>
              {serviceDueDate || 'Select service due date'}
            </Text>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          
          <Text style={styles.label}>Description of Work Required</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the work to be done (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Description of Work Done</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={workDone}
            onChangeText={setWorkDone}
            placeholder="Describe the work that has been completed"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Parts Used */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowPartModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {partsUsed.map((part, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{part.partName}</Text>
                <TouchableOpacity onPress={() => removePartUsed(index)} activeOpacity={0.7}>
                  <IconSymbol
                    ios_icon_name="trash.fill"
                    android_material_icon_name="delete"
                    size={20}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.itemRow}>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Quantity</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={part.quantity.toString()}
                    onChangeText={(text) => updatePartUsed(index, 'quantity', parseFloat(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Price</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={part.pricePerUnit.toString()}
                    onChangeText={(text) => updatePartUsed(index, 'pricePerUnit', parseFloat(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.itemTotal}>{formatCurrency(part.quantity * part.pricePerUnit)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Labour Entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Labour</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addLabourEntry}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {defaultHourlyRate > 0 && (
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                Default hourly rate: {formatCurrency(defaultHourlyRate)}/hr
              </Text>
            </View>
          )}

          {labourEntries.map((labour, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  style={styles.labourDescInput}
                  value={labour.description}
                  onChangeText={(text) => updateLabourEntry(index, 'description', text)}
                  placeholder="Labour description"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity onPress={() => removeLabourEntry(index)} activeOpacity={0.7}>
                  <IconSymbol
                    ios_icon_name="trash.fill"
                    android_material_icon_name="delete"
                    size={20}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.itemRow}>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Hours</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={labour.hours.toString()}
                    onChangeText={(text) => updateLabourEntry(index, 'hours', parseFloat(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Rate/Hr</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={labour.ratePerHour.toString()}
                    onChangeText={(text) => updateLabourEntry(index, 'ratePerHour', parseFloat(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.itemTotal}>{formatCurrency(labour.hours * labour.ratePerHour)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Total Cost */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Cost</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Job Card</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal visible={showCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Search customers..."
              placeholderTextColor={colors.textSecondary}
            />
            <ScrollView style={styles.modalList}>
              {getFilteredCustomers().map((customer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalItem}
                  onPress={() => {
                    console.log('User selected customer:', customer.companyName || customer.firstName);
                    setSelectedCustomer(customer);
                    setSelectedVehicle(null);
                    setShowCustomerModal(false);
                    setCustomerSearch('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>
                    {customer.companyName || `${customer.firstName} ${customer.lastName}`.trim()}
                  </Text>
                  <Text style={styles.modalItemSubtext}>{customer.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal visible={showVehicleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {selectedCustomer?.vehicles.map((vehicle, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalItem}
                  onPress={() => {
                    console.log('User selected vehicle:', vehicle.registrationNumber);
                    setSelectedVehicle(vehicle);
                    setShowVehicleModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>
                    {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.modalItemSubtext}>{vehicle.year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Technician Selection Modal */}
      <Modal visible={showTechnicianModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Technician</Text>
              <TouchableOpacity onPress={() => setShowTechnicianModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {technicians.map((tech, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalItem}
                  onPress={() => {
                    console.log('User selected technician:', tech.name);
                    setSelectedTechnicianId(tech.id);
                    setShowTechnicianModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>{tech.name}</Text>
                  <Text style={styles.modalItemSubtext}>{tech.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Part Selection Modal */}
      <Modal visible={showPartModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Part</Text>
              <TouchableOpacity onPress={() => { setShowPartModal(false); setPartSearch(''); }} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={partSearch}
              onChangeText={setPartSearch}
              placeholder="Search parts..."
              placeholderTextColor={colors.textSecondary}
            />
            <ScrollView style={styles.modalList}>
              {getFilteredParts().map((part, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalItem}
                  onPress={() => addPartFromModal(part)}
                  activeOpacity={0.7}
                >
                  <View style={styles.partModalItem}>
                    <View style={styles.partModalLeft}>
                      <Text style={styles.modalItemText}>{part.name}</Text>
                      <Text style={styles.modalItemSubtext}>
                        {part.sku && `SKU: ${part.sku} • `}Stock: {part.stockQuantity}
                      </Text>
                    </View>
                    <Text style={styles.partPrice}>{formatCurrency(part.sellPrice)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => { setShowDatePicker(false); setDatePickerField(null); }} activeOpacity={0.7}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleIOSDatePickerDone} activeOpacity={0.7}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => date && setTempDate(date)}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  selectButtonPlaceholder: {
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  addButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  labourDescInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemField: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: colors.text,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    paddingTop: 8,
  },
  totalSection: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    margin: 20,
    marginBottom: 0,
    fontSize: 16,
    color: colors.text,
  },
  modalList: {
    flex: 1,
    padding: 20,
  },
  modalItem: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  partModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partModalLeft: {
    flex: 1,
  },
  partPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  datePickerModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerCancel: {
    fontSize: 16,
    color: colors.error,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
