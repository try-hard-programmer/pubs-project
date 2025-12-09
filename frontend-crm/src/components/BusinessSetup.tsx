import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

interface BusinessSetupProps {
  onComplete: () => void;
  userId: string;
}

const STORAGE_KEY = "syntra_business_setup_draft";

export const BusinessSetup = ({ onComplete, userId }: BusinessSetupProps) => {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  // ✅ 1. Import Context to fix the "Loop"
  const { refreshOrganization, currentOrganization } = useOrganization();

  // ✅ 2. Initialize from LocalStorage (Fixes "Form Auto Clear")
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : { name: "", legalName: "", category: "", description: "" };
    } catch {
      return { name: "", legalName: "", category: "", description: "" };
    }
  });

  // ✅ 3. Auto-save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  // ✅ 4. Auto-redirect if organization appears (Fixes Race Conditions)
  useEffect(() => {
    if (currentOrganization) {
      onComplete();
    }
  }, [currentOrganization]);

  const businessCategories = [
    { value: "technology", label: "Technology" },
    { value: "finance", label: "Finance" },
    { value: "healthcare", label: "Healthcare" },
    { value: "education", label: "Education" },
    { value: "retail", label: "Retail" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "consulting", label: "Consulting" },
    { value: "real_estate", label: "Real Estate" },
    { value: "hospitality", label: "Hospitality" },
    { value: "transportation", label: "Transportation" },
    { value: "media", label: "Media" },
    { value: "agriculture", label: "Agriculture" },
    { value: "construction", label: "Construction" },
    { value: "energy", label: "Energy" },
    { value: "telecommunications", label: "Telecommunications" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Call API to create organization
      await apiClient.post<{ organization_id: string }>("/organizations", {
        name: formData.name,
        legal_name: formData.legalName || null,
        category: formData.category,
        description: formData.description || null,
        owner_id: userId,
      });

      // Clear draft upon success
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Business information saved successfully!");

      // ✅ 5. Force refresh context to enter Dashboard
      await refreshOrganization();
      onComplete();
    } catch (error: any) {
      console.error("Error creating organization:", error);

      if (
        error.message?.includes("organizations_owner_id_fkey") ||
        error.code === "23503"
      ) {
        toast.error(
          "Session sync error. Your account may have been deleted. Logging out..."
        );

        // 🧨 NUCLEAR OPTION: Destroy all evidence
        // Remove the specific Supabase token (replace with your actual project key if different)
        localStorage.removeItem("sb-ogiagiflmsjvuhknmihh-auth-token");

        // Remove the form draft so they don't reload with the same bad data
        localStorage.removeItem(STORAGE_KEY);

        // Optional: Clear everything else to be safe
        // localStorage.clear();

        // Redirect immediately to Register to recreate the account
        setTimeout(() => {
          window.location.href = "/register";
        }, 1500);

        return;
      }

      // ✅ 6. INTELLIGENT RECOVERY: If org already exists, sync state!
      if (
        error.message?.includes("already has an organization") ||
        error.message?.includes("unique constraint") ||
        error.message?.includes("already exists")
      ) {
        toast.info("It seems you already have an organization. Syncing...");
        await refreshOrganization();
        // The useEffect above will detect the new org and trigger onComplete()
        return;
      }

      toast.error(error.message || "Failed to save business information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
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
            <CardTitle className="text-2xl">Setup Your Business</CardTitle>
            <CardDescription className="text-base">
              Tell us about your business to complete the registration
            </CardDescription>
            <p className="text-xs text-muted-foreground italic">
              powered by SINERGI
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-medium">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="businessName"
                type="text"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-10"
                required
              />
            </div>

            {/* Legal Business Name - Optional */}
            <div className="space-y-2">
              <Label htmlFor="legalName" className="text-sm font-medium">
                Legal Business Name{" "}
                <span className="text-muted-foreground text-xs">
                  (Optional)
                </span>
              </Label>
              <Input
                id="legalName"
                type="text"
                placeholder="e.g., Acme Corporation Ltd."
                value={formData.legalName}
                onChange={(e) =>
                  setFormData({ ...formData, legalName: e.target.value })
                }
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Official registered business name (if different from above)
              </p>
            </div>

            {/* Business Category - Required */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Business Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                required
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {businessCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Description - Optional */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Short Description{" "}
                <span className="text-muted-foreground text-xs">
                  (Optional)
                </span>
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of your business..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90"
                disabled={loading || !formData.name || !formData.category}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You will be registered as the Super Admin of your organization
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
