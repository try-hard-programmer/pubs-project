import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Independent toggles for visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // Logic: Password Requirements (Same as AuthPage)
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Security check: If no session (invalid link), kick them out
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Invalid or expired reset link.");
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const allRequirementsMet = Object.values(passwordRequirements).every(
      (req) => req
    );
    if (!allRequirementsMet) {
      toast.error("Password does not meet security requirements");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated successfully! Please sign in.");
      await supabase.auth.signOut(); // Force re-login for security

      // Use replace: true to clear the history stack and ensure the recovery hash
      // is completely removed so AuthPage doesn't detect "Recovery Mode"
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error("Failed to update password: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* New Password Field */}
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="*********"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Requirements Indicator */}
              {password && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                  <p className="text-xs font-medium text-foreground mb-2">
                    Password Requirements:
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {passwordRequirements.minLength ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          passwordRequirements.minLength
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        Minimum 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordRequirements.hasLowercase ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          passwordRequirements.hasLowercase
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        Lowercase letter (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordRequirements.hasUppercase ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          passwordRequirements.hasUppercase
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        Uppercase letter (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordRequirements.hasDigit ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          passwordRequirements.hasDigit
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        Number (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {passwordRequirements.hasSymbol ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          passwordRequirements.hasSymbol
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        Symbol (!@#$%^&*...)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="*********"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <X className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
