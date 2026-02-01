
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { jobCardStorage } from '@/utils/jobCardStorage';
import { dateUtils } from '@/utils/dateUtils';
import { JobCard } from '@/types/jobCard';
import { useAuth } from '@/contexts/AuthContext';

export default function JobCardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jobCardId = params.id as string;
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    console.log('Job Card Detail screen loaded for ID:', jobCardId);
    loadJobCard();
  }, [jobCardId]);

  const loadJobCard = async () => {
    setLoading(true);
    try {
      console.log('Loading job card details...');
      const [card, settings] = await Promise.all([
        jobCardStorage.getJobCardById(jobCardId),
        jobCardStorage.getSettings(),
      ]);
      
      if (card) {
        setJobCard(card);
        setTaxRate(settings.defaultTaxRate);
        console.log('Job card loaded:', card.jobNumber);
      } else {
        console.error('Job card not found');
        alert('Job card not found');
        router.back();
      }
    } catch (error: any) {
      console.error('Error loading job card:', error);
      alert(error.message || 'Failed to load job card');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log('User tapped Edit button');
    router.push(`/customers/add-job-card?id=${jobCardId}`);
  };

  const handleDelete = () => {
    console.log('User tapped Delete button');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    console.log('User confirmed delete');
    setDeleting(true);
    try {
      await jobCardStorage.deleteJobCard(jobCardId);
      console.log('Job card deleted successfully');
      setShowDeleteModal(false);
      router.back();
    } catch (error: any) {
      console.error('Error deleting job card:', error);
      alert(error.message || 'Failed to delete job card');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusClick = () => {
    if (isAdmin) {
      console.log('Admin tapped status badge to change status');
      setShowStatusModal(true);
    }
  };

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'completed' | 'cancelled') => {
    if (!jobCard) return;
    
    console.log('Admin changing status from', jobCard.status, 'to', newStatus);
    setChangingStatus(true);
    
    try {
      const updatedJobCard = { ...jobCard, status: newStatus };
      await jobCardStorage.updateJobCard(updatedJobCard);
      setJobCard(updatedJobCard);
      setShowStatusModal(false);
      console.log('Status changed successfully');
    } catch (error: any) {
      console.error('Error changing status:', error);
      alert(error.message || 'Failed to change status');
    } finally {
      setChangingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColorMap = {
      open: colors.accent,
      in_progress: colors.primary,
      completed: colors.success,
      cancelled: colors.error,
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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading job card...</Text>
        </View>
      </View>
    );
  }

  if (!jobCard) {
    return null;
  }

  const subtotal = jobCard.partsCost + jobCard.labourCost;
  const taxAmount = subtotal * (taxRate / 100);
  const totalWithTax = subtotal + taxAmount;
  const createdDate = dateUtils.formatDate(jobCard.createdAt);
  const updatedDate = dateUtils.formatDate(jobCard.updatedAt);
  const completedDate = jobCard.completedAt ? dateUtils.formatDate(jobCard.completedAt) : null;
  const vehicleMakeModel = `${jobCard.vehicleMake} ${jobCard.vehicleModel}`;
  const statusColor = getStatusColor(jobCard.status);
  const statusLabel = getStatusLabel(jobCard.status);
  const odometerDisplay = jobCard.odometer ? `${jobCard.odometer} km` : '';
  const taxRateDisplay = `${taxRate}%`;

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
        <Text style={styles.title}>Job Card Details</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={24}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Job Number and Status */}
        <View style={styles.headerCard}>
          <View style={styles.jobNumberContainer}>
            <Text style={styles.jobNumberLabel}>Job Number</Text>
            <Text style={styles.jobNumber}>{jobCard.jobNumber}</Text>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: statusColor }]}
            onPress={handleStatusClick}
            activeOpacity={isAdmin ? 0.7 : 1}
            disabled={!isAdmin}
          >
            <Text style={styles.statusText}>{statusLabel}</Text>
            {isAdmin && (
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="arrow-drop-down"
                size={16}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Customer & Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer:</Text>
            <Text style={styles.infoValue}>{jobCard.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{jobCard.customerEmail}</Text>
          </View>
          {jobCard.customerPhone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{jobCard.customerPhone}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle:</Text>
            <Text style={styles.infoValue}>{jobCard.vehicleReg}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Make/Model:</Text>
            <Text style={styles.infoValue}>{vehicleMakeModel}</Text>
          </View>
          {jobCard.vehicleYear && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Year:</Text>
              <Text style={styles.infoValue}>{jobCard.vehicleYear}</Text>
            </View>
          )}
        </View>

        {/* Technician */}
        {jobCard.technicianName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned to:</Text>
              <Text style={styles.infoValue}>{jobCard.technicianName}</Text>
            </View>
          </View>
        )}

        {/* Vehicle Details */}
        {(jobCard.vinNumber || jobCard.odometer || jobCard.wofExpiry || jobCard.serviceDueDate) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            {jobCard.vinNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>VIN:</Text>
                <Text style={styles.infoValue}>{jobCard.vinNumber}</Text>
              </View>
            )}
            {jobCard.odometer && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Odometer:</Text>
                <Text style={styles.infoValue}>{odometerDisplay}</Text>
              </View>
            )}
            {jobCard.wofExpiry && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>WOF Expiry:</Text>
                <Text style={styles.infoValue}>{jobCard.wofExpiry}</Text>
              </View>
            )}
            {jobCard.serviceDueDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Service Due:</Text>
                <Text style={styles.infoValue}>{jobCard.serviceDueDate}</Text>
              </View>
            )}
          </View>
        )}

        {/* Work Description */}
        {(jobCard.description || jobCard.workDone || jobCard.notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Description</Text>
            {jobCard.description && (
              <React.Fragment>
                <Text style={styles.descriptionLabel}>Work Required:</Text>
                <Text style={styles.descriptionText}>{jobCard.description}</Text>
              </React.Fragment>
            )}
            {jobCard.workDone && (
              <React.Fragment>
                <Text style={styles.descriptionLabel}>Work Done:</Text>
                <Text style={styles.descriptionText}>{jobCard.workDone}</Text>
              </React.Fragment>
            )}
            {jobCard.notes && (
              <React.Fragment>
                <Text style={styles.descriptionLabel}>Notes:</Text>
                <Text style={styles.descriptionText}>{jobCard.notes}</Text>
              </React.Fragment>
            )}
          </View>
        )}

        {/* Parts Used */}
        {jobCard.partsUsed && jobCard.partsUsed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            {jobCard.partsUsed.map((part, index) => {
              const partTotal = formatCurrency(part.quantity * part.pricePerUnit);
              const partQuantity = `Qty: ${part.quantity}`;
              const partPrice = `@ ${formatCurrency(part.pricePerUnit)}`;
              
              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{part.partName}</Text>
                    {isAdmin && <Text style={styles.itemPrice}>{partTotal}</Text>}
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDetailText}>{partQuantity}</Text>
                    {isAdmin && <Text style={styles.itemDetailText}>{partPrice}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Labour Entries */}
        {jobCard.labourEntries && jobCard.labourEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Labour</Text>
            {jobCard.labourEntries.map((labour, index) => {
              const labourTotal = formatCurrency(labour.hours * labour.ratePerHour);
              const labourHours = `${labour.hours} hrs`;
              const labourRate = `@ ${formatCurrency(labour.ratePerHour)}/hr`;
              const labourDesc = labour.description || 'Labour';
              
              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{labourDesc}</Text>
                    {isAdmin && <Text style={styles.itemPrice}>{labourTotal}</Text>}
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDetailText}>{labourHours}</Text>
                    {isAdmin && <Text style={styles.itemDetailText}>{labourRate}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Cost Breakdown - Admin Only */}
        {isAdmin && (
          <View style={styles.costBreakdownSection}>
            <Text style={styles.costBreakdownTitle}>Cost Breakdown</Text>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Parts:</Text>
              <Text style={styles.costValue}>{formatCurrency(jobCard.partsCost)}</Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Labour:</Text>
              <Text style={styles.costValue}>{formatCurrency(jobCard.labourCost)}</Text>
            </View>
            
            <View style={styles.costDivider} />
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Subtotal:</Text>
              <Text style={styles.costValue}>{formatCurrency(subtotal)}</Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Tax ({taxRateDisplay}):</Text>
              <Text style={styles.costValue}>{formatCurrency(taxAmount)}</Text>
            </View>
            
            <View style={styles.costDivider} />
            
            <View style={styles.costRow}>
              <Text style={styles.costLabelTotal}>Total:</Text>
              <Text style={styles.costValueTotal}>{formatCurrency(totalWithTax)}</Text>
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{createdDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{updatedDate}</Text>
          </View>
          {completedDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed:</Text>
              <Text style={styles.infoValue}>{completedDate}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Job Card?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete job card {jobCard.jobNumber}? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirm, deleting && styles.deleteModalConfirmDisabled]}
                onPress={confirmDelete}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Change Modal (Admin Only) */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModal}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>Change Job Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  jobCard.status === 'open' && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange('open')}
                activeOpacity={0.7}
                disabled={changingStatus}
              >
                <View style={[styles.statusOptionBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.statusOptionBadgeText}>Open</Text>
                </View>
                {jobCard.status === 'open' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  jobCard.status === 'in_progress' && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange('in_progress')}
                activeOpacity={0.7}
                disabled={changingStatus}
              >
                <View style={[styles.statusOptionBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.statusOptionBadgeText}>In Progress</Text>
                </View>
                {jobCard.status === 'in_progress' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  jobCard.status === 'completed' && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange('completed')}
                activeOpacity={0.7}
                disabled={changingStatus}
              >
                <View style={[styles.statusOptionBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.statusOptionBadgeText}>Completed</Text>
                </View>
                {jobCard.status === 'completed' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  jobCard.status === 'cancelled' && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange('cancelled')}
                activeOpacity={0.7}
                disabled={changingStatus}
              >
                <View style={[styles.statusOptionBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.statusOptionBadgeText}>Cancelled</Text>
                </View>
                {jobCard.status === 'cancelled' && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            </View>

            {changingStatus && (
              <View style={styles.statusModalLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusModalLoadingText}>Updating status...</Text>
              </View>
            )}
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobNumberContainer: {
    flex: 1,
  },
  jobNumberLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  jobNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  itemDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  costBreakdownSection: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  costBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  costLabelTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  costValueTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  costDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  deleteModalConfirmDisabled: {
    opacity: 0.6,
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  statusModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusOptions: {
    padding: 20,
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  statusOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  statusOptionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusOptionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusModalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  statusModalLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
