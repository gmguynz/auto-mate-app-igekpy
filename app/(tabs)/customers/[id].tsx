
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer, Vehicle } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { dateUtils } from '@/utils/dateUtils';
import { notificationService } from '@/utils/notificationService';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    vehicleIndex: number;
    field: 'inspection' | 'service';
  }>({ show: false, vehicleIndex: -1, field: 'inspection' });

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (typeof id === 'string') {
      const data = await storageUtils.getCustomerById(id);
      setCustomer(data);
      setEditedCustomer(data);
    }
  };

  const handleSave = async () => {
    if (!editedCustomer) return;

    if (!editedCustomer.firstName.trim() && !editedCustomer.companyName.trim()) {
      Alert.alert('Error', 'Please enter either a first name or company name');
      return;
    }
    if (!editedCustomer.email.trim()) {
      Alert.alert('Error', 'Please enter customer email');
      return;
    }
    if (!editedCustomer.phone.trim() && !editedCustomer.mobile.trim()) {
      Alert.alert('Error', 'Please enter at least one phone number');
      return;
    }

    const updated = {
      ...editedCustomer,
      updatedAt: new Date().toISOString(),
    };

    await storageUtils.updateCustomer(updated);
    
    // Reschedule all notifications to reflect the updated customer data
    console.log('Rescheduling notifications after updating customer...');
    await notificationService.scheduleAllReminders();
    
    setCustomer(updated);
    setIsEditing(false);
    Alert.alert('Success', 'Customer updated successfully');
  };

  const handleCancel = () => {
    setEditedCustomer(customer);
    setIsEditing(false);
  };

  const updateField = (field: keyof Customer, value: any) => {
    if (editedCustomer) {
      setEditedCustomer({ ...editedCustomer, [field]: value });
    }
  };

  const updateVehicle = (index: number, field: keyof Vehicle, value: string) => {
    if (editedCustomer) {
      const updated = [...editedCustomer.vehicles];
      updated[index] = { ...updated[index], [field]: value };
      setEditedCustomer({ ...editedCustomer, vehicles: updated });
    }
  };

  const addVehicle = () => {
    if (editedCustomer) {
      const newVehicle: Vehicle = {
        id: Date.now().toString(),
        registrationNumber: '',
        make: '',
        model: '',
        year: '',
        inspectionDueDate: '',
        serviceDueDate: '',
      };
      setEditedCustomer({
        ...editedCustomer,
        vehicles: [...editedCustomer.vehicles, newVehicle],
      });
    }
  };

  const removeVehicle = (index: number) => {
    if (editedCustomer) {
      const updated = editedCustomer.vehicles.filter((_, i) => i !== index);
      setEditedCustomer({ ...editedCustomer, vehicles: updated });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker({ show: false, vehicleIndex: -1, field: 'inspection' });
    }

    if (selectedDate && showDatePicker.vehicleIndex >= 0 && editedCustomer) {
      const dateString = dateUtils.toISODateString(selectedDate);
      const field =
        showDatePicker.field === 'inspection'
          ? 'inspectionDueDate'
          : 'serviceDueDate';
      updateVehicle(showDatePicker.vehicleIndex, field, dateString);
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker({ show: false, vehicleIndex: -1, field: 'inspection' });
  };

  const getCustomerDisplayName = (cust: Customer) => {
    if (cust.companyName) {
      return cust.companyName;
    }
    return `${cust.firstName} ${cust.lastName}`.trim();
  };

  if (!customer || !editedCustomer) {
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
          <Text style={styles.title}>Customer Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>{getCustomerDisplayName(customer)}</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <Text style={styles.label}>First Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.firstName}
              onChangeText={(text) => updateField('firstName', text)}
            />
          ) : (
            <Text style={styles.value}>{customer.firstName || 'Not provided'}</Text>
          )}

          <Text style={styles.label}>Last Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.lastName}
              onChangeText={(text) => updateField('lastName', text)}
            />
          ) : (
            <Text style={styles.value}>{customer.lastName || 'Not provided'}</Text>
          )}

          <Text style={styles.label}>Company Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.companyName}
              onChangeText={(text) => updateField('companyName', text)}
            />
          ) : (
            <Text style={styles.value}>{customer.companyName || 'Not provided'}</Text>
          )}

          <Text style={styles.label}>Address</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.address}
              onChangeText={(text) => updateField('address', text)}
              multiline
            />
          ) : (
            <Text style={styles.value}>{customer.address || 'Not provided'}</Text>
          )}

          <Text style={styles.label}>Email</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.email}
              onChangeText={(text) => updateField('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{customer.email}</Text>
          )}

          <Text style={styles.label}>Phone Number</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.phone}
              onChangeText={(text) => updateField('phone', text)}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{customer.phone || 'Not provided'}</Text>
          )}

          <Text style={styles.label}>Mobile Number</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCustomer.mobile}
              onChangeText={(text) => updateField('mobile', text)}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{customer.mobile || 'Not provided'}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            {isEditing && (
              <TouchableOpacity onPress={addVehicle} style={styles.addButton}>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          {(isEditing ? editedCustomer.vehicles : customer.vehicles).map(
            (vehicle, index) => (
              <React.Fragment key={index}>
                <View style={styles.vehicleCard}>
                  {isEditing && (
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
                  )}

                  <Text style={styles.label}>Registration Number</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={vehicle.registrationNumber}
                      onChangeText={(text) =>
                        updateVehicle(index, 'registrationNumber', text)
                      }
                      autoCapitalize="characters"
                    />
                  ) : (
                    <Text style={styles.value}>{vehicle.registrationNumber}</Text>
                  )}

                  <Text style={styles.label}>Make</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={vehicle.make}
                      onChangeText={(text) => updateVehicle(index, 'make', text)}
                    />
                  ) : (
                    <Text style={styles.value}>{vehicle.make}</Text>
                  )}

                  <Text style={styles.label}>Model</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={vehicle.model}
                      onChangeText={(text) => updateVehicle(index, 'model', text)}
                    />
                  ) : (
                    <Text style={styles.value}>{vehicle.model}</Text>
                  )}

                  <Text style={styles.label}>Year</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={vehicle.year}
                      onChangeText={(text) => updateVehicle(index, 'year', text)}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.value}>{vehicle.year}</Text>
                  )}

                  <Text style={styles.label}>Inspection Due Date</Text>
                  {isEditing ? (
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() =>
                        setShowDatePicker({
                          show: true,
                          vehicleIndex: index,
                          field: 'inspection',
                        })
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
                  ) : (
                    <View style={styles.dateDisplay}>
                      <Text
                        style={[
                          styles.value,
                          dateUtils.isOverdue(vehicle.inspectionDueDate) &&
                            styles.overdueText,
                          dateUtils.isDueSoon(vehicle.inspectionDueDate) &&
                            styles.dueSoonText,
                        ]}
                      >
                        {dateUtils.formatDate(vehicle.inspectionDueDate)}
                      </Text>
                      {dateUtils.isOverdue(vehicle.inspectionDueDate) && (
                        <View style={styles.statusBadge}>
                          <Text style={styles.overdueLabel}>OVERDUE</Text>
                        </View>
                      )}
                      {dateUtils.isDueSoon(vehicle.inspectionDueDate) && (
                        <View style={[styles.statusBadge, styles.dueSoonBadge]}>
                          <Text style={styles.dueSoonLabel}>
                            Due in {dateUtils.getDaysUntil(vehicle.inspectionDueDate)}{' '}
                            days
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={styles.label}>Service Due Date</Text>
                  {isEditing ? (
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() =>
                        setShowDatePicker({
                          show: true,
                          vehicleIndex: index,
                          field: 'service',
                        })
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
                  ) : (
                    <View style={styles.dateDisplay}>
                      <Text
                        style={[
                          styles.value,
                          dateUtils.isOverdue(vehicle.serviceDueDate) &&
                            styles.overdueText,
                          dateUtils.isDueSoon(vehicle.serviceDueDate) &&
                            styles.dueSoonText,
                        ]}
                      >
                        {dateUtils.formatDate(vehicle.serviceDueDate)}
                      </Text>
                      {dateUtils.isOverdue(vehicle.serviceDueDate) && (
                        <View style={styles.statusBadge}>
                          <Text style={styles.overdueLabel}>OVERDUE</Text>
                        </View>
                      )}
                      {dateUtils.isDueSoon(vehicle.serviceDueDate) && (
                        <View style={[styles.statusBadge, styles.dueSoonBadge]}>
                          <Text style={styles.dueSoonLabel}>
                            Due in {dateUtils.getDaysUntil(vehicle.serviceDueDate)} days
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </React.Fragment>
            )
          )}
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
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
              editedCustomer.vehicles[showDatePicker.vehicleIndex]
                ? new Date(
                    editedCustomer.vehicles[showDatePicker.vehicleIndex][
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
  editButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
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
    padding: 8,
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
  dateDisplay: {
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dueSoonBadge: {
    backgroundColor: colors.highlight,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '600',
  },
  dueSoonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  overdueLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.error,
  },
  dueSoonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  buttonContainer: {
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
