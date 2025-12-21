
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface EmailDebugHelperProps {
  error?: string;
}

export const EmailDebugHelper: React.FC<EmailDebugHelperProps> = ({ error }) => {
  const openSupabaseDashboard = () => {
    Linking.openURL('https://supabase.com/dashboard/project/sykerdryyaorziqjglwb/functions/send-reminder-email/logs');
  };

  const openResendDashboard = () => {
    Linking.openURL('https://resend.com/domains');
  };

  const showTroubleshootingSteps = () => {
    let message = 'To fix email sending issues:\n\n';
    
    if (error?.includes('not configured') || error?.includes('RESEND_API_KEY')) {
      message += '1. Go to Supabase Dashboard\n';
      message += '2. Navigate to Project Settings → Edge Functions → Secrets\n';
      message += '3. Add RESEND_API_KEY with your Resend API key\n';
      message += '4. Add FROM_EMAIL with your verified email address\n\n';
      message += 'Tap "Open Supabase" below to go to the dashboard.';
    } else if (error?.includes('domain') || error?.includes('verification')) {
      message += '1. Go to Resend Dashboard\n';
      message += '2. Check that your domain is verified\n';
      message += '3. Ensure DNS records are properly configured\n';
      message += '4. Wait 5-30 minutes for DNS propagation\n\n';
      message += 'Tap "Open Resend" below to check your domain status.';
    } else if (error?.includes('API key')) {
      message += '1. Go to Resend Dashboard → API Keys\n';
      message += '2. Create a new API key\n';
      message += '3. Copy the key (starts with re_)\n';
      message += '4. Update RESEND_API_KEY in Supabase Edge Function secrets\n\n';
      message += 'Tap "Open Resend" below to get a new API key.';
    } else {
      message += '1. Check Edge Function logs in Supabase Dashboard\n';
      message += '2. Look for specific error messages\n';
      message += '3. Verify RESEND_API_KEY and FROM_EMAIL are set\n';
      message += '4. Ensure your domain is verified in Resend\n\n';
      message += 'Tap "Open Supabase" below to check the logs.';
    }

    Alert.alert('Troubleshooting Email Issues', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Supabase', onPress: openSupabaseDashboard },
      { text: 'Open Resend', onPress: openResendDashboard },
    ]);
  };

  if (!error) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Sending Failed</Text>
      <Text style={styles.errorText}>{error}</Text>
      
      <TouchableOpacity style={styles.button} onPress={showTroubleshootingSteps}>
        <Text style={styles.buttonText}>How to Fix This</Text>
      </TouchableOpacity>
      
      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={openSupabaseDashboard}>
          <Text style={styles.link}>Open Supabase Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={openResendDashboard}>
          <Text style={styles.link}>Open Resend Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
