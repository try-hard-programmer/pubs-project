import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// Import the Organization Context
import { useOrganization } from "@/contexts/OrganizationContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  // Get organization state
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const [checkingOrg, setCheckingOrg] = useState(true);

  useEffect(() => {
    if (!authLoading && !orgLoading) {
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      // FIX: Check for organization ID to be safe
      if (!currentOrganization || !currentOrganization.id) {
        console.log("User has no valid organization, redirecting to setup...");
        navigate("/auth", { replace: true });
      }
    }
  }, [user, authLoading, currentOrganization, orgLoading, navigate]);

  // Show loading screen while checking EITHER Auth OR Organization
  if (authLoading || (user && orgLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking account status...
          </p>
        </div>
      </div>
    );
  }

  // Only render the page if we have BOTH User AND Organization
  if (user && currentOrganization) {
    return <>{children}</>;
  }

  return null;
};
