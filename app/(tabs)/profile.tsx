
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';

export default function ProfileScreen() {
  const { user, profile, session, isAdmin, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      Alert.alert('Success', 'Profile refreshed successfully');
    } catch (error) {
      console.error('Error refreshing profile:', error);
      Alert.alert('Error', 'Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewMetadata = () => {
    const metadata = {
      'User ID': user?.id,
      'Email': user?.email,
      'Custom User ID': profile?.user_id || 'Not set',
      'Profile Role': profile?.role,
      'JWT Role (app_metadata)': session?.user?.app_metadata?.role,
      'JWT Role (user_metadata)': session?.user?.user_metadata?.role,
      'Is Admin': isAdmin ? 'Yes' : 'No',
      'Last Sign In': user?.last_sign_in_at,
    };

    const metadataText = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value || 'N/A'}`)
      .join('\n\n');

    Alert.alert('User Metadata', metadataText);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      console.log('Updating password...');
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        Alert.alert('Error', error.message || 'Failed to update password');
      } else {
        console.log('Password updated successfully');
        Alert.alert('Success', 'Password updated successfully. You can now use your new password to log in.');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Password update error:', error);
      Alert.alert('Error', 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetPasswordEmail = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            try {
              console.log('Sending password reset email to:', user.email);
              const { data, error } = await supabase.auth.resetPasswordForEmail(
                user.email,
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
                  'A password reset link has been sent to your email address. Please check your inbox and spam folder.'
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account-circle"
              size={80}
              color={colors.primary}
            />
          </View>
          <Text style={styles.name}>{profile?.full_name || 'No name'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {profile?.user_id && (
            <Text style={styles.userId}>User ID: {profile.user_id}</Text>
          )}
          <View style={styles.roleBadge}>
            <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
              {isAdmin ? 'ADMIN' : 'USER'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id?.substring(0, 20)}...
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            {profile?.user_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Custom User ID</Text>
                <Text style={styles.infoValue}>{profile.user_id}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{profile?.full_name || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{profile?.role || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPasswordModal(true)}
          >
            <IconSymbol
              ios_icon_name="key.fill"
              android_material_icon_name="vpn-key"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResetPasswordEmail}
          >
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>Send Password Reset Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefreshProfile}
            disabled={refreshing}
          >
            <IconSymbol
              ios_icon_name="arrow.clockwise"
              android_material_icon_name="refresh"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh Profile'}
            </Text>
            {refreshing && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewMetadata}
          >
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>View Debug Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={24}
              color="#FF3B30"
            />
            <Text style={[styles.actionButtonText, styles.signOutButtonText]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.infoText}>
                You are currently logged in, so you can change your password directly without needing to enter your current password.
              </Text>

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.helperText}>
                Password must be at least 6 characters long
              </Text>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  changingPassword && styles.modalButtonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.highlight,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleTextAdmin: {
    color: colors.primary,
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
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
  actionButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  signOutButton: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFE5E5',
  },
  signOutButtonText: {
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
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
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
