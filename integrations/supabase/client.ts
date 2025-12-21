
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  const hasUrl = supabaseUrl !== '' && supabaseUrl !== 'undefined' && supabaseUrl.startsWith('https://');
  const hasKey = supabaseAnonKey !== '' && supabaseAnonKey !== 'undefined' && supabaseAnonKey.length > 20;
  
  const configured = hasUrl && hasKey;
  
  if (!configured) {
    console.log('Supabase not configured - using local storage');
    if (!hasUrl) {
      console.log('Missing or invalid EXPO_PUBLIC_SUPABASE_URL');
    }
    if (!hasKey) {
      console.log('Missing or invalid EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
  }
  
  return configured;
};

const createPlaceholderClient = () => {
  try {
    return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error('Error creating placeholder client:', error);
    return null;
  }
};

let supabaseClient: ReturnType<typeof createClient> | null = null;

try {
  if (isSupabaseConfigured()) {
    console.log('Initializing Supabase client with auth...');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    console.log('Supabase client initialized successfully');
  } else {
    console.log('Supabase not configured, using placeholder client');
    supabaseClient = createPlaceholderClient();
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  supabaseClient = createPlaceholderClient();
}

export const supabase = supabaseClient || createPlaceholderClient();
