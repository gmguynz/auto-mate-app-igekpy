
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { storageUtils } from '@/utils/storage';
import { Customer } from '@/types/customer';
import { useAuth } from '@/contexts/AuthContext';
import { jobCardStorage } from '@/utils/jobCardStorage';
import { JobCard } from '@/types/jobCard';
import { dateUtils } from '@/utils/dateUtils';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [customerCount, setCustomerCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [activeJobCardsCount, setActiveJobCardsCount] = useState(0);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [inProgressJobsCount, setInProgressJobsCount] = useState(0);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [activeJobCardsTotal, setActiveJobCardsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentJobCards, setRecentJobCards] = useState<JobCard[]>([]);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      console.log('Initializing dashboard...');
      await loadCounts();
      console.log('Dashboard initialized successfully');
    } catch (err) {
      console.error('Error initializing dashboard:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadCounts = async () => {
    try {
      const customersData = await storageUtils.getCustomers();
      setCustomers(customersData);
      setCustomerCount(customersData.length);
      
      let totalVehicles = 0;
      customersData.forEach((customer) => {
        totalVehicles += customer.vehicles.length;
      });
      setVehicleCount(totalVehicles);

      const reminders = getUpcomingReminders(customersData);
      setReminderCount(reminders);

      const jobCards = await jobCardStorage.getJobCards();
      const activeJobCards = jobCards.filter(jc => jc.status === 'open' || jc.status === 'in_progress');
      const openJobs = jobCards.filter(jc => jc.status === 'open');
      const inProgressJobs = jobCards.filter(jc => jc.status === 'in_progress');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = jobCards.filter(jc => {
        if (jc.status === 'completed' && jc.completedAt) {
          const completedDate = new Date(jc.completedAt);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate.getTime() === today.getTime();
        }
        return false;
      });
      
      setActiveJobCardsCount(activeJobCards.length);
      setOpenJobsCount(openJobs.length);
      setInProgressJobsCount(inProgressJobs.length);
      setCompletedTodayCount(completedToday.length);
      
      const totalValue = activeJobCards.reduce((sum, jc) => sum + jc.totalCost, 0);
      setActiveJobCardsTotal(totalValue);
      
      const sortedJobCards = jobCards
        .filter(jc => jc.status === 'open' || jc.status === 'in_progress')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      setRecentJobCards(sortedJobCards);
      
      console.log(`Loaded ${customersData.length} customers, ${totalVehicles} vehicles, ${reminders} reminders, ${activeJobCards.length} active job cards`);
    } catch (err) {
      console.error('Error loading counts:', err);
    }
  };

  const getUpcomingReminders = (customers: Customer[]): number => {
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    customers.forEach((customer) => {
      customer.vehicles.forEach((vehicle) => {
        const inspectionDate = vehicle.inspectionDueDate ? new Date(vehicle.inspectionDueDate) : null;
        const serviceDate = vehicle.serviceDueDate ? new Date(vehicle.serviceDueDate) : null;

        if (inspectionDate && inspectionDate <= fourteenDaysFromNow) {
          if (serviceDate && serviceDate.getTime() === inspectionDate.getTime()) {
            count++;
          } else {
            count++;
          }
        } else if (serviceDate && serviceDate <= fourteenDaysFromNow) {
          count++;
        }
      });
    });

    return count;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getFilteredCustomers = () => {
    if (!searchQuery.trim()) {
      return [];
    }
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.firstName.toLowerCase().includes(query) ||
        customer.lastName.toLowerCase().includes(query) ||
        customer.companyName.toLowerCase().includes(query) ||
        customer.vehicles.some((v) => v.registrationNumber.toLowerCase().includes(query))
    );
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    const statusColorMap = {
      open: colors.statusOpen,
      in_progress: colors.statusInProgress,
      completed: colors.statusCompleted,
      cancelled: colors.statusCancelled,
    };
    const statusKey = status as keyof typeof statusColorMap;
    return statusColorMap[statusKey] || colors.textSecondary;
  };

  const getStatusLabel = (status: string) => {
    const statusLabelMap = {
      open: 'Open',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    const statusKey = status as keyof typeof statusLabelMap;
    return statusLabelMap[statusKey] || status;
  };

  const onRefresh = () => {
    setRefreshing(true);
    initializeScreen();
  };

  const filteredCustomers = getFilteredCustomers();
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const firstName = fullName.split(' ')[0];
  const welcomeText = 'Welcome back,';
  const greeting = `${welcomeText} ${firstName}`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subtitle}>Charlie&apos;s Workshop Dashboard</Text>
            </View>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <IconSymbol
                  ios_icon_name="shield.fill"
                  android_material_icon_name="admin-panel-settings"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            )}
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
            placeholder="Quick search customers or vehicles..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
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

        {searchQuery.trim() && filteredCustomers.length > 0 && (
          <View style={styles.searchResults}>
            {filteredCustomers.slice(0, 3).map((customer, index) => {
              const displayName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
              const vehicleCountText = customer.vehicles.length === 1 ? '1 vehicle' : `${customer.vehicles.length} vehicles`;
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={styles.searchResultCard}
                    onPress={() => {
                      setSearchQuery('');
                      router.push(`/customers/${customer.id}`);
                    }}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{displayName}</Text>
                      <Text style={styles.searchResultDetail}>{vehicleCountText}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionPrimary]}
              onPress={() => router.push('/customers/add-job-card')}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.quickActionTitle}>New Job Card</Text>
              <Text style={styles.quickActionSubtitle}>Start a new job</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/customers/job-cards')}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <IconSymbol
                  ios_icon_name="list.bullet.clipboard"
                  android_material_icon_name="assignment"
                  size={32}
                  color={colors.statusInProgress}
                />
              </View>
              <Text style={styles.quickActionTitle}>View All Jobs</Text>
              <Text style={styles.quickActionSubtitle}>Browse job cards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/customers/add')}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <IconSymbol
                  ios_icon_name="person.crop.circle.badge.plus"
                  android_material_icon_name="person-add"
                  size={32}
                  color={colors.secondary}
                />
              </View>
              <Text style={styles.quickActionTitle}>Add Customer</Text>
              <Text style={styles.quickActionSubtitle}>New customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/customers/parts')}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <IconSymbol
                  ios_icon_name="wrench.and.screwdriver.fill"
                  android_material_icon_name="build"
                  size={32}
                  color={colors.warning}
                />
              </View>
              <Text style={styles.quickActionTitle}>Parts</Text>
              <Text style={styles.quickActionSubtitle}>Manage inventory</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Job Cards Overview</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, styles.statCardOpen]}
              onPress={() => router.push('/customers/job-cards')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="doc.text"
                  android_material_icon_name="description"
                  size={24}
                  color={colors.statusOpen}
                />
                <Text style={styles.statNumber}>{openJobsCount}</Text>
              </View>
              <Text style={styles.statLabel}>Open Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardInProgress]}
              onPress={() => router.push('/customers/job-cards')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="hammer.fill"
                  android_material_icon_name="build"
                  size={24}
                  color={colors.statusInProgress}
                />
                <Text style={styles.statNumber}>{inProgressJobsCount}</Text>
              </View>
              <Text style={styles.statLabel}>In Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardCompleted]}
              onPress={() => router.push('/customers/job-cards')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color={colors.statusCompleted}
                />
                <Text style={styles.statNumber}>{completedTodayCount}</Text>
              </View>
              <Text style={styles.statLabel}>Done Today</Text>
            </TouchableOpacity>

            <View style={[styles.statCard, styles.statCardTotal]}>
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="dollarsign.circle.fill"
                  android_material_icon_name="attach-money"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.statValue}>{formatCurrency(activeJobCardsTotal)}</Text>
              </View>
              <Text style={styles.statLabel}>Active Value</Text>
            </View>
          </View>
        </View>

        {recentJobCards.length > 0 && (
          <View style={styles.recentJobsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Active Jobs</Text>
              <TouchableOpacity onPress={() => router.push('/customers/job-cards')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentJobCards.map((jobCard, index) => {
              const statusColor = getStatusColor(jobCard.status);
              const statusLabel = getStatusLabel(jobCard.status);
              const updatedDate = dateUtils.formatDate(jobCard.updatedAt);
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={styles.jobCardPreview}
                    onPress={() => router.push(`/customers/job-card-detail?id=${jobCard.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.jobCardPreviewHeader}>
                      <Text style={styles.jobCardNumber}>{jobCard.jobNumber}</Text>
                      <View style={[styles.jobCardStatus, { backgroundColor: statusColor }]}>
                        <Text style={styles.jobCardStatusText}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.jobCardCustomer}>{jobCard.customerName}</Text>
                    <Text style={styles.jobCardVehicle}>
                      {jobCard.vehicleReg} - {jobCard.vehicleMake} {jobCard.vehicleModel}
                    </Text>
                    <View style={styles.jobCardFooter}>
                      <Text style={styles.jobCardDate}>{updatedDate}</Text>
                      <Text style={styles.jobCardTotal}>{formatCurrency(jobCard.totalCost)}</Text>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Database Overview</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/customers')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="people"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.statNumber}>{customerCount}</Text>
              </View>
              <Text style={styles.statLabel}>Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/customers/vehicles')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="car.fill"
                  android_material_icon_name="directions-car"
                  size={24}
                  color={colors.secondary}
                />
                <Text style={styles.statNumber}>{vehicleCount}</Text>
              </View>
              <Text style={styles.statLabel}>Vehicles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/customers/reminders')}
              activeOpacity={0.7}
            >
              <View style={styles.statHeader}>
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.warning}
                />
                <Text style={styles.statNumber}>{reminderCount}</Text>
              </View>
              <Text style={styles.statLabel}>Reminders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.highlightBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04)',
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    cursor: Platform.OS === 'web' ? 'text' : undefined,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  },
  searchResults: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  quickActionPrimary: {
    backgroundColor: colors.highlightBlue,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  quickActionIcon: {
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  statCardOpen: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.statusOpen,
  },
  statCardInProgress: {
    backgroundColor: '#E3F2FD',
    borderColor: colors.statusInProgress,
  },
  statCardCompleted: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.statusCompleted,
  },
  statCardTotal: {
    minWidth: '100%',
    backgroundColor: colors.highlightBlue,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentJobsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  jobCardPreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  jobCardPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobCardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  jobCardStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jobCardStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  jobCardCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  jobCardVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  jobCardDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  jobCardTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
