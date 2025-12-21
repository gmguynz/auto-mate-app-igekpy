
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { storageUtils } from '@/utils/storage';
import { SupabaseSetupGuide } from '@/components/SupabaseSetupGuide';
import { dateUtils } from '@/utils/dateUtils';
import { Customer } from '@/types/customer';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Initializing home screen...');
      await checkSupabaseConfig();
      await loadCounts();
      
      console.log('Home screen initialized successfully');
    } catch (err) {
      console.error('Error initializing home screen:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSupabaseConfig = async () => {
    try {
      const configured = storageUtils.shouldUseSupabase();
      setIsSupabaseConfigured(configured);
      console.log('Supabase configured:', configured);
    } catch (err) {
      console.error('Error checking Supabase config:', err);
      setIsSupabaseConfigured(false);
    }
  };

  const loadCounts = async () => {
    try {
      const customers = await storageUtils.getCustomers();
      setCustomerCount(customers.length);
      
      let totalVehicles = 0;
      customers.forEach((customer) => {
        totalVehicles += customer.vehicles.length;
      });
      setVehicleCount(totalVehicles);

      const reminders = getUpcomingReminders(customers);
      setReminderCount(reminders);
      
      console.log(`Loaded ${customers.length} customers, ${totalVehicles} vehicles, ${reminders} reminders`);
    } catch (err) {
      console.error('Error loading counts:', err);
      setCustomerCount(0);
      setVehicleCount(0);
      setReminderCount(0);
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

  const handleMigrateData = async () => {
    Alert.alert(
      'Migrate to Supabase',
      'This will move all your local customer data to Supabase cloud storage. Make sure you have set up your Supabase project first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            try {
              const result = await storageUtils.migrateToSupabase();
              Alert.alert(
                result.success ? 'Success' : 'Error',
                result.message,
                [{ text: 'OK', onPress: () => initializeScreen() }]
              );
            } catch (err) {
              console.error('Migration error:', err);
              Alert.alert('Error', 'Failed to migrate data');
            }
          },
        },
      ]
    );
  };

  if (showSetupGuide) {
    return <SupabaseSetupGuide onDismiss={() => setShowSetupGuide(false)} />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeScreen}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Charlies Workshop</Text>
          <Text style={styles.subtitle}>Customer & Vehicle Management</Text>
          {user && (
            <View style={styles.userBadge}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.userBadgeText}>
                {profile?.full_name || user.email}
              </Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/customers')}
          >
            <View style={styles.actionIcon}>
              <IconSymbol
                ios_icon_name="person.crop.circle"
                android_material_icon_name="person"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Customers</Text>
              <Text style={styles.actionDescription}>
                Browse and manage your customer database
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/customers/add')}
          >
            <View style={styles.actionIcon}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Customer</Text>
              <Text style={styles.actionDescription}>
                Create a new customer record with vehicle details
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/customers/vehicles')}
          >
            <View style={styles.actionIcon}>
              <IconSymbol
                ios_icon_name="car.fill"
                android_material_icon_name="directions-car"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Vehicle Database</Text>
              <Text style={styles.actionDescription}>
                Search vehicles by registration number
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {!isSupabaseConfigured && customerCount > 0 && (
            <TouchableOpacity
              style={[styles.actionCard, styles.migrateCard]}
              onPress={handleMigrateData}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="arrow.up.doc.fill"
                  android_material_icon_name="cloud-upload"
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Migrate to Cloud</Text>
                <Text style={styles.actionDescription}>
                  Move your {customerCount} customer{customerCount !== 1 ? 's' : ''} to Supabase cloud storage
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/customers')}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="people"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statNumber}>{customerCount}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/customers/vehicles')}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="car.fill"
              android_material_icon_name="directions-car"
              size={28}
              color={colors.success}
            />
            <Text style={styles.statNumber}>{vehicleCount}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/customers/reminders')}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={28}
              color={colors.accent}
            />
            <Text style={styles.statNumber}>{reminderCount}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
            <Text style={styles.statSubLabel}>(14 days)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About This App</Text>
          <Text style={styles.infoText}>
            This customer database app helps mechanics manage customer information, vehicle details, and service reminders. 
            {'\n\n'}
            Features include:
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Secure user authentication and access control</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Store customer and vehicle information</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Track WOF inspection and service due dates</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Automated reminders 14 days before due dates</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Search by name, company, or vehicle registration</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Cloud storage with Supabase</Text>
            </View>
          </View>
        </View>

        {isSupabaseConfigured && (
          <View style={styles.successCard}>
            <IconSymbol
              ios_icon_name="checkmark.shield.fill"
              android_material_icon_name="verified-user"
              size={32}
              color="#4CAF50"
            />
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Secure & Protected</Text>
              <Text style={styles.successText}>
                Your data is securely stored in Supabase with user authentication enabled. 
                Only authorized users can access the database. Automated email reminders are sent 14 days before due dates via Resend.
              </Text>
            </View>
          </View>
        )}

        {!isSupabaseConfigured && (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={() => setShowSetupGuide(true)}
          >
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.accent}
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Using Local Storage</Text>
              <Text style={styles.warningText}>
                Your data is stored locally on this device only. Tap here to set up cloud storage with Supabase for multi-device access and user authentication.
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  userBadgeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  adminBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  migrateCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureBullet: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFB74D',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#81C784',
    gap: 12,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
