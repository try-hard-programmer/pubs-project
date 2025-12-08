import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { organizationStorage } from '@/lib/organizationStorage';
import { useDebugState, logContextAction } from '@/lib/debuggableContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useDebugState<User | null>('Auth', 'user', null);
  const [session, setSession] = useDebugState<Session | null>('Auth', 'session', null);
  const [loading, setLoading] = useDebugState<boolean>('Auth', 'loading', true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        logContextAction('Auth', 'AUTH_STATE_CHANGE', { event, userId: session?.user?.id });

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle email confirmation or OAuth callback - redirect to /auth for organization check
        if (event === 'SIGNED_IN' && session?.user) {
          const currentHash = window.location.hash;

          // Check if this is from email confirmation or OAuth
          const isEmailConfirmation = currentHash.includes('type=signup') ||
                                       currentHash.includes('type=email') ||
                                       currentHash.includes('type=recovery');
          const isOAuthCallback = currentHash.includes('access_token') &&
                                  currentHash.includes('refresh_token');

          console.log('Sign in detected:', {
            isEmailConfirmation,
            isOAuthCallback,
            currentPath: window.location.hash
          });

          // Only redirect if not already on /auth page
          if ((isEmailConfirmation || isOAuthCallback) && !currentHash.includes('#/auth')) {
            console.log('Redirecting to /auth for organization check');
            // Small delay to ensure state is updated
            setTimeout(() => {
              window.location.hash = '#/auth';
            }, 100);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    logContextAction('Auth', 'SIGN_OUT_INITIATED', null);
    // Clear organization data from localStorage on logout
    organizationStorage.clear();
    await supabase.auth.signOut();
    logContextAction('Auth', 'SIGN_OUT_COMPLETED', null);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};