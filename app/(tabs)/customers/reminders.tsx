
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Customer } from '@/types/customer';
import { storageUtils } from '@/utils/storage';
import { dateUtils } from '@/utils/dateUtils';
import { notificationService } from '@/utils/notificationService';
import { emailService } from '@/utils/emailService';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

interface Reminder {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerMobile: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleDetails: string;
  types: ('inspection' | 'service')[];
  dueDate: string;
  daysUntil: number;
  isOverdue: boolean;
  isMerged: boolean;
}

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    inspections: 0,
    services: 0,
    merged: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    loadReminders();
    loadNotificationStats();
  }, []);

  const loadNotificationStats = async () => {
    const stats = await notificationService.getNotificationStats();
    setNotificationStats(stats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await notificationService.scheduleAllReminders();
    await loadReminders();
    await loadNotificationStats();
    setRefreshing(false);
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.companyName) {
      return customer.companyName;
    }
    return `${customer.firstName} ${customer.lastName}`.trim();
  };

  const loadReminders = async () => {
    const customers = await storageUtils.getCustomers();
    const allReminders: Reminder[] = [];

    customers.forEach((customer) => {
      const displayName = getCustomerDisplayName(customer);
      customer.vehicles.forEach((vehicle) => {
        const inspectionDate = vehicle.inspectionDueDate;
        const serviceDate = vehicle.serviceDueDate;

        // Check if both are due on the same day
        if (inspectionDate && serviceDate && inspectionDate === serviceDate) {
          const daysUntil = dateUtils.getDaysUntil(inspectionDate);
          if (daysUntil <= 30) {
            // Merged reminder
            allReminders.push({
              customerId: customer.id,
              customerName: displayName,
              customerEmail: customer.email,
              customerPhone: customer.phone,
              customerMobile: customer.mobile,
              vehicleId: vehicle.id,
              vehicleReg: vehicle.registrationNumber,
              vehicleDetails: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              types: ['inspection', 'service'],
              dueDate: inspectionDate,
              daysUntil,
              isOverdue: dateUtils.isOverdue(inspectionDate),
              isMerged: true,
            });
          }
        } else {
          // Separate reminders
          if (inspectionDate) {
            const daysUntil = dateUtils.getDaysUntil(inspectionDate);
            if (daysUntil <= 30) {
              allReminders.push({
                customerId: customer.id,
                customerName: displayName,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                customerMobile: customer.mobile,
                vehicleId: vehicle.id,
                vehicleReg: vehicle.registrationNumber,
                vehicleDetails: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                types: ['inspection'],
                dueDate: inspectionDate,
                daysUntil,
                isOverdue: dateUtils.isOverdue(inspectionDate),
                isMerged: false,
              });
            }
          }

          if (serviceDate) {
            const daysUntil = dateUtils.getDaysUntil(serviceDate);
            if (daysUntil <= 30) {
              allReminders.push({
                customerId: customer.id,
                customerName: displayName,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                customerMobile: customer.mobile,
                vehicleId: vehicle.id,
                vehicleReg: vehicle.registrationNumber,
                vehicleDetails: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                types: ['service'],
                dueDate: serviceDate,
                daysUntil,
                isOverdue: dateUtils.isOverdue(serviceDate),
                isMerged: false,
              });
            }
          }
        }
      });
    });

    // Sort by days until due (overdue first, then soonest)
    allReminders.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysUntil - b.daysUntil;
    });

    setReminders(allReminders);
  };

  const sendAutomatedEmail = async (reminder: Reminder) => {
    if (!reminder.customerEmail) {
      Alert.alert('Error', 'No email address available for this customer');
      return;
    }

    if (!isSupabaseConfigured()) {
      emailService.showSetupInstructions();
      return;
    }

    setSendingEmail(reminder.vehicleId);

    try {
      const typeText = reminder.isMerged 
        ? 'inspection and service' 
        : reminder.types[0];
      
      const subject = reminder.isMerged
        ? `Inspection & Service Reminder - ${reminder.vehicleReg}`
        : `${reminder.types[0] === 'inspection' ? 'Inspection' : 'Service'} Reminder - ${reminder.vehicleReg}`;
      
      const body = `Dear ${reminder.customerName},\n\nThis is a reminder that your vehicle ${reminder.vehicleReg} (${reminder.vehicleDetails}) is ${reminder.isOverdue ? 'overdue' : 'due soon'} for ${typeText}.\n\nDue Date: ${dateUtils.formatDate(reminder.dueDate)}\n\nPlease contact us to schedule an appointment.\n\nBest regards,\nYour Mechanic Shop`;

      console.log('Sending automated email...');
      const result = await emailService.sendEmail({
        to: reminder.customerEmail,
        subject,
        body,
        customerName: reminder.customerName,
      });

      if (result.success) {
        Alert.alert('Success', `Email sent successfully to ${reminder.customerName}`);
      } else {
        // Show detailed error with troubleshooting option
        Alert.alert(
          'Email Failed',
          result.error || 'Failed to send email',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Troubleshooting',
              onPress: () => showEmailTroubleshooting(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while sending the email',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Troubleshooting',
            onPress: () => showEmailTroubleshooting(),
          },
        ]
      );
    } finally {
      setSendingEmail(null);
    }
  };

  const showEmailTroubleshooting = () => {
    Alert.alert(
      'Email Troubleshooting',
      'If emails are not arriving, check:\n\n' +
      '1. RESEND_API_KEY is set in Supabase secrets\n' +
      '2. FROM_EMAIL is set to your verified domain\n' +
      '3. Domain is verified in Resend dashboard\n' +
      '4. DNS records (TXT, MX, DKIM) are configured\n' +
      '5. Check Edge Function logs in Supabase\n' +
      '6. Check spam folder\n\n' +
      'See SUPABASE_SETUP.md for detailed instructions.',
      [
        { text: 'OK' },
        {
          text: 'View Logs',
          onPress: () => {
            const url = 'https://supabase.com/dashboard/project/sykerdryyaorziqjglwb/functions/send-reminder-email/logs';
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const sendEmailViaClient = (reminder: Reminder) => {
    const typeText = reminder.isMerged 
      ? 'inspection and service' 
      : reminder.types[0];
    
    const subject = reminder.isMerged
      ? `Inspection & Service Reminder - ${reminder.vehicleReg}`
      : `${reminder.types[0] === 'inspection' ? 'Inspection' : 'Service'} Reminder - ${reminder.vehicleReg}`;
    
    const body = `Dear ${reminder.customerName},\n\nThis is a reminder that your vehicle ${reminder.vehicleReg} (${reminder.vehicleDetails}) is ${reminder.isOverdue ? 'overdue' : 'due soon'} for ${typeText}.\n\nDue Date: ${dateUtils.formatDate(reminder.dueDate)}\n\nPlease contact us to schedule an appointment.\n\nBest regards,\nYour Mechanic Shop`;

    const url = `mailto:${reminder.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open email client');
        }
      })
      .catch((err) => {
        console.error('Error opening email:', err);
        Alert.alert('Error', 'Unable to send email');
      });
  };

  const sendSmsReminder = (reminder: Reminder) => {
    const phoneNumber = reminder.customerMobile || reminder.customerPhone;
    if (!phoneNumber) {
      Alert.alert('Error', 'No phone number available for this customer');
      return;
    }

    const typeText = reminder.isMerged 
      ? 'inspection & service' 
      : reminder.types[0];

    const message = `Hi ${reminder.customerName}, your vehicle ${reminder.vehicleReg} is ${reminder.isOverdue ? 'overdue' : 'due soon'} for ${typeText}. Due: ${dateUtils.formatDate(reminder.dueDate)}. Please contact us to schedule.`;

    const url = `sms:${phoneNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open SMS app');
        }
      })
      .catch((err) => {
        console.error('Error opening SMS:', err);
        Alert.alert('Error', 'Unable to send SMS');
      });
  };

  const handleSendReminder = (reminder: Reminder) => {
    const hasPhone = reminder.customerPhone || reminder.customerMobile;
    const hasEmail = reminder.customerEmail;
    const supabaseConfigured = isSupabaseConfigured();

    if (!hasEmail && !hasPhone) {
      Alert.alert('Error', 'No contact information available for this customer');
      return;
    }

    const buttons: any[] = [{ text: 'Cancel', style: 'cancel' }];

    if (hasEmail && supabaseConfigured) {
      buttons.push({
        text: 'Send Email (Auto)',
        onPress: () => sendAutomatedEmail(reminder),
      });
    }

    if (hasEmail) {
      buttons.push({
        text: supabaseConfigured ? 'Email (Client)' : 'Email',
        onPress: () => sendEmailViaClient(reminder),
      });
    }

    if (hasPhone) {
      buttons.push({
        text: 'SMS',
        onPress: () => sendSmsReminder(reminder),
      });
    }

    Alert.alert(
      'Send Reminder',
      `Send reminder to ${reminder.customerName}?`,
      buttons
    );
  };

  const getReminderTypeText = (reminder: Reminder) => {
    if (reminder.isMerged) {
      return reminder.isOverdue 
        ? 'Inspection & Service OVERDUE' 
        : `Inspection & Service due in ${reminder.daysUntil} days`;
    }
    const type = reminder.types[0] === 'inspection' ? 'Inspection' : 'Service';
    return reminder.isOverdue 
      ? `${type} OVERDUE` 
      : `${type} due in ${reminder.daysUntil} days`;
  };

  const overdueReminders = reminders.filter((r) => r.isOverdue);
  const upcomingReminders = reminders.filter((r) => !r.isOverdue);

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
        <Text style={styles.title}>Reminders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.automationCard}>
          <View style={styles.automationHeader}>
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications-active"
              size={24}
              color={colors.success}
            />
            <Text style={styles.automationTitle}>Automated Reminders Active</Text>
          </View>
          <Text style={styles.automationText}>
            {notificationStats.total} notifications scheduled automatically
          </Text>
          <Text style={styles.automationSubtext}>
            • {notificationStats.inspections} inspection reminders
          </Text>
          <Text style={styles.automationSubtext}>
            • {notificationStats.services} service reminders
          </Text>
          {notificationStats.merged > 0 && (
            <Text style={styles.automationSubtext}>
              • {notificationStats.merged} merged reminders (inspection & service on same day)
            </Text>
          )}
          <Text style={styles.automationInfo}>
            Customers will receive notifications 2 weeks before their due dates.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            {isSupabaseConfigured() 
              ? 'Tap a reminder to send automated email or SMS to the customer.'
              : 'Tap a reminder to send email (via client) or SMS. Set up Supabase for automated emails.'}
          </Text>
        </View>

        {overdueReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Overdue ({overdueReminders.length})
            </Text>
            {overdueReminders.map((reminder, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[styles.reminderCard, styles.overdueCard]}
                  onPress={() => handleSendReminder(reminder)}
                  activeOpacity={0.7}
                  disabled={sendingEmail === reminder.vehicleId}
                >
                  <View style={styles.reminderHeader}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={24}
                      color={colors.error}
                    />
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderCustomer}>
                        {reminder.customerName}
                      </Text>
                      <Text style={styles.reminderVehicle}>
                        {reminder.vehicleReg} - {reminder.vehicleDetails}
                      </Text>
                      <Text style={styles.reminderType}>
                        {getReminderTypeText(reminder)}
                      </Text>
                      <Text style={styles.reminderDate}>
                        Due: {dateUtils.formatDate(reminder.dueDate)}
                      </Text>
                    </View>
                    {sendingEmail === reminder.vehicleId ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        {upcomingReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Upcoming ({upcomingReminders.length})
            </Text>
            {upcomingReminders.map((reminder, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={styles.reminderCard}
                  onPress={() => handleSendReminder(reminder)}
                  activeOpacity={0.7}
                  disabled={sendingEmail === reminder.vehicleId}
                >
                  <View style={styles.reminderHeader}>
                    <IconSymbol
                      ios_icon_name={reminder.isMerged ? "bell.badge.fill" : "bell.fill"}
                      android_material_icon_name="notifications"
                      size={24}
                      color={reminder.isMerged ? colors.success : colors.accent}
                    />
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderCustomer}>
                        {reminder.customerName}
                      </Text>
                      <Text style={styles.reminderVehicle}>
                        {reminder.vehicleReg} - {reminder.vehicleDetails}
                      </Text>
                      <Text style={styles.reminderType}>
                        {getReminderTypeText(reminder)}
                      </Text>
                      <Text style={styles.reminderDate}>
                        Due: {dateUtils.formatDate(reminder.dueDate)}
                      </Text>
                    </View>
                    {sendingEmail === reminder.vehicleId ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        {reminders.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="checkmark.circle"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.success}
            />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>
              No upcoming reminders in the next 30 days
            </Text>
          </View>
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
  automationCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.success,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  automationText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  automationSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginBottom: 4,
  },
  automationInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  overdueCard: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  reminderVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reminderType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 13,
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
});
