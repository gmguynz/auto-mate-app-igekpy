
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
      console.log('Timestamp:', new Date().toISOString());

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured - cannot send email');
        return {
          success: false,
          error: 'Email service not configured. Please set up Supabase to enable automated email sending.',
        };
      }

      // Check if user is authenticated
      console.log('Checking authentication session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check result:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        console.error('Session error details:', JSON.stringify(sessionError, null, 2));
      }
      
      if (!session) {
        console.warn('No active session found - user may not be authenticated');
        console.warn('This is a critical issue on web - user must be logged in');
        return {
          success: false,
          error: 'You must be logged in to send emails. Please log in and try again.',
        };
      }

      if (!session.access_token) {
        console.error('Session exists but no access token found');
        console.error('Session data:', JSON.stringify(session, null, 2));
        return {
          success: false,
          error: 'Authentication token missing. Please log out and log back in.',
        };
      }

      console.log('✅ User authenticated successfully');
      console.log('User ID:', session.user.id);
      console.log('User email:', session.user.email);
      console.log('Access token length:', session.access_token.length);

      // Convert plain text body to HTML with line breaks
      const htmlBody = emailData.body.replace(/\n/g, '<br>');

      // Retry logic for email sending
      for (let attempt = 1; attempt <= MAX_EMAIL_RETRIES; attempt++) {
        try {
          console.log(`\n--- Email send attempt ${attempt}/${MAX_EMAIL_RETRIES} ---`);
          console.log('Calling Edge Function: send-reminder-email');
          console.log('Request body:', {
            to: emailData.to,
            subject: emailData.subject,
            customerName: emailData.customerName,
            htmlBodyLength: htmlBody.length,
          });
          
          const requestStartTime = Date.now();
          
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

          const requestDuration = Date.now() - requestStartTime;
          console.log(`Edge Function call completed in ${requestDuration}ms`);

          console.log('Edge Function response:', { 
            hasData: !!data, 
            hasError: !!error,
            errorMessage: error?.message,
            errorContext: error?.context,
            dataKeys: data ? Object.keys(data) : [],
          });

          if (error) {
            console.error('❌ Error invoking Edge Function:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Check for authentication errors
            if (error.message?.includes('JWT') || 
                error.message?.includes('401') || 
                error.message?.includes('Unauthorized') ||
                error.message?.includes('auth')) {
              console.error('🔐 Authentication error detected');
              return {
                success: false,
                error: 'Authentication error. Please log out and log back in, then try again.',
              };
            }
            
            // If this is not the last attempt, retry
            if (attempt < MAX_EMAIL_RETRIES) {
              console.log(`⏳ Retrying in ${EMAIL_RETRY_DELAY}ms...`);
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
            console.error('❌ Resend API error:', data.error);
            console.error('Full error response:', JSON.stringify(data, null, 2));
            
            // If this is not the last attempt, retry
            if (attempt < MAX_EMAIL_RETRIES) {
              console.log(`⏳ Retrying in ${EMAIL_RETRY_DELAY}ms...`);
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
            console.log('✅ Email sent successfully!');
            console.log('Response data:', JSON.stringify(data, null, 2));
            console.log('=== EMAIL SERVICE DEBUG END (SUCCESS) ===');
            return { success: true };
          }

          // If we got here and it's not the last attempt, retry
          if (attempt < MAX_EMAIL_RETRIES) {
            console.warn('⚠️ Unexpected response from email service, retrying...');
            console.warn('Response data:', JSON.stringify(data, null, 2));
            await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
            continue;
          }

          // If we got here, something unexpected happened
          console.warn('⚠️ Unexpected response from email service');
          console.warn('Full response:', JSON.stringify(data, null, 2));
          console.log('=== EMAIL SERVICE DEBUG END (UNEXPECTED) ===');
          return {
            success: false,
            error: 'Unexpected response from email service. Please check the Edge Function logs in Supabase dashboard.',
          };
        } catch (attemptError) {
          console.error(`❌ Email send attempt ${attempt} exception:`, attemptError);
          console.error('Exception type:', attemptError instanceof Error ? attemptError.constructor.name : typeof attemptError);
          console.error('Exception message:', attemptError instanceof Error ? attemptError.message : String(attemptError));
          
          // If this is not the last attempt, retry
          if (attempt < MAX_EMAIL_RETRIES) {
            console.log(`⏳ Retrying in ${EMAIL_RETRY_DELAY}ms...`);
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
      console.error('❌ Exception sending email:', error);
      console.error('Exception type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Exception message:', error instanceof Error ? error.message : String(error));
      console.error('Exception stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    const message = 
      'To enable automated email sending, you need to:\n\n' +
      '1. Add RESEND_API_KEY to Supabase Edge Function secrets\n' +
      '2. Add FROM_EMAIL to Supabase Edge Function secrets (e.g., noreply@yourdomain.com)\n' +
      '3. Verify your domain in Resend dashboard\n' +
      '4. Ensure DNS records (TXT and MX) are properly configured\n\n' +
      'See SUPABASE_SETUP.md for detailed instructions.';
    
    if (Platform.OS === 'web') {
      window.alert(`Email Service Setup Required\n\n${message}`);
    } else {
      Alert.alert('Email Service Setup Required', message, [{ text: 'OK' }]);
    }
  },
};
