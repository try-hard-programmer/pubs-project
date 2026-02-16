import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useUserManagement } from "@/hooks/useUserManagement";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

export const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { verifyInvitationToken, acceptInvitation } = useUserManagement();
  const { theme } = useTheme();

  // ✅ COPIED: Password Validation Logic from AuthPage
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  useEffect(() => {
    const verifyToken = async () => {
      console.log("AcceptInvitation - token from URL:", {
        token,
        hasToken: !!token,
        tokenLength: token?.length,
      });

      if (!token) {
        console.error("No token in URL");
        toast.error("Invalid invitation link - no token provided");
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Calling verifyInvitationToken...");
        const invitation = await verifyInvitationToken(token);
        console.log("Invitation verified successfully:", {
          email: invitation.invited_email,
          expires_at: invitation.expires_at,
        });
        setInvitationEmail(invitation.invited_email);
        setIsValid(true);
      } catch (error: any) {
        console.error("Invitation verification failed:", error);
        toast.error(error.message || "Invalid or expired invitation");
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validateForm = () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    // ✅ COPIED: Strict Requirement Check
    const allRequirementsMet = Object.values(passwordRequirements).every(
      (req) => req,
    );
    if (!allRequirementsMet) {
      toast.error("Password does not meet security requirements");
      return false;
    }

    return true;
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create the user account
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: invitationEmail,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error("Failed to create user account");
      }

      // Step 2: Accept the invitation and create hierarchy
      await acceptInvitation({
        token: token!,
        userId: signUpData.user.id,
      });

      setIsSuccess(true);
      toast.success("Account created successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/auth")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
              <p className="text-muted-foreground mb-4">
                Your account has been successfully created.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            <div className="w-full max-w-[160px] h-14 flex items-center justify-center">
              <img
                src={
                  theme === "dark"
                    ? "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/palapa-ai-dark.svg"
                    : "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/palapa-ai-light.svg"
                }
                alt="Palapa AI Logo"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join SINERGI. Set up your account to get
            started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitationEmail}
                disabled
                className="bg-muted opacity-75 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
                className="focus-visible:ring-primary"
              />
            </div>

            {/* Password Field with Toggle & Requirements */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                  className="pr-10 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* ✅ COPIED: Password Requirements Indicator UI */}
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
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  className="pr-10 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* ✅ COPIED: Match Validation UI */}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <X className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword &&
                password === confirmPassword &&
                Object.values(passwordRequirements).every((req) => req) && (
                  <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Join"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-primary hover:underline"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
