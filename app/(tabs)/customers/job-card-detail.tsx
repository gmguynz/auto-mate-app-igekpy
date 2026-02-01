
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
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

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
  const [printing, setPrinting] = useState(false);

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

  const handlePrint = async () => {
    if (!jobCard) return;
    
    console.log('User tapped Print button for job card:', jobCard.jobNumber);
    setPrinting(true);
    
    try {
      const html = generateJobCardHTML(jobCard, taxRate);
      
      if (Platform.OS === 'web') {
        // On web, open print dialog
        await Print.printAsync({ html });
        console.log('Print dialog opened');
      } else {
        // On mobile, save as PDF and share
        const { uri } = await Print.printToFileAsync({ html });
        console.log('PDF generated at:', uri);
        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        console.log('PDF shared successfully');
      }
    } catch (error: any) {
      console.error('Error printing job card:', error);
      alert(error.message || 'Failed to print job card');
    } finally {
      setPrinting(false);
    }
  };

  const generateJobCardHTML = (card: JobCard, tax: number): string => {
    // Parse numeric values
    const partsCostNum = parseFloat(card.partsCost as any) || 0;
    const labourCostNum = parseFloat(card.labourCost as any) || 0;
    const subtotal = partsCostNum + labourCostNum;
    const taxAmount = subtotal * (tax / 100);
    const totalWithTax = subtotal + taxAmount;

    // Generate parts rows
    const partsRows = card.partsUsed && card.partsUsed.length > 0
      ? card.partsUsed.map(part => {
          const partQuantityNum = parseFloat(part.quantity as any) || 0;
          const partPriceNum = parseFloat(part.pricePerUnit as any) || 0;
          const partTotalNum = partQuantityNum * partPriceNum;
          
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${part.partName}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">${partQuantityNum}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${partPriceNum.toFixed(2)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600;">$${partTotalNum.toFixed(2)}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #666;">No parts used</td></tr>';

    // Generate labour rows
    const labourRows = card.labourEntries && card.labourEntries.length > 0
      ? card.labourEntries.map(labour => {
          const labourHoursNum = parseFloat(labour.hours as any) || 0;
          const labourRateNum = parseFloat(labour.ratePerHour as any) || 0;
          const labourTotalNum = labourHoursNum * labourRateNum;
          
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${labour.description || 'Labour'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">${labourHoursNum} hrs</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${labourRateNum.toFixed(2)}/hr</td>
              <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600;">$${labourTotalNum.toFixed(2)}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #666;">No labour entries</td></tr>';

    const statusColors: { [key: string]: string } = {
      open: '#FF9500',
      in_progress: '#007AFF',
      completed: '#34C759',
      cancelled: '#FF3B30',
    };

    const statusLabels: { [key: string]: string } = {
      open: 'Open',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Card ${card.jobNumber}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #333;
              background: white;
            }
            
            .container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 10mm;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 3px solid #007AFF;
            }
            
            .company-info h1 {
              font-size: 24pt;
              color: #007AFF;
              margin-bottom: 5px;
            }
            
            .company-info p {
              font-size: 10pt;
              color: #666;
            }
            
            .job-info {
              text-align: right;
            }
            
            .job-number {
              font-size: 20pt;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              color: white;
              font-size: 10pt;
              font-weight: 600;
              background-color: ${statusColors[card.status] || '#666'};
            }
            
            .section {
              margin-bottom: 20px;
            }
            
            .section-title {
              font-size: 14pt;
              font-weight: bold;
              color: #007AFF;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 2px solid #e0e0e0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .info-item {
              display: flex;
              flex-direction: column;
            }
            
            .info-label {
              font-size: 9pt;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
            }
            
            .info-value {
              font-size: 11pt;
              color: #333;
              font-weight: 600;
            }
            
            .description-box {
              background: #f8f8f8;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 10px;
            }
            
            .description-label {
              font-size: 10pt;
              font-weight: 600;
              color: #333;
              margin-bottom: 5px;
            }
            
            .description-text {
              font-size: 10pt;
              color: #666;
              line-height: 1.6;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            
            th {
              background: #007AFF;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-size: 10pt;
              font-weight: 600;
            }
            
            th:nth-child(2),
            th:nth-child(3),
            th:nth-child(4) {
              text-align: right;
            }
            
            td {
              font-size: 10pt;
              color: #333;
            }
            
            .cost-summary {
              margin-top: 20px;
              padding: 15px;
              background: #f8f8f8;
              border-radius: 8px;
            }
            
            .cost-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 11pt;
            }
            
            .cost-row.subtotal {
              border-top: 1px solid #ccc;
              margin-top: 8px;
              padding-top: 12px;
            }
            
            .cost-row.total {
              border-top: 2px solid #007AFF;
              margin-top: 8px;
              padding-top: 12px;
              font-size: 14pt;
              font-weight: bold;
              color: #007AFF;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              font-size: 9pt;
              color: #666;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="company-info">
                <h1>Charlie&apos;s Workshop</h1>
                <p>Professional Automotive Services</p>
              </div>
              <div class="job-info">
                <div class="job-number">${card.jobNumber}</div>
                <span class="status-badge">${statusLabels[card.status] || card.status}</span>
              </div>
            </div>
            
            <!-- Customer & Vehicle Information -->
            <div class="section">
              <h2 class="section-title">Customer & Vehicle Information</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Customer Name</span>
                  <span class="info-value">${card.customerName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email</span>
                  <span class="info-value">${card.customerEmail}</span>
                </div>
                ${card.customerPhone ? `
                <div class="info-item">
                  <span class="info-label">Phone</span>
                  <span class="info-value">${card.customerPhone}</span>
                </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Vehicle Registration</span>
                  <span class="info-value">${card.vehicleReg}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Make & Model</span>
                  <span class="info-value">${card.vehicleMake} ${card.vehicleModel}</span>
                </div>
                ${card.vehicleYear ? `
                <div class="info-item">
                  <span class="info-label">Year</span>
                  <span class="info-value">${card.vehicleYear}</span>
                </div>
                ` : ''}
                ${card.vinNumber ? `
                <div class="info-item">
                  <span class="info-label">VIN</span>
                  <span class="info-value">${card.vinNumber}</span>
                </div>
                ` : ''}
                ${card.odometer ? `
                <div class="info-item">
                  <span class="info-label">Odometer</span>
                  <span class="info-value">${card.odometer} km</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            ${card.technicianName ? `
            <!-- Technician -->
            <div class="section">
              <h2 class="section-title">Technician</h2>
              <div class="info-item">
                <span class="info-label">Assigned To</span>
                <span class="info-value">${card.technicianName}</span>
              </div>
            </div>
            ` : ''}
            
            ${card.wofExpiry || card.serviceDueDate ? `
            <!-- Service Dates -->
            <div class="section">
              <h2 class="section-title">Service Dates</h2>
              <div class="info-grid">
                ${card.wofExpiry ? `
                <div class="info-item">
                  <span class="info-label">WOF Expiry</span>
                  <span class="info-value">${card.wofExpiry}</span>
                </div>
                ` : ''}
                ${card.serviceDueDate ? `
                <div class="info-item">
                  <span class="info-label">Service Due</span>
                  <span class="info-value">${card.serviceDueDate}</span>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${card.description || card.workDone || card.notes ? `
            <!-- Work Description -->
            <div class="section">
              <h2 class="section-title">Work Description</h2>
              ${card.description ? `
              <div class="description-box">
                <div class="description-label">Work Required:</div>
                <div class="description-text">${card.description}</div>
              </div>
              ` : ''}
              ${card.workDone ? `
              <div class="description-box">
                <div class="description-label">Work Done:</div>
                <div class="description-text">${card.workDone}</div>
              </div>
              ` : ''}
              ${card.notes ? `
              <div class="description-box">
                <div class="description-label">Notes:</div>
                <div class="description-text">${card.notes}</div>
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            <!-- Parts Used -->
            <div class="section">
              <h2 class="section-title">Parts Used</h2>
              <table>
                <thead>
                  <tr>
                    <th>Part Name</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${partsRows}
                </tbody>
              </table>
            </div>
            
            <!-- Labour -->
            <div class="section">
              <h2 class="section-title">Labour</h2>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Hours</th>
                    <th style="text-align: right;">Rate</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${labourRows}
                </tbody>
              </table>
            </div>
            
            <!-- Cost Summary -->
            <div class="cost-summary">
              <div class="cost-row">
                <span>Parts:</span>
                <span>$${partsCostNum.toFixed(2)}</span>
              </div>
              <div class="cost-row">
                <span>Labour:</span>
                <span>$${labourCostNum.toFixed(2)}</span>
              </div>
              <div class="cost-row subtotal">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div class="cost-row">
                <span>Tax (${tax}%):</span>
                <span>$${taxAmount.toFixed(2)}</span>
              </div>
              <div class="cost-row total">
                <span>Total:</span>
                <span>$${totalWithTax.toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Dates -->
            <div class="section">
              <h2 class="section-title">Job Dates</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Created</span>
                  <span class="info-value">${dateUtils.formatDate(card.createdAt)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Updated</span>
                  <span class="info-value">${dateUtils.formatDate(card.updatedAt)}</span>
                </div>
                ${card.completedAt ? `
                <div class="info-item">
                  <span class="info-label">Completed</span>
                  <span class="info-value">${dateUtils.formatDate(card.completedAt)}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>Thank you for choosing Charlie&apos;s Workshop</p>
              <p>This document was generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
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

  // Parse numeric values to ensure they're numbers before calculations
  const partsCostNum = parseFloat(jobCard.partsCost as any) || 0;
  const labourCostNum = parseFloat(jobCard.labourCost as any) || 0;
  const subtotal = partsCostNum + labourCostNum;
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
          <TouchableOpacity 
            onPress={handlePrint} 
            style={styles.headerButton} 
            activeOpacity={0.7}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol
                ios_icon_name="printer.fill"
                android_material_icon_name="print"
                size={24}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
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
              // Parse to numbers BEFORE calculation
              const partQuantityNum = parseFloat(part.quantity as any) || 0;
              const partPriceNum = parseFloat(part.pricePerUnit as any) || 0;
              const partTotalNum = partQuantityNum * partPriceNum;
              
              const partTotal = formatCurrency(partTotalNum);
              const partQuantity = `Qty: ${partQuantityNum}`;
              const partPrice = `@ ${formatCurrency(partPriceNum)}`;
              
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
              // Parse to numbers BEFORE calculation
              const labourHoursNum = parseFloat(labour.hours as any) || 0;
              const labourRateNum = parseFloat(labour.ratePerHour as any) || 0;
              const labourTotalNum = labourHoursNum * labourRateNum;
              
              const labourTotal = formatCurrency(labourTotalNum);
              const labourHours = `${labourHoursNum} hrs`;
              const labourRate = `@ ${formatCurrency(labourRateNum)}/hr`;
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
              <Text style={styles.costValue}>{formatCurrency(partsCostNum)}</Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Labour:</Text>
              <Text style={styles.costValue}>{formatCurrency(labourCostNum)}</Text>
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
