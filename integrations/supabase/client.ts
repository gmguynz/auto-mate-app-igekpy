
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    console.log('Initializing Supabase client with optimized settings...');
    console.log('Platform:', Platform.OS);
    
    // Use localStorage for web, AsyncStorage for native
    const storage = Platform.OS === 'web' ? undefined : AsyncStorage;
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': `supabase-js-${Platform.OS}`,
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log('Supabase client initialized successfully with connection pooling');
  } else {
    console.log('Supabase not configured, using placeholder client');
    supabaseClient = createPlaceholderClient();
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  supabaseClient = createPlaceholderClient();
}

export const supabase = supabaseClient || createPlaceholderClient();

// Connection health check utility
export const checkSupabaseConnection = async (): Promise<{ healthy: boolean; latency?: number; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { healthy: false, error: 'Supabase not configured' };
  }

  try {
    const startTime = Date.now();
    const { error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
    const latency = Date.now() - startTime;

    if (error) {
      console.error('Connection health check failed:', error);
      return { healthy: false, latency, error: error.message };
    }

    console.log(`Connection healthy - latency: ${latency}ms`);
    return { healthy: true, latency };
  } catch (error) {
    console.error('Connection health check exception:', error);
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
