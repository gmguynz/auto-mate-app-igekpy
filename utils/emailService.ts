
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
          html: htmlBody,
          customerName: emailData.customerName,
        },
      });

      if (error) {
        console.error('Error invoking Edge Function:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send email';
        if (error.message) {
          errorMessage = error.message;
        }
        
        // Check for common configuration issues
        if (error.message?.includes('not configured') || error.message?.includes('RESEND_API_KEY')) {
          errorMessage = 'Email service not configured. Please add RESEND_API_KEY to Supabase Edge Function secrets.';
        } else if (error.message?.includes('domain') || error.message?.includes('verification')) {
          errorMessage = 'Email domain not verified. Please verify your domain in Resend dashboard.';
        } else if (error.message?.includes('FROM_EMAIL')) {
          errorMessage = 'FROM_EMAIL not configured. Please add FROM_EMAIL to Supabase Edge Function secrets.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Check if the response contains an error object
      if (data && data.error) {
        console.error('Resend API error:', data.error);
        console.error('Full error response:', JSON.stringify(data, null, 2));
        
        let errorMessage = 'Email service error';
        if (data.error.message) {
          errorMessage = data.error.message;
        }
        
        // Check for specific Resend errors
        if (data.error.message?.includes('domain')) {
          errorMessage = 'Email domain not verified. Please verify your domain in Resend dashboard.';
        } else if (data.error.message?.includes('API key')) {
          errorMessage = 'Invalid Resend API key. Please check your RESEND_API_KEY in Supabase secrets.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Check if we got an ID back from Resend (indicates success)
      if (data && data.id) {
        console.log('Email sent successfully. Resend ID:', data.id);
        return { success: true };
      }

      // If we got here, something unexpected happened
      console.warn('Unexpected response from email service:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: 'Unexpected response from email service. Please check the Edge Function logs in Supabase dashboard.',
      };
    } catch (error) {
      console.error('Exception sending email:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
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
      '1. Add RESEND_API_KEY to Supabase Edge Function secrets\n' +
      '2. Add FROM_EMAIL to Supabase Edge Function secrets (e.g., noreply@yourdomain.com)\n' +
      '3. Verify your domain in Resend dashboard\n' +
      '4. Ensure DNS records (TXT and MX) are properly configured\n\n' +
      'See SUPABASE_SETUP.md for detailed instructions.',
      [{ text: 'OK' }]
    );
  },
};
