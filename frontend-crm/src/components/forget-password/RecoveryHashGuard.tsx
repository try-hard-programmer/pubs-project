import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Subscription } from "@supabase/supabase-js";

export const RecoveryHashGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isProcessing, setIsProcessing] = useState(true);
  // Use a ref to store the subscription so we can access it inside the callback
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    const hash = window.location.hash;

    // Check if this is a Supabase recovery link
    const isRecoveryLink =
      hash.includes("access_token") && hash.includes("type=recovery");

    if (!isRecoveryLink) {
      // Not a recovery link, let the app load normally
      setIsProcessing(false);
      return;
    }

    console.log(
      "🛡️ Recovery Guard: Pausing Router to allow token processing..."
    );

    // Set up a listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // We listen for SIGNED_IN as well because Supabase sometimes establishes the session immediately
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        console.log(
          "✅ Recovery Guard: Token processed. Redirecting to reset page."
        );

        // 1. Clean the URL safely
        window.location.hash = "#/auth/reset-password";

        // 2. STOP LISTENING! This prevents the loop on future logins.
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }

        // 3. Allow the Router to mount
        setIsProcessing(false);
      }
    });

    // Save the subscription to the ref
    subscriptionRef.current = data.subscription;

    return () => {
      // Cleanup on unmount (though this component rarely unmounts)
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  if (isProcessing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying secure link...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
