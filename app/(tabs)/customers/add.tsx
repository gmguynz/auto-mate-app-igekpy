
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
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer, Vehicle } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { dateUtils } from '@/utils/dateUtils';

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
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    vehicleIndex: number;
    field: 'inspection' | 'service';
  }>({ show: false, vehicleIndex: -1, field: 'inspection' });

  const addVehicle = () => {
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
      setShowDatePicker({ show: false, vehicleIndex: -1, field: 'inspection' });
    }

    if (selectedDate && showDatePicker.vehicleIndex >= 0) {
      const dateString = dateUtils.toISODateString(selectedDate);
      const field =
        showDatePicker.field === 'inspection'
          ? 'inspectionDueDate'
          : 'serviceDueDate';
      updateVehicle(showDatePicker.vehicleIndex, field, dateString);
    }

    if (Platform.OS === 'ios') {
      // Keep picker open on iOS
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker({ show: false, vehicleIndex: -1, field: 'inspection' });
  };

  const validateAndSave = async () => {
    if (!firstName.trim() && !companyName.trim()) {
      Alert.alert('Error', 'Please enter either a first name or company name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter customer email');
      return;
    }
    if (!phone.trim() && !mobile.trim()) {
      Alert.alert('Error', 'Please enter at least one phone number');
      return;
    }
    if (vehicles.length === 0) {
      Alert.alert('Error', 'Please add at least one vehicle');
      return;
    }

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.registrationNumber.trim()) {
        Alert.alert('Error', `Please enter registration number for vehicle ${i + 1}`);
        return;
      }
      if (!v.make.trim()) {
        Alert.alert('Error', `Please enter make for vehicle ${i + 1}`);
        return;
      }
      if (!v.model.trim()) {
        Alert.alert('Error', `Please enter model for vehicle ${i + 1}`);
        return;
      }
      if (!v.year.trim()) {
        Alert.alert('Error', `Please enter year for vehicle ${i + 1}`);
        return;
      }
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

    await storageUtils.addCustomer(newCustomer);
    Alert.alert('Success', 'Customer added successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Add Customer</Text>
        <View style={{ width: 40 }} />
      </View>

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
            placeholder="John"
            placeholderTextColor={colors.textSecondary}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            placeholderTextColor={colors.textSecondary}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.label}>Company Name (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC Motors Ltd"
            placeholderTextColor={colors.textSecondary}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main St, City, State"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 234 567 8900"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 234 567 8901"
            placeholderTextColor={colors.textSecondary}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            <TouchableOpacity onPress={addVehicle} style={styles.addButton}>
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
            <React.Fragment key={index}>
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <Text style={styles.vehicleTitle}>Vehicle {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeVehicle(index)}>
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
                  placeholder="ABC-123"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicle.registrationNumber}
                  onChangeText={(text) =>
                    updateVehicle(index, 'registrationNumber', text)
                  }
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Make *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Toyota"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicle.make}
                  onChangeText={(text) => updateVehicle(index, 'make', text)}
                />

                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Camry"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicle.model}
                  onChangeText={(text) => updateVehicle(index, 'model', text)}
                />

                <Text style={styles.label}>Year *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2020"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicle.year}
                  onChangeText={(text) => updateVehicle(index, 'year', text)}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Inspection Due Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() =>
                    setShowDatePicker({ show: true, vehicleIndex: index, field: 'inspection' })
                  }
                >
                  <Text style={styles.dateButtonText}>
                    {vehicle.inspectionDueDate
                      ? dateUtils.formatDate(vehicle.inspectionDueDate)
                      : 'Select Date'}
                  </Text>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.label}>Service Due Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() =>
                    setShowDatePicker({ show: true, vehicleIndex: index, field: 'service' })
                  }
                >
                  <Text style={styles.dateButtonText}>
                    {vehicle.serviceDueDate
                      ? dateUtils.formatDate(vehicle.serviceDueDate)
                      : 'Select Date'}
                  </Text>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={colors.primary}
                  />
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

        <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
          <Text style={styles.saveButtonText}>Save Customer</Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker.show && (
        <View style={styles.datePickerContainer}>
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={closeDatePicker}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          <DateTimePicker
            value={
              showDatePicker.vehicleIndex >= 0 &&
              vehicles[showDatePicker.vehicleIndex]
                ? new Date(
                    vehicles[showDatePicker.vehicleIndex][
                      showDatePicker.field === 'inspection'
                        ? 'inspectionDueDate'
                        : 'serviceDueDate'
                    ] || Date.now()
                  )
                : new Date()
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        </View>
      )}
    </View>
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
    fontSize: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
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
    marginBottom: 8,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  emptyVehicles: {
    alignItems: 'center',
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
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
  },
  datePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
