
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/integrations/supabase/client';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both email/user ID and password');
      return;
    }

    setLoading(true);
    try {
      let email = identifier;

      // If identifier doesn't contain @, it's a user_id - look it up via Edge Function
      if (!identifier.includes('@')) {
        console.log('Identifier is not an email, looking up user_id via Edge Function:', identifier);
        
        try {
          // Get the Supabase URL and anon key for the Edge Function call
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

          console.log('Calling Edge Function with URL:', supabaseUrl);

          const { data, error } = await supabase.functions.invoke('lookup-user-id', {
            body: { user_id: identifier }
          });

          console.log('Edge Function response:', { data, error });

          if (error) {
            console.error('User ID lookup error:', error);
            
            // Check if it's a CORS or network error
            if (error.message?.includes('CORS') || error.message?.includes('network')) {
              Alert.alert(
                'Connection Error',
                'Unable to connect to the authentication service. Please check your internet connection and try again.'
              );
            } else {
              Alert.alert(
                'Login Failed',
                'Invalid user ID or password. Please check your user ID and try again.'
              );
            }
            setLoading(false);
            return;
          }

          if (!data || !data.email) {
            console.error('No email found for user_id:', identifier);
            Alert.alert(
              'Login Failed',
              'User ID not found. Please check your user ID or contact your administrator.'
            );
            setLoading(false);
            return;
          }

          email = data.email;
          console.log('Found email for user_id:', email);
        } catch (lookupError: any) {
          console.error('Exception during user ID lookup:', lookupError);
          
          // Provide more specific error messages based on the error type
          let errorMessage = 'Unable to verify user ID. Please try again or use your email address.';
          
          if (lookupError.message?.includes('Failed to fetch') || 
              lookupError.message?.includes('NetworkError') ||
              lookupError.message?.includes('CORS')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          }
          
          Alert.alert('Login Failed', errorMessage);
          setLoading(false);
          return;
        }
      }

      console.log('Attempting to sign in with email:', email);
      const { error } = await signIn(email, password);

      if (error) {
        console.error('Login error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Invalid email/user ID or password. Please try again.';
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid password. Please check your password and try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before logging in.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        Alert.alert('Login Failed', errorMessage);
      } else {
        console.log('Login successful');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="security"
              size={64}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>Charlies Workshop</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email or User ID</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email or user ID"
                placeholderTextColor={colors.textSecondary}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <IconSymbol
                  ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              User accounts must be created by an administrator. Contact your admin if you need access. You can log in using either your email address or custom user ID (case-insensitive).
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: 32,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
