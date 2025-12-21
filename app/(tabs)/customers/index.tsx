
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { dateUtils } from '@/utils/dateUtils';
import { useFocusEffect } from '@react-navigation/native';
import { notificationService } from '@/utils/notificationService';

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCustomers = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      console.log('Loading customers...');
      const startTime = Date.now();
      const data = await storageUtils.getCustomers();
      const endTime = Date.now();
      console.log(`Loaded ${data.length} customers in ${endTime - startTime}ms`);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(
        (customer) =>
          customer.firstName.toLowerCase().includes(query) ||
          customer.lastName.toLowerCase().includes(query) ||
          customer.companyName.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          customer.mobile.toLowerCase().includes(query) ||
          customer.vehicles.some(
            (v) =>
              v.registrationNumber.toLowerCase().includes(query) ||
              v.make.toLowerCase().includes(query) ||
              v.model.toLowerCase().includes(query)
          )
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customerName}? This will also remove all their vehicles and reminders.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(customerId);
            try {
              console.log('Deleting customer:', customerId);
              await storageUtils.deleteCustomer(customerId);
              console.log('Customer deleted, rescheduling notifications...');
              await notificationService.scheduleAllReminders();
              console.log('Reloading customers...');
              await loadCustomers(false);
              Alert.alert('Success', 'Customer deleted successfully');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const getUpcomingReminders = (customer: Customer) => {
    const reminders: string[] = [];
    customer.vehicles.forEach((vehicle) => {
      if (dateUtils.isOverdue(vehicle.inspectionDueDate)) {
        reminders.push(`${vehicle.registrationNumber} - Inspection OVERDUE`);
      } else if (dateUtils.isDueSoon(vehicle.inspectionDueDate)) {
        reminders.push(
          `${vehicle.registrationNumber} - Inspection due in ${dateUtils.getDaysUntil(
            vehicle.inspectionDueDate
          )} days`
        );
      }
      if (dateUtils.isOverdue(vehicle.serviceDueDate)) {
        reminders.push(`${vehicle.registrationNumber} - Service OVERDUE`);
      } else if (dateUtils.isDueSoon(vehicle.serviceDueDate)) {
        reminders.push(
          `${vehicle.registrationNumber} - Service due in ${dateUtils.getDaysUntil(
            vehicle.serviceDueDate
          )} days`
        );
      }
    });
    return reminders;
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.companyName) {
      return customer.companyName;
    }
    return `${customer.firstName} ${customer.lastName}`.trim();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Customer Database</Text>
              <Text style={styles.subtitle}>Loading...</Text>
            </View>
            <TouchableOpacity
              style={styles.remindersButton}
              onPress={() => router.push('/customers/reminders')}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Customer Database</Text>
            <Text style={styles.subtitle}>
              {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.remindersButton}
            onPress={() => router.push('/customers/reminders')}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

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
          placeholder="Search by name, company, vehicle reg..."
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.crop.circle.badge.plus"
              android_material_icon_name="person-add"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first customer to get started'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer, index) => {
            const reminders = getUpcomingReminders(customer);
            const displayName = getCustomerDisplayName(customer);
            const isDeleting = deletingId === customer.id;
            return (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[styles.customerCard, isDeleting && styles.customerCardDeleting]}
                  onPress={() => router.push(`/customers/${customer.id}`)}
                  activeOpacity={0.7}
                  disabled={isDeleting}
                >
                  <View style={styles.customerHeader}>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{displayName}</Text>
                      {customer.companyName && (
                        <Text style={styles.customerDetail}>
                          <IconSymbol
                            ios_icon_name="person.fill"
                            android_material_icon_name="person"
                            size={14}
                            color={colors.textSecondary}
                          />{' '}
                          {customer.firstName} {customer.lastName}
                        </Text>
                      )}
                      <Text style={styles.customerDetail}>
                        <IconSymbol
                          ios_icon_name="envelope"
                          android_material_icon_name="email"
                          size={14}
                          color={colors.textSecondary}
                        />{' '}
                        {customer.email}
                      </Text>
                      {customer.phone && (
                        <Text style={styles.customerDetail}>
                          <IconSymbol
                            ios_icon_name="phone"
                            android_material_icon_name="phone"
                            size={14}
                            color={colors.textSecondary}
                          />{' '}
                          Phone: {customer.phone}
                        </Text>
                      )}
                      {customer.mobile && (
                        <Text style={styles.customerDetail}>
                          <IconSymbol
                            ios_icon_name="iphone"
                            android_material_icon_name="smartphone"
                            size={14}
                            color={colors.textSecondary}
                          />{' '}
                          Mobile: {customer.mobile}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomer(customer.id, displayName)}
                      style={styles.deleteButton}
                      disabled={isDeleting}
                      activeOpacity={0.7}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={20}
                          color={colors.error}
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.vehiclesSection}>
                    <Text style={styles.vehiclesTitle}>
                      Vehicles ({customer.vehicles.length})
                    </Text>
                    {customer.vehicles.map((vehicle, vIndex) => (
                      <React.Fragment key={vIndex}>
                        <View style={styles.vehicleItem}>
                          <Text style={styles.vehicleReg}>
                            {vehicle.registrationNumber}
                          </Text>
                          <Text style={styles.vehicleDetails}>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>

                  {reminders.length > 0 && (
                    <View style={styles.remindersSection}>
                      {reminders.map((reminder, rIndex) => (
                        <React.Fragment key={rIndex}>
                          <View
                            style={[
                              styles.reminderBadge,
                              reminder.includes('OVERDUE') && styles.reminderOverdue,
                            ]}
                          >
                            <IconSymbol
                              ios_icon_name="bell.fill"
                              android_material_icon_name="notifications"
                              size={12}
                              color={
                                reminder.includes('OVERDUE')
                                  ? colors.error
                                  : colors.accent
                              }
                            />
                            <Text
                              style={[
                                styles.reminderText,
                                reminder.includes('OVERDUE') &&
                                  styles.reminderTextOverdue,
                              ]}
                            >
                              {reminder}
                            </Text>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/customers/add')}
        activeOpacity={0.8}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={28}
          color={colors.card}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  remindersButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  customerCardDeleting: {
    opacity: 0.5,
    cursor: Platform.OS === 'web' ? 'not-allowed' : undefined,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  customerDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  deleteButton: {
    padding: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  vehiclesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  vehiclesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  vehicleItem: {
    marginBottom: 6,
  },
  vehicleReg: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  vehicleDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  remindersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  reminderOverdue: {
    backgroundColor: '#ffebee',
  },
  reminderText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 6,
    fontWeight: '500',
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  reminderTextOverdue: {
    color: colors.error,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
});
