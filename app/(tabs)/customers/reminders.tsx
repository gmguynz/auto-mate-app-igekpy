
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { storageUtils } from '@/utils/storage';
import { Customer } from '@/types/customer';
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
  vehicleMake: string;
  vehicleModel: string;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationStats, setNotificationStats] = useState({ total: 0, inspections: 0, services: 0 });
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    console.log('Reminders screen loaded');
    loadReminders();
    loadNotificationStats();
  }, []);

  const loadNotificationStats = async () => {
    try {
      const stats = await notificationService.getNotificationStats();
      setNotificationStats(stats);
      console.log(`Notification stats: ${stats.total} total (${stats.inspections} inspections, ${stats.services} services)`);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const onRefresh = () => {
    console.log('Refreshing reminders...');
    setRefreshing(true);
    loadReminders();
    loadNotificationStats();
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.companyName) {
      return customer.companyName;
    }
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();
    return fullName;
  };

  const loadReminders = async () => {
    try {
      console.log('Loading reminders...');
      const customers = await storageUtils.getCustomers();
      const allReminders: Reminder[] = [];

      customers.forEach(customer => {
        customer.vehicles.forEach(vehicle => {
          const inspectionDue = vehicle.inspectionDueDate;
          const serviceDue = vehicle.serviceDueDate;
          const customerName = getCustomerDisplayName(customer);
          const vehicleDetails = `${vehicle.make} ${vehicle.model} (${vehicle.year})`;

          // Check if both are due on the same date
          if (inspectionDue && serviceDue && inspectionDue === serviceDue) {
            const daysUntil = dateUtils.getDaysUntil(inspectionDue);
            if (daysUntil <= 30) {
              allReminders.push({
                customerId: customer.id,
                customerName,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                customerMobile: customer.mobile,
                vehicleId: vehicle.id,
                vehicleReg: vehicle.registrationNumber,
                vehicleMake: vehicle.make,
                vehicleModel: vehicle.model,
                vehicleDetails,
                types: ['inspection', 'service'],
                dueDate: inspectionDue,
                daysUntil,
                isOverdue: daysUntil < 0,
                isMerged: true,
              });
            }
          } else {
            // Add separate reminders
            if (inspectionDue) {
              const daysUntil = dateUtils.getDaysUntil(inspectionDue);
              if (daysUntil <= 30) {
                allReminders.push({
                  customerId: customer.id,
                  customerName,
                  customerEmail: customer.email,
                  customerPhone: customer.phone,
                  customerMobile: customer.mobile,
                  vehicleId: vehicle.id,
                  vehicleReg: vehicle.registrationNumber,
                  vehicleMake: vehicle.make,
                  vehicleModel: vehicle.model,
                  vehicleDetails,
                  types: ['inspection'],
                  dueDate: inspectionDue,
                  daysUntil,
                  isOverdue: daysUntil < 0,
                  isMerged: false,
                });
              }
            }

            if (serviceDue) {
              const daysUntil = dateUtils.getDaysUntil(serviceDue);
              if (daysUntil <= 30) {
                allReminders.push({
                  customerId: customer.id,
                  customerName,
                  customerEmail: customer.email,
                  customerPhone: customer.phone,
                  customerMobile: customer.mobile,
                  vehicleId: vehicle.id,
                  vehicleReg: vehicle.registrationNumber,
                  vehicleMake: vehicle.make,
                  vehicleModel: vehicle.model,
                  vehicleDetails,
                  types: ['service'],
                  dueDate: serviceDue,
                  daysUntil,
                  isOverdue: daysUntil < 0,
                  isMerged: false,
                });
              }
            }
          }
        });
      });

      // Sort by days until due (overdue first, then soonest)
      allReminders.sort((a, b) => a.daysUntil - b.daysUntil);

      console.log(`Loaded ${allReminders.length} reminders`);
      setReminders(allReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendAutomatedEmail = async (reminder: Reminder) => {
    console.log('Sending automated email to:', reminder.customerEmail);
    setSendingEmail(true);
    try {
      const reminderType = getReminderTypeText(reminder);
      const subject = `Reminder: ${reminderType} Due for ${reminder.vehicleReg}`;
      const body = `Dear ${reminder.customerName},\n\nThis is a friendly reminder that your ${reminderType.toLowerCase()} for ${reminder.vehicleReg} (${reminder.vehicleDetails}) is due on ${dateUtils.formatDate(reminder.dueDate)}.\n\nPlease contact us to schedule an appointment.\n\nBest regards,\nCharlie's Workshop`;

      await emailService.sendEmail(reminder.customerEmail, subject, body);
      console.log('Email sent successfully');
      setShowEmailModal(false);
      setSelectedReminder(null);
      Alert.alert('Success', 'Email sent successfully!');
    } catch (error: any) {
      console.error('Error sending email:', error);
      Alert.alert('Error', error.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const showEmailTroubleshooting = () => {
    const message = `Email functionality requires Supabase configuration.\n\nTo enable email reminders:\n1. Set up Supabase project\n2. Configure email service\n3. Add SMTP settings\n\nFor now, you can:\n- Call customers directly\n- Send SMS reminders\n- Use your email client`;
    Alert.alert('Email Setup Required', message);
  };

  const handleSendReminder = (reminder: Reminder) => {
    console.log('User tapped Send Reminder button for:', reminder.customerName);
    setSelectedReminder(reminder);
    setShowEmailModal(true);
  };

  const handleConfirmSendEmail = () => {
    if (selectedReminder) {
      if (!isSupabaseConfigured()) {
        setShowEmailModal(false);
        showEmailTroubleshooting();
        return;
      }
      sendAutomatedEmail(selectedReminder);
    }
  };

  const handleCancelSendEmail = () => {
    console.log('User cancelled email send');
    setShowEmailModal(false);
    setSelectedReminder(null);
  };

  const getReminderTypeText = (reminder: Reminder) => {
    if (reminder.isMerged) {
      return 'Inspection & Service';
    }
    const typeText = reminder.types.includes('inspection') ? 'Inspection' : 'Service';
    return typeText;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{notificationStats.total}</Text>
          <Text style={styles.statLabel}>Total Scheduled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{notificationStats.inspections}</Text>
          <Text style={styles.statLabel}>Inspections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{notificationStats.services}</Text>
          <Text style={styles.statLabel}>Services</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="bell"
              android_material_icon_name="notifications"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No upcoming reminders</Text>
            <Text style={styles.emptySubtext}>All vehicles are up to date!</Text>
          </View>
        ) : (
          reminders.map((reminder, index) => {
            const reminderTypeText = getReminderTypeText(reminder);
            const dueDateDisplay = dateUtils.formatDate(reminder.dueDate);
            const daysText = reminder.isOverdue
              ? `${Math.abs(reminder.daysUntil)} days overdue`
              : reminder.daysUntil === 0
              ? 'Due today'
              : `Due in ${reminder.daysUntil} days`;
            
            return (
              <React.Fragment key={index}>
                <View style={[styles.reminderCard, reminder.isOverdue && styles.reminderCardOverdue]}>
                  <View style={styles.reminderHeader}>
                    <View style={styles.reminderHeaderLeft}>
                      <Text style={styles.reminderType}>{reminderTypeText}</Text>
                      <View style={[styles.dueBadge, reminder.isOverdue && styles.dueBadgeOverdue]}>
                        <Text style={styles.dueText}>{daysText}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.reminderBody}>
                    <View style={styles.infoRow}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.infoText}>{reminder.customerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <IconSymbol
                        ios_icon_name="car.fill"
                        android_material_icon_name="directions-car"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.infoText}>{reminder.vehicleReg} - {reminder.vehicleDetails}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <IconSymbol
                        ios_icon_name="calendar"
                        android_material_icon_name="calendar-today"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.infoText}>Due: {dueDateDisplay}</Text>
                    </View>
                  </View>

                  <View style={styles.reminderActions}>
                    {reminder.customerPhone && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(`tel:${reminder.customerPhone}`)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          ios_icon_name="phone.fill"
                          android_material_icon_name="phone"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.actionButtonText}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {reminder.customerMobile && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(`sms:${reminder.customerMobile}`)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          ios_icon_name="message.fill"
                          android_material_icon_name="message"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.actionButtonText}>SMS</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSendReminder(reminder)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name="envelope.fill"
                        android_material_icon_name="email"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.actionButtonText}>Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </React.Fragment>
            );
          })
        )}
      </ScrollView>

      {/* Email Confirmation Modal */}
      <Modal visible={showEmailModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Send Email Reminder?</Text>
            <Text style={styles.modalText}>
              Send a reminder email to {selectedReminder?.customerName} at {selectedReminder?.customerEmail}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={handleCancelSendEmail}
                disabled={sendingEmail}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, sendingEmail && styles.modalConfirmDisabled]}
                onPress={handleConfirmSendEmail}
                disabled={sendingEmail}
                activeOpacity={0.7}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Send</Text>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
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
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
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
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderCardOverdue: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  dueBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueBadgeOverdue: {
    backgroundColor: colors.error,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
