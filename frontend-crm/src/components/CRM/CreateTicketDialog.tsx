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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ticket {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string;
  tags?: string[];
}

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (ticket: Ticket) => void;
}

export const CreateTicketDialog = ({
  open,
  onClose,
  onCreate,
}: CreateTicketDialogProps) => {
  const [formData, setFormData] = useState<Ticket>({
    title: "",
    description: "",
    category: "",
    priority: "low",
    status: "open",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Ticket, string>>>(
    {}
  );

  const handleChange = (field: keyof Ticket, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error immediately when user fixes it
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Ticket, string>> = {};

    // Strict Title Validation
    const title = formData.title.trim();
    if (!title) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    // Strict Description Validation
    const desc = formData.description.trim();
    if (!desc) {
      newErrors.description = "Description is required";
    } else if (desc.length < 10) {
      newErrors.description =
        "Please provide more detail (at least 10 characters)";
    } else if (desc.length > 300) {
      newErrors.description = "Description is too long (max 300 characters)";
    }

    // Category Validation
    if (!formData.category.trim()) {
      newErrors.category = "Please select a valid category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onCreate(formData);
      handleClose(); // Close and reset on success
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "low",
      status: "open",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Ticket Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Login page is not loading"
              value={formData.title}
              maxLength={100}
              onChange={(e) => handleChange("title", e.target.value)}
              className={
                errors.title ? "border-red-500 focus-visible:ring-red-500" : ""
              }
            />
            {errors.title ? (
              <p className="text-xs text-red-500 font-medium">{errors.title}</p>
            ) : (
              <p className="text-xs text-muted-foreground text-right">
                {formData.title.length}/100
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              rows={4}
              value={formData.description}
              maxLength={300}
              onChange={(e) => handleChange("description", e.target.value)}
              className={
                errors.description
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {errors.description ? (
              <p className="text-xs text-red-500 font-medium">
                {errors.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/300
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange("category", value)}
            >
              <SelectTrigger
                id="category"
                className={
                  errors.category ? "border-red-500 focus:ring-red-500" : ""
                }
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technical Support">
                  Technical Support
                </SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
                <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                <SelectItem value="Product Question">
                  Product Question
                </SelectItem>
                <SelectItem value="Complaint">Complaint</SelectItem>
                <SelectItem value="Payment">Payment</SelectItem>
                <SelectItem value="Refund">Refund</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-red-500 font-medium">
                {errors.category}
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                handleChange("priority", value)
              }
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
