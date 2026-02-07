
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Part } from '@/types/jobCard';
import { jobCardStorage } from '@/utils/jobCardStorage';

export default function PartsScreen() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSku, setFormSku] = useState('');

  useFocusEffect(
    useCallback(() => {
      console.log('Parts screen focused - loading parts');
      loadParts(true);
    }, [])
  );

  const loadParts = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('Loading parts...');
      const data = await jobCardStorage.getParts();
      console.log(`Loaded ${data.length} parts`);
      setParts(data);
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('Refreshing parts...');
    setRefreshing(true);
    loadParts(false);
  };

  const handleBack = () => {
    console.log('User tapped back button on Parts screen - navigating to customers list');
    router.push('/(tabs)/customers');
  };

  const openAddModal = () => {
    console.log('User tapped Add Part button');
    setSelectedPart(null);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (part: Part) => {
    console.log('User tapped Edit Part button for:', part.name);
    setSelectedPart(part);
    setFormName(part.name);
    setFormDescription(part.description || '');
    setFormStockQuantity(part.stockQuantity.toString());
    setFormCostPrice(part.costPrice.toString());
    setFormSellPrice(part.sellPrice.toString());
    setFormSupplier(part.supplier || '');
    setFormSku(part.sku || '');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormStockQuantity('');
    setFormCostPrice('');
    setFormSellPrice('');
    setFormSupplier('');
    setFormSku('');
  };

  const handleSave = async () => {
    console.log('User tapped Save Part button');

    // Validation
    if (!formName.trim()) {
      alert('Please enter a part name');
      return;
    }

    if (!formSellPrice || parseFloat(formSellPrice) <= 0) {
      alert('Please enter a valid sell price');
      return;
    }

    setSaving(true);
    try {
      const partData: Partial<Part> = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        stockQuantity: parseInt(formStockQuantity) || 0,
        costPrice: parseFloat(formCostPrice) || 0,
        sellPrice: parseFloat(formSellPrice),
        supplier: formSupplier.trim() || undefined,
        sku: formSku.trim() || undefined,
      };

      if (selectedPart) {
        // Update existing part
        await jobCardStorage.updatePart({
          ...selectedPart,
          ...partData,
        } as Part);
        console.log('Part updated successfully');
      } else {
        // Create new part
        await jobCardStorage.addPart(partData);
        console.log('Part created successfully');
      }

      setShowAddModal(false);
      resetForm();
      loadParts(false);
    } catch (error: any) {
      console.error('Error saving part:', error);
      alert(error.message || 'Failed to save part');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPart) return;

    console.log('User confirmed delete part:', selectedPart.name);
    setDeleting(true);
    try {
      await jobCardStorage.deletePart(selectedPart.id);
      console.log('Part deleted successfully');
      setShowDeleteModal(false);
      setSelectedPart(null);
      loadParts(false);
    } catch (error: any) {
      console.error('Error deleting part:', error);
      alert(error.message || 'Failed to delete part');
    } finally {
      setDeleting(false);
    }
  };

  const getFilteredParts = () => {
    if (!searchQuery.trim()) return parts;
    const query = searchQuery.toLowerCase();
    return parts.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.supplier && p.supplier.toLowerCase().includes(query))
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Parts Inventory</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading parts...</Text>
        </View>
      </View>
    );
  }

  const filteredParts = getFilteredParts();
  const totalValue = parts.reduce((sum, part) => sum + (part.stockQuantity * part.costPrice), 0);
  const lowStockCount = parts.filter(p => p.stockQuantity < 5).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Parts Inventory</Text>
        <TouchableOpacity
          onPress={openAddModal}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{parts.length}</Text>
          <Text style={styles.statLabel}>Total Parts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, lowStockCount > 0 && { color: colors.error }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
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
          placeholder="Search parts..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredParts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="cube.box"
              android_material_icon_name="inventory"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No parts found' : 'No parts yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first part to get started'}
            </Text>
          </View>
        ) : (
          filteredParts.map((part, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={styles.partCard}
                onPress={() => openEditModal(part)}
                activeOpacity={0.7}
              >
                <View style={styles.partHeader}>
                  <View style={styles.partHeaderLeft}>
                    <Text style={styles.partName}>{part.name}</Text>
                    {part.sku && <Text style={styles.partSku}>SKU: {part.sku}</Text>}
                  </View>
                  <View style={styles.stockBadge}>
                    <Text style={[styles.stockText, part.stockQuantity < 5 && styles.stockTextLow]}>
                      {part.stockQuantity}
                    </Text>
                  </View>
                </View>

                {part.description && (
                  <Text style={styles.partDescription} numberOfLines={2}>
                    {part.description}
                  </Text>
                )}

                <View style={styles.partFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Cost</Text>
                    <Text style={styles.priceValue}>{formatCurrency(part.costPrice)}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Sell</Text>
                    <Text style={[styles.priceValue, styles.sellPrice]}>{formatCurrency(part.sellPrice)}</Text>
                  </View>
                  {part.supplier && (
                    <View style={styles.supplierContainer}>
                      <Text style={styles.supplierText}>{part.supplier}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Part Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPart ? 'Edit Part' : 'Add Part'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Part Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter part name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>SKU</Text>
              <TextInput
                style={styles.formInput}
                value={formSku}
                onChangeText={setFormSku}
                placeholder="Enter SKU"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Enter description"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.formLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.formInput}
                value={formStockQuantity}
                onChangeText={setFormStockQuantity}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Cost Price</Text>
              <TextInput
                style={styles.formInput}
                value={formCostPrice}
                onChangeText={setFormCostPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Sell Price *</Text>
              <TextInput
                style={styles.formInput}
                value={formSellPrice}
                onChangeText={setFormSellPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Supplier</Text>
              <TextInput
                style={styles.formInput}
                value={formSupplier}
                onChangeText={setFormSupplier}
                placeholder="Enter supplier name"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.formButtons}>
                {selectedPart && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setShowAddModal(false);
                      setShowDeleteModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="trash.fill"
                      android_material_icon_name="delete"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Part</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Part?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete &quot;{selectedPart?.name}&quot;? This action cannot be undone.
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
  addButton: {
    padding: 8,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 12,
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
  partCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  partHeaderLeft: {
    flex: 1,
  },
  partName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  partSku: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stockBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  stockText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stockTextLow: {
    color: colors.error,
  },
  partDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  partFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sellPrice: {
    color: colors.primary,
  },
  supplierContainer: {
    flex: 1,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  formScroll: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
});
