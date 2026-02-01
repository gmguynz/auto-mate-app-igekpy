
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
import { JobCard } from '@/types/jobCard';
import { dateUtils } from '@/utils/dateUtils';

export default function JobCardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jobCardId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    console.log('Job Card Detail screen loaded for ID:', jobCardId);
    loadJobCard();
  }, [jobCardId]);

  const loadJobCard = async () => {
    setLoading(true);
    try {
      console.log('Loading job card details...');
      const data = await jobCardStorage.getJobCardById(jobCardId);
      setJobCard(data);
    } catch (error) {
      console.error('Error loading job card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log('User tapped Edit Job Card button');
    router.push(`/customers/add-job-card?id=${jobCardId}`);
  };

  const handleDelete = async () => {
    console.log('User confirmed delete job card');
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

  const getStatusColor = (status: string) => {
    const statusColorMap = {
      open: colors.primary,
      in_progress: colors.accent,
      completed: '#4CAF50',
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Job Card</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading job card...</Text>
        </View>
      </View>
    );
  }

  if (!jobCard) {
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
          <Text style={styles.title}>Job Card</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Job card not found</Text>
        </View>
      </View>
    );
  }

  const partsCostTotal = jobCard.partsUsed.reduce((sum, part) => sum + (part.quantity * part.pricePerUnit), 0);
  const labourCostTotal = jobCard.labourEntries.reduce((sum, labour) => sum + (labour.hours * labour.ratePerHour), 0);

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
        <Text style={styles.title}>Job Card</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.headerButton} activeOpacity={0.7}>
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
          <Text style={styles.jobNumber}>{jobCard.jobNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(jobCard.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(jobCard.status)}</Text>
          </View>
        </View>

        {/* Customer & Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={20}
              color={colors.textSecondary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValue}>{jobCard.customerName}</Text>
              {jobCard.customerEmail && <Text style={styles.infoSubtext}>{jobCard.customerEmail}</Text>}
              {jobCard.customerPhone && <Text style={styles.infoSubtext}>{jobCard.customerPhone}</Text>}
            </View>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="car.fill"
              android_material_icon_name="directions-car"
              size={20}
              color={colors.textSecondary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>
                {jobCard.vehicleReg} - {jobCard.vehicleMake} {jobCard.vehicleModel}
              </Text>
              {jobCard.vehicleYear && <Text style={styles.infoSubtext}>Year: {jobCard.vehicleYear}</Text>}
            </View>
          </View>
        </View>

        {/* Technician */}
        {jobCard.technicianName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technician</Text>
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="wrench.fill"
                android_material_icon_name="build"
                size={20}
                color={colors.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>{jobCard.technicianName}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          {jobCard.vinNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VIN Number</Text>
              <Text style={styles.detailValue}>{jobCard.vinNumber}</Text>
            </View>
          )}
          {jobCard.odometer !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Odometer</Text>
              <Text style={styles.detailValue}>{jobCard.odometer.toLocaleString()} km</Text>
            </View>
          )}
          {jobCard.wofExpiry && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>WOF Expiry</Text>
              <Text style={styles.detailValue}>{dateUtils.formatDate(jobCard.wofExpiry)}</Text>
            </View>
          )}
          {jobCard.serviceDueDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service Due</Text>
              <Text style={styles.detailValue}>{dateUtils.formatDate(jobCard.serviceDueDate)}</Text>
            </View>
          )}
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          <Text style={styles.descriptionText}>{jobCard.description}</Text>
          {jobCard.notes && (
            <>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{jobCard.notes}</Text>
            </>
          )}
        </View>

        {/* Parts Used */}
        {jobCard.partsUsed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            {jobCard.partsUsed.map((part, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{part.partName}</Text>
                  <Text style={styles.itemTotal}>{formatCurrency(part.quantity * part.pricePerUnit)}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetailText}>Qty: {part.quantity}</Text>
                  <Text style={styles.itemDetailText}>×</Text>
                  <Text style={styles.itemDetailText}>{formatCurrency(part.pricePerUnit)}</Text>
                </View>
                {part.notes && <Text style={styles.itemNotes}>{part.notes}</Text>}
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Parts Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(partsCostTotal)}</Text>
            </View>
          </View>
        )}

        {/* Labour */}
        {jobCard.labourEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Labour</Text>
            {jobCard.labourEntries.map((labour, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{labour.description}</Text>
                  <Text style={styles.itemTotal}>{formatCurrency(labour.hours * labour.ratePerHour)}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetailText}>{labour.hours} hrs</Text>
                  <Text style={styles.itemDetailText}>×</Text>
                  <Text style={styles.itemDetailText}>{formatCurrency(labour.ratePerHour)}/hr</Text>
                </View>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Labour Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(labourCostTotal)}</Text>
            </View>
          </View>
        )}

        {/* Total Cost */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Cost</Text>
          <Text style={styles.totalValue}>{formatCurrency(jobCard.totalCost)}</Text>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{dateUtils.formatDate(jobCard.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{dateUtils.formatDate(jobCard.updatedAt)}</Text>
          </View>
          {jobCard.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={styles.detailValue}>{dateUtils.formatDate(jobCard.completedAt)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Job Card?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this job card? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirm, deleting && styles.deleteModalConfirmDisabled]}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.7}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
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
    alignItems: 'center',
  },
  jobNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
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
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  itemDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalSection: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalOverlay: {
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
});
