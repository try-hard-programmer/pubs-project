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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { BusinessSetup } from "@/components/BusinessSetup";
import { apiClient } from "@/lib/apiClient";
import { useTheme } from "next-themes";

export const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [checkingOrganization, setCheckingOrganization] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();

  // Tab control state
  const [activeTab, setActiveTab] = useState<string>("signin");

  // Password validation states
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasDigit: false,
    hasSymbol: false,
  });

  // Full name validation state
  const [fullNameValid, setFullNameValid] = useState(true);

  // Validate full name (only letters and spaces)
  useEffect(() => {
    if (fullName) {
      // Only allow letters (including Unicode letters for international names) and spaces
      const isValid = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(fullName);
      setFullNameValid(isValid);
    } else {
      setFullNameValid(true); // Empty is valid (will be caught by required)
    }
  }, [fullName]);

  // Validate password requirements
  useEffect(() => {
    if (password) {
      setPasswordRequirements({
        minLength: password.length >= 8,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasDigit: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      });
    } else {
      setPasswordRequirements({
        minLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasDigit: false,
        hasSymbol: false,
      });
    }
  }, [password]);

  // Check if user needs to complete business setup
  useEffect(() => {
    const checkUserOrganization = async () => {
      if (!user) return;

      console.log("Checking organization for user:", user.id);
      setCheckingOrganization(true);

      // Clean up URL hash params from email confirmation or OAuth
      const currentHash = window.location.hash;
      if (
        currentHash.includes("access_token") ||
        currentHash.includes("type=")
      ) {
        console.log("Cleaning up auth callback params from URL");
        // Remove query params but keep the route
        const cleanHash = currentHash.split("?")[0].split("#")[1] || "/auth";
        window.history.replaceState(null, "", `#${cleanHash}`);
      }

      // Add small delay to ensure auth state is fully updated
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Check organization status using the new endpoint
        const response = await apiClient.get<{
          has_organization: boolean;
          has_parent: boolean;
          needs_organization: boolean;
          organization: any | null;
          message: string;
        }>("/organizations/check-status");

        console.log("Organization status:", response);

        if (response.needs_organization) {
          // User needs to create organization
          console.log("User needs to create organization");
          setShowBusinessSetup(true);
        } else {
          // User has organization or has parent, redirect to home
          console.log("User has organization, redirecting to home");
          navigate("/", { replace: true });
        }
      } catch (error: any) {
        console.error("Error checking organization status:", error);
        // If endpoint fails, assume need business setup for new users
        const createdAt = user.created_at
          ? new Date(user.created_at)
          : new Date();
        const isNewUser = Date.now() - createdAt.getTime() < 60000; // Within last minute

        if (isNewUser) {
          console.log("New user detected, showing business setup");
          setShowBusinessSetup(true);
        } else {
          console.log("Existing user, redirecting to home");
          navigate("/", { replace: true });
        }
      } finally {
        setCheckingOrganization(false);
      }
    };

    if (user) {
      checkUserOrganization();
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate full name - only letters and spaces allowed
    if (!fullNameValid) {
      toast.error("Nama lengkap hanya boleh berisi huruf dan spasi");
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast.error("Password dan konfirmasi password tidak cocok");
      return;
    }

    // Validate all password requirements
    const allRequirementsMet = Object.values(passwordRequirements).every(
      (req) => req
    );
    if (!allRequirementsMet) {
      toast.error("Password belum memenuhi semua persyaratan keamanan");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/auth`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Check if user already exists (duplicate email)
      // When email already exists, Supabase returns user with empty identities array
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        // This means the email is already registered
        toast.error(
          "Email sudah digunakan. Silakan gunakan email lain atau masuk dengan akun yang sudah ada."
        );
        return;
      }

      // Successful registration
      if (data.user) {
        // New user successfully registered
        toast.success(
          "Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi."
        );

        // Clear form fields
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        // Switch to signin tab after 2 seconds
        setTimeout(() => {
          setActiveTab("signin");
        }, 2000);
      } else {
        // Fallback case - should not normally reach here
        toast.success(
          "Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi."
        );

        // Clear form fields
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        // Switch to signin tab after 2 seconds
        setTimeout(() => {
          setActiveTab("signin");
        }, 2000);
      }
    } catch (error: any) {
      // Handle specific error messages from Supabase
      if (
        error.message?.includes("already registered") ||
        error.message?.includes("User already registered")
      ) {
        toast.error(
          "Email sudah digunakan. Silakan gunakan email lain atau masuk dengan akun yang sudah ada."
        );
      } else {
        toast.error(error.message || "Gagal membuat akun. Silakan coba lagi.");
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
      // useEffect will handle navigation after checking organization
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
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const handleBusinessSetupComplete = () => {
    setShowBusinessSetup(false);
    toast.success("Welcome! Your business has been set up successfully.");
    navigate("/");
  };

  // If user is logged in and we're checking organization, show loading
  if (
    user &&
    (checkingOrganization || (!showBusinessSetup && !checkingOrganization))
  ) {
    // If not checking and not showing business setup, it means we're about to redirect
    // Show loading to avoid flicker
    if (!checkingOrganization && !showBusinessSetup) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Mengarahkan...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Menyiapkan akun Anda...
          </p>
        </div>
      </div>
    );
  }

  // Show business setup if needed
  if (user && showBusinessSetup) {
    return (
      <BusinessSetup
        onComplete={handleBusinessSetupComplete}
        userId={user.id}
      />
    );
  }

  // Show auth forms only if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center space-y-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-[180px] h-16 flex items-center justify-center">
                <img
                  src={
                    theme === "dark"
                      ? "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/syntra-dark-2.png"
                      : "https://vkaixrdqtrzybovvquzv.supabase.co/storage/v1/object/public/assests/syntra-light.png"
                  }
                  alt="Syntra Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardDescription className="text-base">
                Kelola data, operasional dan pekerjaan Anda dengan AI
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
                <TabsTrigger value="signin">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6 space-y-4">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memuat...
                      </>
                    ) : (
                      "Masuk"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Atau lanjutkan dengan
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
                  Masuk dengan Google
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="mt-6 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Nama Lengkap
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
                        Nama lengkap hanya boleh berisi huruf dan spasi
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-email"
                      className="text-sm font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="nama@example.com"
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
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10"
                      required
                    />

                    {/* Password Requirements Indicator */}
                    {password && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                        <p className="text-xs font-medium text-foreground mb-2">
                          Persyaratan Password:
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
                              Minimal 8 karakter
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
                              Huruf kecil (a-z)
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
                              Huruf besar (A-Z)
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
                              Angka (0-9)
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
                              Simbol (!@#$%^&*...)
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
                      Konfirmasi Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Masukkan ulang password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10"
                      required
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <X className="w-3 h-3" />
                        Password tidak cocok
                      </p>
                    )}
                    {confirmPassword &&
                      password === confirmPassword &&
                      Object.values(passwordRequirements).every(
                        (req) => req
                      ) && (
                        <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                          <Check className="w-3 h-3" />
                          Password cocok
                        </p>
                      )}
                    {confirmPassword &&
                      password === confirmPassword &&
                      !Object.values(passwordRequirements).every(
                        (req) => req
                      ) && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                          <X className="w-3 h-3" />
                          Password cocok, tapi belum memenuhi persyaratan
                          keamanan
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
                        Memuat...
                      </>
                    ) : (
                      "Daftar"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Atau lanjutkan dengan
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
                  Daftar dengan Google
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Anda akan terdaftar sebagai Super Admin organisasi Anda
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
};
