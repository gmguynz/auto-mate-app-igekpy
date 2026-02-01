
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user' | 'technician';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`Fetching user profile for ${userId} (attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If we get a recursion error and haven't retried too many times, wait and retry
        if (error.message?.includes('infinite recursion') && retryCount < 3) {
          console.log('Recursion detected, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        return null;
      }

      console.log('User profile fetched successfully:', data?.email, 'Role:', data?.role);
      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('Refreshing profile for user:', user.email);
      const userProfile = await fetchUserProfile(user.id);
      setProfile(userProfile);
      
      // Also refresh the session to get updated JWT with role
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      if (refreshedSession) {
        console.log('Session refreshed with updated metadata');
        setSession(refreshedSession);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          console.log('Session found:', currentSession.user.email);
          console.log('User metadata:', currentSession.user.app_metadata);
          setSession(currentSession);
          setUser(currentSession.user);
          
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        } else {
          console.log('No active session');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        if (currentSession) {
          console.log('New session for:', currentSession.user.email);
          console.log('User metadata:', currentSession.user.app_metadata);
          setSession(currentSession);
          setUser(currentSession.user);
          
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      if (data.user) {
        console.log('User signed in:', data.user.email);
        console.log('User metadata:', data.user.app_metadata);
        const userProfile = await fetchUserProfile(data.user.id);
        setProfile(userProfile);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Check admin status from both profile and JWT metadata
  const isAdmin = React.useMemo(() => {
    // First check the profile
    if (profile?.role === 'admin') {
      console.log('User is admin (from profile)');
      return true;
    }
    
    // Also check JWT metadata as a fallback
    if (session?.user) {
      const jwtRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
      if (jwtRole === 'admin') {
        console.log('User is admin (from JWT metadata)');
        return true;
      }
    }
    
    return false;
  }, [profile, session]);

  // Check technician status
  const isTechnician = React.useMemo(() => {
    // First check the profile
    if (profile?.role === 'technician') {
      console.log('User is technician (from profile)');
      return true;
    }
    
    // Also check JWT metadata as a fallback
    if (session?.user) {
      const jwtRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
      if (jwtRole === 'technician') {
        console.log('User is technician (from JWT metadata)');
        return true;
      }
    }
    
    return false;
  }, [profile, session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        isTechnician,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
