
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { jobCardStorage } from '@/utils/jobCardStorage';
import { AppSettings } from '@/types/jobCard';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  role: 'admin' | 'user' | 'technician';
  created_at: string;
  updated_at: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | 'technician'>('user');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<AppSettings>({ defaultHourlyRate: 0, defaultTaxRate: 0 });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      console.log('User is not admin, redirecting to home');
      router.replace('/');
      return;
    }
    loadUsers(true);
    loadSettings();
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      console.log('Loading app settings...');
      const appSettings = await jobCardStorage.getSettings();
      setSettings(appSettings);
      console.log('Settings loaded:', appSettings);
    } catch (error: any) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUsers = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('Loading users...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} users`);
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCreateUser = () => {
    console.log('User tapped Create User button');
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('user');
    setShowCreateModal(true);
  };

  const handleEditUser = (user: UserProfile) => {
    console.log('User tapped Edit User button for:', user.email);
    setSelectedUser(user);
    setFullName(user.full_name || '');
    setRole(user.role);
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    console.log('User tapped Update User button');
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim() || null,
          role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      console.log('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendPasswordReset = async (userEmail: string) => {
    console.log('User tapped Send Password Reset for:', userEmail);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Error sending password reset:', error);
        throw error;
      }

      alert(`Password reset email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert(error.message || 'Failed to send password reset email');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    console.log('User tapped Delete User button for:', userEmail);
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    setSelectedUser(userToDelete);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    console.log('User confirmed delete for:', selectedUser.email);
    try {
      // Delete user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        throw profileError;
      }

      // Delete auth user (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue anyway as profile is deleted
      }

      console.log('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string, userEmail: string) => {
    console.log('User tapped Toggle Role for:', userEmail);
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    setSelectedUser(userToUpdate);
    setRole(userToUpdate.role);
    setShowRoleModal(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    console.log('User confirmed role change to:', role);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Error updating user role:', error);
        throw error;
      }

      console.log('User role updated successfully');
      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers(false);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      alert(error.message || 'Failed to update user role');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const roleColorMap = {
      admin: colors.error,
      technician: colors.accent,
      user: colors.primary,
    };
    const roleKey = role as keyof typeof roleColorMap;
    return roleColorMap[roleKey] || colors.textSecondary;
  };

  const getRoleLabel = (role: string) => {
    const roleLabelMap = {
      admin: 'Admin',
      technician: 'Technician',
      user: 'User',
    };
    const roleKey = role as keyof typeof roleLabelMap;
    return roleLabelMap[roleKey] || role;
  };

  const handleOpenSettings = () => {
    console.log('User tapped Settings button');
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    console.log('User tapped Save Settings button');
    setSavingSettings(true);
    try {
      await jobCardStorage.updateSettings(settings);
      console.log('Settings saved successfully');
      alert('Settings saved successfully');
      setShowSettingsModal(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>User Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  const adminCount = users.filter(u => u.role === 'admin').length;
  const technicianCount = users.filter(u => u.role === 'technician').length;
  const userCount = users.filter(u => u.role === 'user').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Console</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="gear"
              android_material_icon_name="settings"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreateUser}
            style={styles.headerButton}
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
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{adminCount}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{technicianCount}</Text>
          <Text style={styles.statLabel}>Technicians</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userCount}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers(false); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {users.map((userProfile, index) => (
          <React.Fragment key={index}>
            <View style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{userProfile.full_name || userProfile.email}</Text>
                  <Text style={styles.userEmail}>{userProfile.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(userProfile.role) }]}>
                  <Text style={styles.roleText}>{getRoleLabel(userProfile.role)}</Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditUser(userProfile)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="pencil"
                    android_material_icon_name="edit"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleRole(userProfile.id, userProfile.role, userProfile.email)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="person.badge.key"
                    android_material_icon_name="admin-panel-settings"
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={styles.actionButtonText}>Role</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleSendPasswordReset(userProfile.email)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="key.fill"
                    android_material_icon_name="vpn-key"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.actionButtonText}>Reset</Text>
                </TouchableOpacity>

                {userProfile.id !== user?.id && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteUser(userProfile.id, userProfile.email)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="trash.fill"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Edit User Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput
                style={styles.formInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'user' && styles.roleOptionActive]}
                  onPress={() => setRole('user')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleOptionText, role === 'user' && styles.roleOptionTextActive]}>User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'technician' && styles.roleOptionActive]}
                  onPress={() => setRole('technician')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleOptionText, role === 'technician' && styles.roleOptionTextActive]}>Technician</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'admin' && styles.roleOptionActive]}
                  onPress={() => setRole('admin')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleOptionText, role === 'admin' && styles.roleOptionTextActive]}>Admin</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                onPress={handleUpdateUser}
                disabled={updating}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Update User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Change Modal */}
      <Modal visible={showRoleModal} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Change User Role</Text>
            <Text style={styles.deleteModalText}>
              Select a new role for {selectedUser?.email}
            </Text>

            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, role === 'user' && styles.roleOptionActive]}
                onPress={() => setRole('user')}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleOptionText, role === 'user' && styles.roleOptionTextActive]}>User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, role === 'technician' && styles.roleOptionActive]}
                onPress={() => setRole('technician')}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleOptionText, role === 'technician' && styles.roleOptionTextActive]}>Technician</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, role === 'admin' && styles.roleOptionActive]}
                onPress={() => setRole('admin')}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleOptionText, role === 'admin' && styles.roleOptionTextActive]}>Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowRoleModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmRoleChange}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Change Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete User?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteUser}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.settingsDescription}>
                Configure default rates for job cards. These values will be pre-filled when creating new job cards.
              </Text>

              <Text style={styles.formLabel}>Default Hourly Labour Rate ($)</Text>
              <TextInput
                style={styles.formInput}
                value={settings.defaultHourlyRate.toString()}
                onChangeText={(text) => setSettings({ ...settings, defaultHourlyRate: parseFloat(text) || 0 })}
                placeholder="Enter hourly rate"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Default Tax Rate (%)</Text>
              <TextInput
                style={styles.formInput}
                value={settings.defaultTaxRate.toString()}
                onChangeText={(text) => setSettings({ ...settings, defaultTaxRate: parseFloat(text) || 0 })}
                placeholder="Enter tax rate percentage"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <View style={styles.settingsPreview}>
                <Text style={styles.settingsPreviewTitle}>Preview</Text>
                <View style={styles.settingsPreviewRow}>
                  <Text style={styles.settingsPreviewLabel}>Hourly Rate:</Text>
                  <Text style={styles.settingsPreviewValue}>${settings.defaultHourlyRate.toFixed(2)}/hr</Text>
                </View>
                <View style={styles.settingsPreviewRow}>
                  <Text style={styles.settingsPreviewLabel}>Tax Rate:</Text>
                  <Text style={styles.settingsPreviewValue}>{settings.defaultTaxRate.toFixed(2)}%</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, savingSettings && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={savingSettings}
                activeOpacity={0.7}
              >
                {savingSettings ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Settings</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    maxHeight: '80%',
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
  formContainer: {
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
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
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
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  settingsPreview: {
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  settingsPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  settingsPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingsPreviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingsPreviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
