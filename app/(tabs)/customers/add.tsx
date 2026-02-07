
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer, Vehicle } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { notificationService } from '@/utils/notificationService';

export default function AddCustomerScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<{
    vehicleIndex: number;
    field: 'inspectionDueDate' | 'serviceDueDate';
  } | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [webDateInput, setWebDateInput] = useState('');

  const addVehicle = () => {
    console.log('User tapped Add Vehicle button');
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      registrationNumber: '',
      make: '',
      model: '',
      year: '',
      inspectionDueDate: '',
      serviceDueDate: '',
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const removeVehicle = (index: number) => {
    console.log('User tapped Remove Vehicle button for vehicle', index);
    const updated = vehicles.filter((_, i) => i !== index);
    setVehicles(updated);
  };

  const updateVehicle = (index: number, field: keyof Vehicle, value: string) => {
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [field]: value };
    setVehicles(updated);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && datePickerMode) {
      const dateString = selectedDate.toISOString().split('T')[0];
      updateVehicle(datePickerMode.vehicleIndex, datePickerMode.field, dateString);
    }
    
    if (Platform.OS === 'android') {
      setDatePickerMode(null);
    }
  };

  const handleIOSDatePickerDone = () => {
    if (datePickerMode) {
      const dateString = tempDate.toISOString().split('T')[0];
      updateVehicle(datePickerMode.vehicleIndex, datePickerMode.field, dateString);
    }
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  const handleWebDatePickerDone = () => {
    if (datePickerMode && webDateInput) {
      updateVehicle(datePickerMode.vehicleIndex, datePickerMode.field, webDateInput);
    }
    setShowDatePicker(false);
    setDatePickerMode(null);
    setWebDateInput('');
  };

  const showDatePickerFor = (
    vehicleIndex: number,
    field: 'inspectionDueDate' | 'serviceDueDate'
  ) => {
    const currentDate = vehicles[vehicleIndex][field] || '';
    setDatePickerMode({ vehicleIndex, field });
    
    if (Platform.OS === 'web') {
      setWebDateInput(currentDate);
    } else {
      setTempDate(currentDate ? new Date(currentDate) : new Date());
    }
    
    setShowDatePicker(true);
  };

  const validateForm = () => {
    if (!firstName.trim() && !lastName.trim() && !companyName.trim()) {
      Alert.alert('Error', 'Please enter at least a name or company name');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return false;
    }

    if (vehicles.length === 0) {
      Alert.alert('Error', 'Please add at least one vehicle');
      return false;
    }

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      if (
        !vehicle.registrationNumber.trim() ||
        !vehicle.make.trim() ||
        !vehicle.model.trim() ||
        !vehicle.year.trim()
      ) {
        Alert.alert('Error', `Please complete all fields for vehicle ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    console.log('User tapped Save button on Add Customer screen');
    if (!validateForm()) {
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
      address: address.trim(),
      email: email.trim(),
      phone: phone.trim(),
      mobile: mobile.trim(),
      vehicles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      console.log('Saving customer:', newCustomer);
      await storageUtils.addCustomer(newCustomer);
      
      // Reschedule all notifications to include the new customer
      console.log('Rescheduling notifications after adding customer...');
      await notificationService.scheduleAllReminders();
      
      Alert.alert('Success', 'Customer added successfully', [
        { text: 'OK', onPress: () => {
          console.log('Customer added successfully, navigating back');
          router.back();
        }},
      ]);
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const renderDatePicker = () => {
    if (!showDatePicker || !datePickerMode) {
      return null;
    }

    const currentDate = vehicles[datePickerMode.vehicleIndex][datePickerMode.field]
      ? new Date(vehicles[datePickerMode.vehicleIndex][datePickerMode.field])
      : new Date();

    if (Platform.OS === 'web') {
      return (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => {
            setShowDatePicker(false);
            setDatePickerMode(null);
            setWebDateInput('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.webDatePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => {
                  setShowDatePicker(false);
                  setDatePickerMode(null);
                  setWebDateInput('');
                }} activeOpacity={0.7}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>
                  {datePickerMode.field === 'inspectionDueDate' ? 'Inspection Due Date' : 'Service Due Date'}
                </Text>
                <TouchableOpacity onPress={handleWebDatePickerDone} activeOpacity={0.7}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.webDatePickerContent}>
                <TextInput
                  style={styles.webDateInput}
                  value={webDateInput}
                  onChangeText={setWebDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <Text style={styles.webDateHint}>Enter date in format: YYYY-MM-DD (e.g., 2024-12-31)</Text>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={handleIOSDatePickerDone}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.iosDatePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleIOSDatePickerDone} activeOpacity={0.7}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => date && setTempDate(date)}
                textColor={colors.text}
                style={styles.iosDatePicker}
              />
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <DateTimePicker
        value={currentDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Company Name (Optional)</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter company name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Mobile</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="Enter mobile number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            <TouchableOpacity onPress={addVehicle} style={styles.addButton} activeOpacity={0.7}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          {vehicles.map((vehicle, index) => (
            <React.Fragment key={vehicle.id}>
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <Text style={styles.vehicleTitle}>Vehicle {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeVehicle(index)} activeOpacity={0.7}>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Registration Number *</Text>
                <TextInput
                  style={styles.input}
                  value={vehicle.registrationNumber}
                  onChangeText={(text) =>
                    updateVehicle(index, 'registrationNumber', text)
                  }
                  placeholder="e.g., ABC123"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Make *</Text>
                <TextInput
                  style={styles.input}
                  value={vehicle.make}
                  onChangeText={(text) => updateVehicle(index, 'make', text)}
                  placeholder="e.g., Toyota"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  value={vehicle.model}
                  onChangeText={(text) => updateVehicle(index, 'model', text)}
                  placeholder="e.g., Camry"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Year *</Text>
                <TextInput
                  style={styles.input}
                  value={vehicle.year}
                  onChangeText={(text) => updateVehicle(index, 'year', text)}
                  placeholder="e.g., 2020"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Inspection Due Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePickerFor(index, 'inspectionDueDate')}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.dateButtonText}>
                    {vehicle.inspectionDueDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Service Due Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePickerFor(index, 'serviceDueDate')}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.dateButtonText}>
                    {vehicle.serviceDueDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          ))}

          {vehicles.length === 0 && (
            <View style={styles.emptyVehicles}>
              <IconSymbol
                ios_icon_name="car"
                android_material_icon_name="directions-car"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No vehicles added yet</Text>
              <Text style={styles.emptySubtext}>
                Tap &quot;Add Vehicle&quot; to get started
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Customer</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderDatePicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
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
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  emptyVehicles: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  iosDatePickerModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  webDatePickerModal: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 500,
    padding: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  iosDatePicker: {
    height: 216,
    backgroundColor: colors.card,
  },
  webDatePickerContent: {
    padding: 20,
  },
  webDateInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  webDateHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
