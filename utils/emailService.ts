
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Alert, Platform } from 'react-native';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  customerName: string;
}

// Retry configuration for email sending
const MAX_EMAIL_RETRIES = 2;
const EMAIL_RETRY_DELAY = 2000; // 2 seconds

export const emailService = {
  /**
   * Send an email using Supabase Edge Function with retry logic
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('=== EMAIL SERVICE DEBUG START ===');
      console.log('Platform:', Platform.OS);
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

      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message,
      });
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      
      if (!session) {
        console.warn('No active session found - user may not be authenticated');
        return {
          success: false,
          error: 'You must be logged in to send emails. Please log in and try again.',
        };
      }

      if (!session.access_token) {
        console.error('Session exists but no access token found');
        return {
          success: false,
          error: 'Authentication token missing. Please log out and log back in.',
        };
      }

      console.log('User authenticated, session exists with valid token');

      // Convert plain text body to HTML with line breaks
      const htmlBody = emailData.body.replace(/\n/g, '<br>');

      // Retry logic for email sending
      for (let attempt = 1; attempt <= MAX_EMAIL_RETRIES; attempt++) {
        try {
          console.log(`Email send attempt ${attempt}/${MAX_EMAIL_RETRIES}`);
          
          // Call the Supabase Edge Function with explicit headers
          const { data, error } = await supabase.functions.invoke('send-reminder-email', {
            body: {
              to: emailData.to,
              subject: emailData.subject,
              html: htmlBody,
              customerName: emailData.customerName,
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          console.log('Edge Function response:', { 
            hasData: !!data, 
            hasError: !!error,
            errorMessage: error?.message,
            errorContext: error?.context,
          });

          if (error) {
            console.error('Error invoking Edge Function:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Check for authentication errors
            if (error.message?.includes('JWT') || 
                error.message?.includes('401') || 
                error.message?.includes('Unauthorized') ||
                error.message?.includes('auth')) {
              console.error('Authentication error detected');
              return {
                success: false,
                error: 'Authentication error. Please log out and log back in, then try again.',
              };
            }
            
            // If this is not the last attempt, retry
            if (attempt < MAX_EMAIL_RETRIES) {
              console.log(`Retrying in ${EMAIL_RETRY_DELAY}ms...`);
              await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
              continue;
            }
            
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
            
            // If this is not the last attempt, retry
            if (attempt < MAX_EMAIL_RETRIES) {
              console.log(`Retrying in ${EMAIL_RETRY_DELAY}ms...`);
              await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
              continue;
            }
            
            let errorMessage = 'Email service error';
            if (data.error.message) {
              errorMessage = data.error.message;
            } else if (typeof data.error === 'string') {
              errorMessage = data.error;
            }
            
            // Check for specific Resend errors
            if (errorMessage.includes('domain')) {
              errorMessage = 'Email domain not verified. Please verify your domain in Resend dashboard.';
            } else if (errorMessage.includes('API key')) {
              errorMessage = 'Invalid Resend API key. Please check your RESEND_API_KEY in Supabase secrets.';
            }
            
            return {
              success: false,
              error: errorMessage,
            };
          }

          // Check for success response (Edge Function returns { success: true, id: ..., message: ... })
          if (data && (data.success === true || data.id)) {
            console.log('Email sent successfully. Response:', data);
            console.log('=== EMAIL SERVICE DEBUG END (SUCCESS) ===');
            return { success: true };
          }

          // If we got here and it's not the last attempt, retry
          if (attempt < MAX_EMAIL_RETRIES) {
            console.warn('Unexpected response from email service, retrying...');
            console.warn('Response data:', JSON.stringify(data, null, 2));
            await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
            continue;
          }

          // If we got here, something unexpected happened
          console.warn('Unexpected response from email service:', JSON.stringify(data, null, 2));
          console.log('=== EMAIL SERVICE DEBUG END (UNEXPECTED) ===');
          return {
            success: false,
            error: 'Unexpected response from email service. Please check the Edge Function logs in Supabase dashboard.',
          };
        } catch (attemptError) {
          console.error(`Email send attempt ${attempt} exception:`, attemptError);
          
          // If this is not the last attempt, retry
          if (attempt < MAX_EMAIL_RETRIES) {
            console.log(`Retrying in ${EMAIL_RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
            continue;
          }
          
          throw attemptError;
        }
      }

      // Should never reach here, but just in case
      console.log('=== EMAIL SERVICE DEBUG END (FAILED) ===');
      return {
        success: false,
        error: 'Failed to send email after multiple attempts',
      };
    } catch (error) {
      console.error('Exception sending email:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      console.log('=== EMAIL SERVICE DEBUG END (EXCEPTION) ===');
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
