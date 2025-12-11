import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const RecoveryHashGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;

    // Check if this is a Supabase recovery link
    // It usually looks like: #access_token=...&type=recovery...
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

    // Set up a listener to wait for Supabase to finish
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        console.log(
          "✅ Recovery Guard: Token processed. Redirecting to reset page."
        );

        // 1. Clean the URL safely
        window.location.hash = "#/auth/reset-password";

        // 2. Allow the Router to mount
        setIsProcessing(false);
      }
    });

    return () => {
      subscription.unsubscribe();
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
