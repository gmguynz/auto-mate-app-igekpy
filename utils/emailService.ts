
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
      console.log('Email subject:', emailData.subject);

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured - cannot send email');
        return {
          success: false,
          error: 'Email service not configured. Please set up Supabase to enable automated email sending.',
        };
      }

      // Convert plain text body to HTML with line breaks
      const htmlBody = emailData.body.replace(/\n/g, '<br>');

      // Call the Supabase Edge Function with correct parameters
      const { data, error } = await supabase.functions.invoke('send-reminder-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          html: htmlBody, // Changed from 'body' to 'html'
          customerName: emailData.customerName,
        },
      });

      if (error) {
        console.error('Error invoking Edge Function:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      // Check if Resend returned an error
      if (data && data.error) {
        console.error('Resend API error:', data.error);
        return {
          success: false,
          error: data.error.message || 'Email service error',
        };
      }

      // Check if we got an ID back from Resend (indicates success)
      if (data && data.id) {
        console.log('Email sent successfully. Resend ID:', data.id);
        return { success: true };
      }

      // If we got here, something unexpected happened
      console.warn('Unexpected response from email service:', data);
      return {
        success: false,
        error: 'Unexpected response from email service. Please check your email configuration.',
      };
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
      '3. Add your email API key to Supabase secrets\n' +
      '4. Update the "from" email address in the Edge Function\n\n' +
      'See SUPABASE_SETUP.md for detailed instructions.',
      [{ text: 'OK' }]
    );
  },
};
