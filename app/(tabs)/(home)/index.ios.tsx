import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { storageUtils } from "@/utils/storage";
import { dateUtils } from "@/utils/dateUtils";
import { HeaderRightButton, HeaderLeftButton } from "@/components/HeaderButtons";

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalVehicles: 0,
    overdueInspections: 0,
    overdueServices: 0,
    upcomingReminders: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const customers = await storageUtils.getCustomers();
    let totalVehicles = 0;
    let overdueInspections = 0;
    let overdueServices = 0;
    let upcomingReminders = 0;

    customers.forEach((customer) => {
      totalVehicles += customer.vehicles.length;
      customer.vehicles.forEach((vehicle) => {
        if (dateUtils.isOverdue(vehicle.inspectionDueDate)) {
          overdueInspections++;
        } else if (dateUtils.isDueSoon(vehicle.inspectionDueDate)) {
          upcomingReminders++;
        }
        if (dateUtils.isOverdue(vehicle.serviceDueDate)) {
          overdueServices++;
        } else if (dateUtils.isDueSoon(vehicle.serviceDueDate)) {
          upcomingReminders++;
        }
      });
    });

    setStats({
      totalCustomers: customers.length,
      totalVehicles,
      overdueInspections,
      overdueServices,
      upcomingReminders,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mechanic Dashboard",
          headerRight: () => <HeaderRightButton />,
          headerLeft: () => <HeaderLeftButton />,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="people"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{stats.totalCustomers}</Text>
              <Text style={styles.statLabel}>Customers</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="car.fill"
                android_material_icon_name="directions-car"
                size={32}
                color={colors.secondary}
              />
              <Text style={styles.statValue}>{stats.totalVehicles}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>

            <View style={[styles.statCard, stats.overdueInspections > 0 && styles.alertCard]}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={32}
                color={stats.overdueInspections > 0 ? colors.error : colors.textSecondary}
              />
              <Text style={[styles.statValue, stats.overdueInspections > 0 && styles.alertText]}>
                {stats.overdueInspections}
              </Text>
              <Text style={styles.statLabel}>Overdue Inspections</Text>
            </View>

            <View style={[styles.statCard, stats.overdueServices > 0 && styles.alertCard]}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={32}
                color={stats.overdueServices > 0 ? colors.error : colors.textSecondary}
              />
              <Text style={[styles.statValue, stats.overdueServices > 0 && styles.alertText]}>
                {stats.overdueServices}
              </Text>
              <Text style={styles.statLabel}>Overdue Services</Text>
            </View>
          </View>

          {stats.upcomingReminders > 0 && (
            <TouchableOpacity
              style={styles.reminderBanner}
              onPress={() => router.push('/customers/reminders')}
            >
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={colors.accent}
              />
              <View style={styles.reminderContent}>
                <Text style={styles.reminderTitle}>
                  {stats.upcomingReminders} Upcoming Reminder{stats.upcomingReminders !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.reminderSubtitle}>
                  Tap to view and send notifications
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

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/customers/add')}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="person.crop.circle.badge.plus"
                  android_material_icon_name="person-add"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add New Customer</Text>
                <Text style={styles.actionSubtitle}>
                  Register a new customer and their vehicles
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
              style={styles.actionButton}
              onPress={() => router.push('/customers')}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="list.bullet"
                  android_material_icon_name="list"
                  size={28}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View All Customers</Text>
                <Text style={styles.actionSubtitle}>
                  Browse and search customer database
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
              style={styles.actionButton}
              onPress={() => router.push('/customers/reminders')}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="bell.badge.fill"
                  android_material_icon_name="notifications-active"
                  size={28}
                  color={colors.accent}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Send Reminders</Text>
                <Text style={styles.actionSubtitle}>
                  View and send service reminders
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              This app stores all data locally on your device. Reminders can be sent via email or SMS by tapping on them.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  alertCard: {
    borderColor: colors.error,
    backgroundColor: '#ffebee',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  alertText: {
    color: colors.error,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  actionButton: {
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
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
  actionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
