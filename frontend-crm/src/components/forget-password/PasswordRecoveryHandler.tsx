import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PasswordRecoveryHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Listen for the Supabase event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("🔄 Recovery event detected! Redirecting to reset page.");
        navigate("/auth/reset-password");
      }
    });

    // 2. Fail-safe: Check URL manually just in case the event fired before mounting
    if (window.location.hash.includes("type=recovery")) {
      console.log("🔗 Recovery hash detected! Redirecting to reset page.");
      navigate("/auth/reset-password");
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
};
