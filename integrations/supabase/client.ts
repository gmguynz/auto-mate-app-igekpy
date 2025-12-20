
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  const configured = supabaseUrl !== '' && supabaseAnonKey !== '' && 
                     supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined';
  
  if (!configured) {
    console.log('Supabase not configured - using local storage');
  }
  
  return configured;
};

// Only create client if properly configured
let supabaseClient: ReturnType<typeof createClient> | null = null;

try {
  if (isSupabaseConfigured()) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    console.log('Supabase client initialized successfully');
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
}

export const supabase = supabaseClient || createClient('https://placeholder.supabase.co', 'placeholder-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
