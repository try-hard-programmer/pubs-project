import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { organizationStorage } from "@/lib/organizationStorage";
import { useDebugState, logContextAction } from "@/lib/debuggableContext";

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useDebugState<User | null>("Auth", "user", null);
  const [session, setSession] = useDebugState<Session | null>(
    "Auth",
    "session",
    null
  );
  const [loading, setLoading] = useDebugState<boolean>("Auth", "loading", true);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      logContextAction("Auth", "AUTH_STATE_CHANGE", {
        event,
        userId: session?.user?.id,
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // CLEAN FIX: Handle redirects for Organization Check
      if (event === "SIGNED_IN" && session?.user) {
        const { hash, search, pathname } = window.location;

        // 1. Check for standard Implicit Grant (Hash)
        const isImplicit =
          hash.includes("access_token") && hash.includes("refresh_token");

        // 2. Check for PKCE Flow (Google often uses this now)
        const isPKCE = search.includes("code=");

        // 3. Check for Email Actions
        const isEmailAction =
          hash.includes("type=signup") ||
          hash.includes("type=email") ||
          hash.includes("type=recovery");

        // logic: If coming back from ANY auth provider, send to /auth to check org status
        // But only if we aren't already there.
        const isAuthCallback = isImplicit || isPKCE || isEmailAction;

        if (
          isAuthCallback &&
          !pathname.includes("/auth") &&
          !hash.includes("#/auth")
        ) {
          console.log("Redirecting to /auth for organization check");
          // Use window.location.href to ensure a full redirect if needed,
          // or hash navigation if using HashRouter exclusively.
          setTimeout(() => {
            window.location.hash = "#/auth";
          }, 100);
        }
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    logContextAction("Auth", "SIGN_OUT_INITIATED", null);
    // Clear organization data from localStorage on logout
    organizationStorage.clear();
    await supabase.auth.signOut();
    logContextAction("Auth", "SIGN_OUT_COMPLETED", null);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
