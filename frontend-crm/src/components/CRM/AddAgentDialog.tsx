import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "busy";
}

interface AddAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (agent: Agent) => void;
}

export const AddAgentDialog = ({
  open,
  onClose,
  onAdd,
}: AddAgentDialogProps) => {
  const [formData, setFormData] = useState<Agent>({
    name: "",
    email: "",
    phone: "",
    status: "active",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Agent, string>>>(
    {},
  );
  const [touched, setTouched] = useState<Partial<Record<keyof Agent, boolean>>>(
    {},
  );

  // Regex Patterns
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const NAME_REGEX = /^[\p{L}\p{N}\s\-''.]+$/u;

  const hasEmoji = (str: string) =>
    /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu.test(str);

  const validateField = (field: keyof Agent, value: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.length < 2) return "Name must be at least 2 characters";
        if (value.length > 50) return "Name must be less than 50 characters";
        if (!NAME_REGEX.test(value)) return "Name contains invalid characters";
        return "";

      case "email":
        if (!value.trim()) return "Email is required";
        if (!EMAIL_REGEX.test(value))
          return "Please enter a valid email address";
        return "";

      case "phone":
        if (!value.trim()) return "Phone is required";

        // 1. Emoji check
        if (hasEmoji(value)) return "Phone cannot contain emojis";

        // 2. Clean the value for logical checks (this matches what handleChange outputs)
        const cleanedValue = value.replace(/[\s+\-().]/g, "");

        // 3. Block non-numeric characters entirely
        if (/[^0-9]/.test(cleanedValue)) return "Only numbers are allowed";

        // 4. Block leading '0'
        if (cleanedValue.startsWith("0"))
          return "Use country code (e.g., 62), not '0'";

        // 5. Must start with a valid country code (1-9)
        if (cleanedValue.length > 0 && !/^[1-9]/.test(cleanedValue)) {
          return "Must start with a valid country code";
        }

        // 6. Length checks (E.164 limits)
        if (cleanedValue.length > 0 && cleanedValue.length < 7) {
          return "Phone number too short (min 7 digits)";
        }
        if (cleanedValue.length > 15) {
          return "Phone number too long (max 15 digits)";
        }

        // 7. Detect fake/repeating numbers
        if (/^(\d)\1{6,}$/.test(cleanedValue)) {
          return "Invalid phone number format";
        }

        return "";

      default:
        return "";
    }
  };

  const handleChange = (field: keyof Agent, value: string) => {
    let finalValue = value;

    // 🚀 LIVE FORMATTING: Apply smart cleaning instantly to the phone field
    if (field === "phone") {
      finalValue = value.replace(/[\s+\-().]/g, "");

      // Prevent typing beyond 15 chars entirely to enforce max limit live
      if (finalValue.length > 15) return;
    }

    setFormData((prev) => ({ ...prev, [field]: finalValue }));

    // Real-time validation if the field has been touched, already has an error, OR is the phone field
    if (touched[field] || errors[field] || field === "phone") {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, finalValue),
      }));
    }
  };

  const handleBlur = (field: keyof Agent) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field] as string),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields right before submission
    const nameError = validateField("name", formData.name);
    const emailError = validateField("email", formData.email);
    const phoneError = validateField("phone", formData.phone);

    const newErrors = {
      name: nameError,
      email: emailError,
      phone: phoneError,
    };

    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true });

    // Check if there are any errors
    if (!nameError && !emailError && !phoneError) {
      onAdd({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone, // 🚀 Clean, strictly validated, ready for the DB!
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "active",
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter agent name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              className={
                errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
              }
            />
            {errors.name ? (
              <p className="text-xs text-red-500 animate-in slide-in-from-top-1">
                {errors.name}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground text-right">
                {formData.name.length}/50
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="agent@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              className={
                errors.email ? "border-red-500 focus-visible:ring-red-500" : ""
              }
            />
            {errors.email && (
              <p className="text-xs text-red-500 animate-in slide-in-from-top-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 6281234567890" // Global placeholder format
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              className={
                errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""
              }
            />
            {errors.phone ? (
              <p className="text-xs text-red-500 animate-in slide-in-from-top-1">
                {errors.phone}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Include country code without '+' or leading '0' (e.g. 62)
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive" | "busy") =>
                handleChange("status", value)
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Add Agent</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
