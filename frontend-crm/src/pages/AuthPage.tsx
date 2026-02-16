// frontend-crm/src/pages/AuthPage.tsx
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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { BusinessSetup } from "@/components/BusinessSetup";
import { useTheme } from "next-themes";
import { ForgotPasswordDialog } from "@/components/forget-password/ForgotPasswordDialog";

export const AuthPage = () => {
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("signin");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Toggle Visibility State (Restored)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hooks
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // ✅ OPTIMIZATION: Derived State
  const fullNameValid =
    !fullName || /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(fullName);

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // ✅ 1. PASSWORD RECOVERY LISTENER
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          console.log(
            "🔐 Recovery event detected! Redirecting to reset page...",
          );
          // Ensure we don't get stuck in a loop; direct navigation is safe here
          navigate("/auth/reset-password");
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // ✅ 2. URL CLEANUP & ERROR HANDLING (Updated)
  useEffect(() => {
    const { hash, search } = window.location;

    // A. Check for specific error descriptions in the URL (e.g. "Token expired")
    // Supabase often sends errors like #error_description=Email+link+is+invalid...
    const hashParams = new URLSearchParams(hash.substring(1));
    const searchParams = new URLSearchParams(search);
    const errorDescription =
      hashParams.get("error_description") ||
      searchParams.get("error_description");

    if (errorDescription) {
      console.log("❌ Auth Error Detected in URL:", errorDescription);
      toast.error("Authentication Failed", {
        description: decodeURIComponent(errorDescription).replace(/\+/g, " "),
        duration: 5000,
      });

      // Clear the error from URL to prevent confusion
      const newUrl =
        window.location.href.split("?")[0].split("#")[0] + "#/auth";
      window.history.replaceState(null, "", newUrl);
      return; // Stop here, no need to check for tokens if we have an error
    }

    // B. Standard Token Cleanup
    // Strictly check for recovery flow to avoid breaking it
    const isRecovery =
      hash.includes("type=recovery") || search.includes("type=recovery");

    if (
      !isRecovery &&
      (hash.includes("access_token") || search.includes("code="))
    ) {
      console.log("Cleaning up auth tokens...");
      // Replace state immediately. Supabase client parses URL on initialization,
      // so by the time this effect runs, the session should already be handled.
      const newUrl =
        window.location.href.split("?")[0].split("#")[0] + "#/auth";
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // ✅ 3. REDIRECT LOGGED-IN USERS
  useEffect(() => {
    if (authLoading || orgLoading) return;

    // Prevent redirecting if we are in the middle of a recovery flow
    const isRecoveryFlow = window.location.hash.includes("type=recovery");
    if (isRecoveryFlow) return;

    if (user) {
      if (currentOrganization) {
        navigate("/", { replace: true });
      } else {
        setShowBusinessSetup(true);
      }
    }
  }, [user, currentOrganization, authLoading, orgLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullNameValid) {
      toast.error("Full name must contain only letters and spaces");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const allRequirementsMet = Object.values(passwordRequirements).every(
      (req) => req,
    );
    if (!allRequirementsMet) {
      toast.error("Password does not meet security requirements");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/auth`,
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        toast.error("Email is already registered. Please sign in instead.");
        return;
      }

      toast.success(
        "Registration successful! Please check your email for confirmation.",
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setActiveTab("signin");
    } catch (error: any) {
      if (
        error.message?.includes("already registered") ||
        error.message?.includes("User already registered")
      ) {
        toast.error("Email is already registered. Please sign in instead.");
      } else {
        toast.error(
          error.message || "Failed to create account. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Successfully signed in!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const handleBusinessSetupComplete = async () => {
    toast.success("Welcome! Your business has been set up successfully.");
    setShowBusinessSetup(false);
  };

  // ✅ RENDER LOGIC

  if (authLoading || (user && orgLoading)) {
    // Check for recovery flow to avoid flickering loading screen during reset
    const isRecoveryFlow = window.location.hash.includes("type=recovery");

    if (!isRecoveryFlow) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Setting up your account...
            </p>
          </div>
        </div>
      );
    }
  }

  if (user && showBusinessSetup) {
    const isRecoveryFlow = window.location.hash.includes("type=recovery");
    if (!isRecoveryFlow) {
      return (
        <BusinessSetup
          onComplete={handleBusinessSetupComplete}
          userId={user.id}
        />
      );
    }
  }

  // If user is logged in (and not in recovery/setup), the useEffect above will redirect them.
  // We can safely render the Auth UI below for non-logged-in users.

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      {/* Forgot Password Modal */}
      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
        defaultEmail={email}
      />

      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-[180px] h-16 flex items-center justify-center">
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
          <div className="space-y-2">
            <CardDescription className="text-base">
              Manage your operations and work with AI
            </CardDescription>
            <p className="text-xs text-muted-foreground italic">
              powered by SINERGI
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN IN TAB */}
            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs font-normal text-muted-foreground hover:text-primary"
                      onClick={() => setIsForgotPasswordOpen(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10"
                      required
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
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Sign In with Google
              </Button>
            </TabsContent>

            {/* SIGN UP TAB */}
            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`h-10 ${
                      fullName && !fullNameValid ? "border-destructive" : ""
                    }`}
                    required
                  />
                  {fullName && !fullNameValid && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <X className="w-3 h-3" />
                      Full name must contain only letters and spaces
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="signup-password"
                    className="text-sm font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10"
                      required
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

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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
                  className="w-full h-10 bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Sign Up with Google
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You will be registered as the Super Admin of your organization
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
