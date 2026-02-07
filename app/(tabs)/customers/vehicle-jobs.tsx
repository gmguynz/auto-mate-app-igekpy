
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { JobCard } from '@/types/jobCard';
import { jobCardStorage } from '@/utils/jobCardStorage';
import { dateUtils } from '@/utils/dateUtils';

export default function VehicleJobsScreen() {
  const router = useRouter();
  const { vehicleId, vehicleReg } = useLocalSearchParams();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const decodedVehicleReg = typeof vehicleReg === 'string' ? vehicleReg : 'Vehicle';

  useFocusEffect(
    useCallback(() => {
      console.log('Vehicle Jobs screen focused - loading job cards for vehicle:', vehicleId);
      loadJobCards(true);
    }, [vehicleId])
  );

  const loadJobCards = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('Loading job cards for vehicle:', vehicleId);
      if (typeof vehicleId === 'string') {
        const data = await jobCardStorage.getJobCardsByVehicle(vehicleId);
        console.log(`Loaded ${data.length} job cards for vehicle`);
        setJobCards(data);
      }
    } catch (error) {
      console.error('Error loading job cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('Refreshing job cards...');
    setRefreshing(true);
    loadJobCards(false);
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
    const currencySymbol = '$';
    const formattedAmount = amount.toFixed(2);
    return `${currencySymbol}${formattedAmount}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading job cards...</Text>
        </View>
      </View>
    );
  }

  const openCount = jobCards.filter(jc => jc.status === 'open').length;
  const inProgressCount = jobCards.filter(jc => jc.status === 'in_progress').length;
  const completedCount = jobCards.filter(jc => jc.status === 'completed').length;
  const totalValue = jobCards.reduce((sum, jc) => sum + jc.totalCost, 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text style={styles.vehicleReg}>{decodedVehicleReg}</Text>
        <Text style={styles.jobCount}>{jobCards.length} job{jobCards.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{inProgressCount}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {jobCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="description"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No job cards found</Text>
            <Text style={styles.emptySubtext}>
              This vehicle has no job cards yet
            </Text>
          </View>
        ) : (
          jobCards.map((jobCard, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={styles.jobCardItem}
                onPress={() => router.push(`/customers/job-card-detail?id=${jobCard.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.jobCardHeader}>
                  <View style={styles.jobCardHeaderLeft}>
                    <Text style={styles.jobNumber}>{jobCard.jobNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(jobCard.status) }]}>
                      <Text style={styles.statusText}>{getStatusLabel(jobCard.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobCardDate}>{dateUtils.formatDate(jobCard.createdAt)}</Text>
                </View>

                <View style={styles.jobCardBody}>
                  <View style={styles.infoRow}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.infoText}>{jobCard.customerName}</Text>
                  </View>
                  {jobCard.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {jobCard.description}
                    </Text>
                  )}
                </View>

                <View style={styles.jobCardFooter}>
                  <Text style={styles.totalCost}>{formatCurrency(jobCard.totalCost)}</Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))
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
  headerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehicleReg: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  jobCount: {
    fontSize: 14,
    color: colors.textSecondary,
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
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
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
  jobCardItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  jobCardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobCardBody: {
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
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalCost: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
