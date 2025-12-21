
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export default function AdminScreen() {
  const { isAdmin, profile } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.replace('/(tabs)');
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const loadUsers = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      console.log('Loading users...');
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, user_id, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      const endTime = Date.now();
      console.log(`Loaded ${data?.length || 0} users in ${endTime - startTime}ms`);

      if (error) {
        console.error('Error loading users:', error);
        Alert.alert('Error', 'Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers(false);
  }, []);

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (newUserPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newUserId && newUserId.length < 3) {
      Alert.alert('Error', 'User ID must be at least 3 characters');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserFullName,
            user_id: newUserId || null,
            role: newUserRole,
          },
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });

      if (error) {
        console.error('Error creating user:', error);
        Alert.alert('Error', error.message || 'Failed to create user');
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: newUserEmail,
            full_name: newUserFullName,
            user_id: newUserId || null,
            role: newUserRole,
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          console.log('User created but profile creation failed - will be created on first login');
        }
      }

      Alert.alert(
        'Success',
        `User created successfully! An email verification link has been sent to ${newUserEmail}. The user must verify their email before they can log in.${newUserId ? `\n\nUser ID: ${newUserId}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCreateModal(false);
              setNewUserEmail('');
              setNewUserPassword('');
              setNewUserFullName('');
              setNewUserId('');
              setNewUserRole('user');
              loadUsers(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setNewUserFullName(user.full_name || '');
    setNewUserId(user.user_id || '');
    setNewUserRole(user.role);
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!newUserFullName) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    if (newUserId && newUserId.length < 3) {
      Alert.alert('Error', 'User ID must be at least 3 characters');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: newUserFullName,
          user_id: newUserId || null,
          role: newUserRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating user:', error);
        Alert.alert('Error', error.message || 'Failed to update user');
        return;
      }

      Alert.alert(
        'Success',
        'User updated successfully. The user will need to log out and log back in for role changes to take effect.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowEditModal(false);
              setEditingUser(null);
              setNewUserFullName('');
              setNewUserId('');
              setNewUserRole('user');
              loadUsers(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendPasswordReset = async (userEmail: string) => {
    Alert.alert(
      'Send Password Reset',
      `Send a password reset email to ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              console.log('Sending password reset email to:', userEmail);
              const { data, error } = await supabase.auth.resetPasswordForEmail(
                userEmail,
                {
                  redirectTo: 'https://natively.dev/email-confirmed',
                }
              );

              if (error) {
                console.error('Password reset email error:', error);
                Alert.alert('Error', error.message || 'Failed to send reset email');
              } else {
                console.log('Password reset email sent successfully');
                Alert.alert(
                  'Email Sent',
                  `A password reset link has been sent to ${userEmail}. The user should check their inbox and spam folder.`
                );
              }
            } catch (error) {
              console.error('Password reset email error:', error);
              Alert.alert('Error', 'Failed to send reset email');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === profile?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userEmail}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting user:', userId);
              const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

              if (error) {
                console.error('Error deleting user:', error);
                Alert.alert('Error', 'Failed to delete user');
                return;
              }

              console.log('User deleted successfully');
              Alert.alert('Success', 'User deleted successfully');
              loadUsers(false);
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleToggleRole = async (userId: string, currentRole: string, userEmail: string) => {
    if (userId === profile?.id) {
      Alert.alert('Error', 'You cannot change your own role');
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    Alert.alert(
      'Change Role',
      `Change ${userEmail} role from ${currentRole} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              console.log('Changing role for user:', userId, 'to', newRole);
              const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', userId);

              if (error) {
                console.error('Error updating role:', error);
                Alert.alert('Error', 'Failed to update role');
                return;
              }

              console.log('Role updated successfully');
              Alert.alert(
                'Success', 
                'Role updated successfully. The user will need to log out and log back in for the changes to take effect.'
              );
              loadUsers(false);
            } catch (error) {
              console.error('Error updating role:', error);
              Alert.alert('Error', 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>Manage user accounts and permissions</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="person.badge.plus.fill"
            android_material_icon_name="person-add"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.createButtonText}>Create New User</Text>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.role === 'admin').length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.role === 'user').length}
            </Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        <View style={styles.usersList}>
          <Text style={styles.sectionTitle}>All Users</Text>
          {users.map((user, index) => (
            <React.Fragment key={user.id || `user-${index}`}>
              <View style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.full_name || 'No name'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.user_id && (
                      <Text style={styles.userIdText}>User ID: {user.user_id}</Text>
                    )}
                    <View style={styles.roleBadge}>
                      <Text
                        style={[
                          styles.roleText,
                          user.role === 'admin' && styles.roleTextAdmin,
                        ]}
                      >
                        {user.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditUser(user)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="pencil"
                      android_material_icon_name="edit"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSendPasswordReset(user.email)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="envelope.fill"
                      android_material_icon_name="email"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {user.id !== profile?.id && (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleRole(user.id, user.role, user.email)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.2.squarepath"
                          android_material_icon_name="swap-horiz"
                          size={20}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteUser(user.id, user.email)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          ios_icon_name="trash.fill"
                          android_material_icon_name="delete"
                          size={20}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserFullName}
                  onChangeText={setNewUserFullName}
                  editable={!creating}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!creating}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>User ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter custom user ID for login"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserId}
                  onChangeText={setNewUserId}
                  autoCapitalize="none"
                  editable={!creating}
                />
                <Text style={styles.helperText}>
                  User can log in with either email or this custom ID
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password (min 6 characters)"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserPassword}
                  onChangeText={setNewUserPassword}
                  secureTextEntry
                  editable={!creating}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserRole === 'user' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewUserRole('user')}
                    disabled={creating}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserRole === 'user' && styles.roleOptionTextSelected,
                      ]}
                    >
                      User
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserRole === 'admin' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewUserRole('admin')}
                    disabled={creating}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserRole === 'admin' && styles.roleOptionTextSelected,
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateUser}
                disabled={creating}
                activeOpacity={0.7}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create User</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email (read-only)</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={editingUser?.email}
                  editable={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserFullName}
                  onChangeText={setNewUserFullName}
                  editable={!updating}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>User ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter custom user ID for login"
                  placeholderTextColor={colors.textSecondary}
                  value={newUserId}
                  onChangeText={setNewUserId}
                  autoCapitalize="none"
                  editable={!updating}
                />
                <Text style={styles.helperText}>
                  User can log in with either email or this custom ID
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserRole === 'user' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewUserRole('user')}
                    disabled={updating || editingUser?.id === profile?.id}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserRole === 'user' && styles.roleOptionTextSelected,
                      ]}
                    >
                      User
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserRole === 'admin' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewUserRole('admin')}
                    disabled={updating || editingUser?.id === profile?.id}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserRole === 'admin' && styles.roleOptionTextSelected,
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
                {editingUser?.id === profile?.id && (
                  <Text style={styles.helperText}>
                    You cannot change your own role
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, updating && styles.submitButtonDisabled]}
                onPress={handleUpdateUser}
                disabled={updating}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Update User</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
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
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
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
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  usersList: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userIdText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.highlight,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleTextAdmin: {
    color: colors.primary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    cursor: Platform.OS === 'web' ? 'text' : undefined,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.highlight,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  roleOptionTextSelected: {
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: Platform.OS === 'web' ? 'not-allowed' : undefined,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
  },
});
