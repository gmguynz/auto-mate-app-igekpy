
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Alert } from 'react-native';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  customerName: string;
}

export const emailService = {
  /**
   * Send an email using Supabase Edge Function
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting to send email to:', emailData.to);

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured - cannot send email');
        return {
          success: false,
          error: 'Email service not configured. Please set up Supabase to enable automated email sending.',
        };
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-reminder-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          customerName: emailData.customerName,
        },
      });

      if (error) {
        console.error('Error sending email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      console.log('Email sent successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Exception sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Show setup instructions if email service is not configured
   */
  showSetupInstructions(): void {
    Alert.alert(
      'Email Service Setup Required',
      'To enable automated email sending, you need to:\n\n' +
      '1. Set up a Supabase Edge Function named "send-reminder-email"\n' +
      '2. Configure an email service (Resend, SendGrid, etc.)\n' +
      '3. Add your email API key to Supabase secrets\n\n' +
      'See SUPABASE_SETUP.md for detailed instructions.',
      [{ text: 'OK' }]
    );
  },
};
