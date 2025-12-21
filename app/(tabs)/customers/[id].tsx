
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
  Modal,
  ActivityIndicator,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferVehicleIndex, setTransferVehicleIndex] = useState(-1);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState<Customer | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  useEffect(() => {
    loadCustomer();
    loadAllCustomers();
  }, [id]);

  const loadCustomer = async () => {
    if (typeof id === 'string') {
      const data = await storageUtils.getCustomerById(id);
      setCustomer(data);
      setEditedCustomer(data);
    }
  };

  const loadAllCustomers = async () => {
    const customers = await storageUtils.getCustomers();
    setAllCustomers(customers);
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

  const handleTransferVehicle = (vehicleIndex: number) => {
    setTransferVehicleIndex(vehicleIndex);
    setShowTransferModal(true);
    setSelectedNewOwner(null);
    setCustomerSearchQuery('');
  };

  const confirmTransferVehicle = async () => {
    if (!customer || !selectedNewOwner || transferVehicleIndex < 0) return;

    setTransferring(true);
    try {
      const vehicleToTransfer = customer.vehicles[transferVehicleIndex];
      
      // Remove vehicle from current owner
      const updatedCurrentOwner = {
        ...customer,
        vehicles: customer.vehicles.filter((_, i) => i !== transferVehicleIndex),
        updatedAt: new Date().toISOString(),
      };

      // Add vehicle to new owner
      const updatedNewOwner = {
        ...selectedNewOwner,
        vehicles: [...selectedNewOwner.vehicles, vehicleToTransfer],
        updatedAt: new Date().toISOString(),
      };

      // Update both customers
      await storageUtils.updateCustomer(updatedCurrentOwner);
      await storageUtils.updateCustomer(updatedNewOwner);

      // Reschedule notifications
      console.log('Rescheduling notifications after vehicle transfer...');
      await notificationService.scheduleAllReminders();

      Alert.alert(
        'Success',
        `Vehicle ${vehicleToTransfer.registrationNumber} has been transferred to ${getCustomerDisplayName(selectedNewOwner)}`
      );

      setShowTransferModal(false);
      setTransferVehicleIndex(-1);
      setSelectedNewOwner(null);
      
      // Reload customer data
      await loadCustomer();
      await loadAllCustomers();
    } catch (error) {
      console.error('Error transferring vehicle:', error);
      Alert.alert('Error', 'Failed to transfer vehicle. Please try again.');
    } finally {
      setTransferring(false);
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

  const getFilteredVehicles = () => {
    if (!customer || !searchQuery.trim()) {
      return customer?.vehicles || [];
    }
    const query = searchQuery.toLowerCase();
    return customer.vehicles.filter(
      (vehicle) =>
        vehicle.registrationNumber.toLowerCase().includes(query) ||
        vehicle.make.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query)
    );
  };

  const getFilteredCustomers = () => {
    if (!customerSearchQuery.trim()) {
      return allCustomers.filter((c) => c.id !== customer?.id);
    }
    const query = customerSearchQuery.toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.id !== customer?.id &&
        (c.firstName.toLowerCase().includes(query) ||
          c.lastName.toLowerCase().includes(query) ||
          c.companyName.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query))
    );
  };

  const renderDatePicker = () => {
    if (!showDatePicker.show || showDatePicker.vehicleIndex < 0 || !editedCustomer) {
      return null;
    }

    const vehicle = editedCustomer.vehicles[showDatePicker.vehicleIndex];
    const dateField = showDatePicker.field === 'inspection' ? 'inspectionDueDate' : 'serviceDueDate';
    const currentDate = vehicle[dateField] ? new Date(vehicle[dateField]) : new Date();

    if (Platform.OS === 'ios') {
      return (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker.show}
          onRequestClose={closeDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeDatePicker} activeOpacity={0.7}>
                  <Text style={styles.modalDoneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor={colors.text}
                style={styles.iosDatePicker}
                minimumDate={new Date()}
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
        minimumDate={new Date()}
      />
    );
  };

  if (!customer || !editedCustomer) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const filteredVehicles = getFilteredVehicles();
  const displayVehicles = isEditing ? editedCustomer.vehicles : filteredVehicles;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>{getCustomerDisplayName(customer)}</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton} activeOpacity={0.7}>
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

      {!isEditing && customer.vehicles.length > 0 && (
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <View style={styles.infoCard}>
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Vehicles {!isEditing && searchQuery && `(${filteredVehicles.length})`}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={addVehicle} style={styles.addButton} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          {displayVehicles.map((vehicle, index) => (
            <React.Fragment key={index}>
              <View style={styles.vehicleCard}>
                {isEditing && (
                  <View style={styles.vehicleHeader}>
                    <Text style={styles.vehicleTitle}>Vehicle {index + 1}</Text>
                    <View style={styles.vehicleActions}>
                      <TouchableOpacity 
                        onPress={() => handleTransferVehicle(index)}
                        style={styles.transferButton}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.right.circle"
                          android_material_icon_name="swap-horiz"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.transferButtonText}>Transfer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeVehicle(index)} activeOpacity={0.7}>
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={20}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
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

                <Text style={styles.label}>WOF Inspection Due Date</Text>
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
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.dateButtonText}>
                      {vehicle.inspectionDueDate
                        ? dateUtils.formatDate(vehicle.inspectionDueDate)
                        : 'Select Date'}
                    </Text>
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
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.dateButtonText}>
                      {vehicle.serviceDueDate
                        ? dateUtils.formatDate(vehicle.serviceDueDate)
                        : 'Select Date'}
                    </Text>
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
          ))}
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderDatePicker()}

      {/* Transfer Vehicle Modal */}
      <Modal
        visible={showTransferModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.transferModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Vehicle</Text>
              <TouchableOpacity 
                onPress={() => setShowTransferModal(false)} 
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.transferModalBody}>
              {transferVehicleIndex >= 0 && customer && (
                <View style={styles.transferInfo}>
                  <Text style={styles.transferInfoText}>
                    Transfer vehicle{' '}
                    <Text style={styles.transferInfoBold}>
                      {customer.vehicles[transferVehicleIndex].registrationNumber}
                    </Text>{' '}
                    to a new owner
                  </Text>
                </View>
              )}

              <View style={styles.searchContainer}>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customers..."
                  placeholderTextColor={colors.textSecondary}
                  value={customerSearchQuery}
                  onChangeText={setCustomerSearchQuery}
                />
                {customerSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setCustomerSearchQuery('')}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="xmark.circle.fill"
                      android_material_icon_name="cancel"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.customerList}>
                {getFilteredCustomers().map((cust, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.customerItem,
                        selectedNewOwner?.id === cust.id && styles.customerItemSelected,
                      ]}
                      onPress={() => setSelectedNewOwner(cust)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.customerItemInfo}>
                        <Text style={styles.customerItemName}>
                          {getCustomerDisplayName(cust)}
                        </Text>
                        <Text style={styles.customerItemEmail}>{cust.email}</Text>
                      </View>
                      {selectedNewOwner?.id === cust.id && (
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.transferConfirmButton,
                  (!selectedNewOwner || transferring) && styles.transferConfirmButtonDisabled,
                ]}
                onPress={confirmTransferVehicle}
                disabled={!selectedNewOwner || transferring}
                activeOpacity={0.7}
              >
                {transferring ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.transferConfirmButtonText}>
                    Transfer Vehicle
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  editButton: {
    padding: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    cursor: Platform.OS === 'web' ? 'text' : undefined,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
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
    marginTop: 12,
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
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    cursor: Platform.OS === 'web' ? 'text' : undefined,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  },
  addButton: {
    padding: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
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
  vehicleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.highlight,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  transferButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
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
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalDoneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  iosDatePicker: {
    height: 216,
    backgroundColor: colors.card,
  },
  transferModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  transferModalBody: {
    padding: 20,
    flex: 1,
  },
  transferInfo: {
    backgroundColor: colors.highlight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  transferInfoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  transferInfoBold: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  customerList: {
    flex: 1,
    marginBottom: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  customerItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.highlight,
  },
  customerItemInfo: {
    flex: 1,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  customerItemEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  transferConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  transferConfirmButtonDisabled: {
    opacity: 0.6,
    cursor: Platform.OS === 'web' ? 'not-allowed' : undefined,
  },
  transferConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
});
