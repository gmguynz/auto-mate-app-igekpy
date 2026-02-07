
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer, Vehicle } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { dateUtils } from '@/utils/dateUtils';

interface VehicleWithCustomer extends Vehicle {
  customerId: string;
  customerName: string;
  customerEmail: string;
}

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleWithCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleWithCustomer[]>([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const customers = await storageUtils.getCustomers();
    const allVehicles: VehicleWithCustomer[] = [];

    customers.forEach((customer) => {
      const displayName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
      customer.vehicles.forEach((vehicle) => {
        allVehicles.push({
          ...vehicle,
          customerId: customer.id,
          customerName: displayName,
          customerEmail: customer.email,
        });
      });
    });

    allVehicles.sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));

    setVehicles(allVehicles);
    setFilteredVehicles(allVehicles);
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = vehicles.filter(
        (vehicle) =>
          vehicle.registrationNumber.toLowerCase().includes(query) ||
          vehicle.make.toLowerCase().includes(query) ||
          vehicle.model.toLowerCase().includes(query) ||
          vehicle.year.toLowerCase().includes(query) ||
          vehicle.customerName.toLowerCase().includes(query)
      );
      setFilteredVehicles(filtered);
    }
  }, [searchQuery, vehicles]);

  const getVehicleStatus = (vehicle: VehicleWithCustomer) => {
    const inspectionOverdue = dateUtils.isOverdue(vehicle.inspectionDueDate);
    const serviceOverdue = dateUtils.isOverdue(vehicle.serviceDueDate);
    const inspectionDueSoon = dateUtils.isDueSoon(vehicle.inspectionDueDate);
    const serviceDueSoon = dateUtils.isDueSoon(vehicle.serviceDueDate);

    if (inspectionOverdue || serviceOverdue) {
      return { status: 'overdue', color: colors.error };
    }
    if (inspectionDueSoon || serviceDueSoon) {
      return { status: 'due soon', color: colors.accent };
    }
    return { status: 'up to date', color: colors.success };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text style={styles.subtitle}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </Text>
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
          placeholder="Search by rego, make, or model..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
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
      >
        {filteredVehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="car.fill"
              android_material_icon_name="directions-car"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No vehicles found' : 'No vehicles yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add customers with vehicles to see them here'}
            </Text>
          </View>
        ) : (
          filteredVehicles.map((vehicle, index) => {
            const status = getVehicleStatus(vehicle);
            return (
              <React.Fragment key={index}>
                <View style={styles.vehicleCard}>
                  <TouchableOpacity
                    style={styles.vehicleMainContent}
                    onPress={() => router.push(`/customers/${vehicle.customerId}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vehicleHeader}>
                      <View style={styles.vehicleIcon}>
                        <IconSymbol
                          ios_icon_name="car.fill"
                          android_material_icon_name="directions-car"
                          size={24}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleReg}>{vehicle.registrationNumber}</Text>
                        <Text style={styles.vehicleDetails}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </Text>
                        <Text style={styles.vehicleOwner}>
                          <IconSymbol
                            ios_icon_name="person.fill"
                            android_material_icon_name="person"
                            size={12}
                            color={colors.textSecondary}
                          />{' '}
                          {vehicle.customerName}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.datesSection}>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Inspection Due:</Text>
                        <Text
                          style={[
                            styles.dateValue,
                            dateUtils.isOverdue(vehicle.inspectionDueDate) && styles.dateOverdue,
                            dateUtils.isDueSoon(vehicle.inspectionDueDate) && styles.dateDueSoon,
                          ]}
                        >
                          {dateUtils.formatDate(vehicle.inspectionDueDate)}
                        </Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Service Due:</Text>
                        <Text
                          style={[
                            styles.dateValue,
                            dateUtils.isOverdue(vehicle.serviceDueDate) && styles.dateOverdue,
                            dateUtils.isDueSoon(vehicle.serviceDueDate) && styles.dateDueSoon,
                          ]}
                        >
                          {dateUtils.formatDate(vehicle.serviceDueDate)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewJobsButton}
                    onPress={() => router.push(`/customers/vehicle-jobs?vehicleId=${vehicle.id}&vehicleReg=${vehicle.registrationNumber}`)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="doc.text"
                      android_material_icon_name="description"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.viewJobsButtonText}>View Jobs</Text>
                  </TouchableOpacity>
                </View>
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
  headerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
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
  vehicleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    overflow: 'hidden',
  },
  vehicleMainContent: {
    padding: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleReg: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vehicleOwner: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  datesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dateOverdue: {
    color: colors.error,
  },
  dateDueSoon: {
    color: colors.accent,
  },
  viewJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.highlight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewJobsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  },
});
