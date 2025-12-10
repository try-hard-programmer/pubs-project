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
    {}
  );
  const [touched, setTouched] = useState<Partial<Record<keyof Agent, boolean>>>(
    {}
  );

  // Regex Patterns
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^\+?[0-9\s-()]{10,20}$/;
  const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

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
        // Remove non-digit chars to count actual numbers
        const digits = value.replace(/\D/g, "");
        if (digits.length < 10)
          return "Phone number is too short (min 10 digits)";
        if (digits.length > 15)
          return "Phone number is too long (max 15 digits)";
        if (!PHONE_REGEX.test(value)) return "Invalid phone number format";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (field: keyof Agent, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation if the field has been touched or has an error
    if (touched[field] || errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
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

    // Validate all fields
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
        phone: formData.phone.trim(),
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
              placeholder="+62 812-3456-7890"
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
                Include country code (e.g. +62)
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
