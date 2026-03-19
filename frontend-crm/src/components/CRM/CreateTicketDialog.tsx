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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

const PREDEFINED_CATEGORIES = [
  "Technical Support",
  "Billing",
  "General Inquiry",
  "Product Question",
  "Complaint",
  "Payment",
  "Refund",
];

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

  // State untuk Combobox Category
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [errors, setErrors] = useState<Partial<Record<keyof Ticket, string>>>(
    {},
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
    const emojiRegex = /\p{Extended_Pictographic}/u;

    // Strict Title Validation
    const title = formData.title.trim();
    if (!title) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    } else if (emojiRegex.test(title)) {
      newErrors.title = "Emojis are not allowed in the title";
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
      newErrors.category = "Please select or type a valid category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onCreate({
        ...formData,
        category: formData.category.trim(),
      });
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
    setSearchValue("");
    setOpenCombobox(false);
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

          {/* Category - Searchable & Creatable Select (Combobox) */}
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className={cn(
                    "w-full justify-between font-normal",
                    !formData.category && "text-muted-foreground",
                    errors.category &&
                      "border-red-500 focus-visible:ring-red-500",
                  )}
                >
                  {formData.category || "Select or type category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                style={{ width: "var(--radix-popover-trigger-width)" }}
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder="Search or type custom category..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {searchValue
                        ? `Tekan Enter untuk membuat "${searchValue}"`
                        : "Kategori tidak ditemukan."}
                    </CommandEmpty>
                    <CommandGroup>
                      {/* Standard Categories */}
                      {PREDEFINED_CATEGORIES.map((category) => (
                        <CommandItem
                          key={category}
                          value={category}
                          onSelect={() => {
                            handleChange("category", category);
                            setOpenCombobox(false);
                            setSearchValue("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.category === category
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {category}
                        </CommandItem>
                      ))}

                      {/* Custom Category Creation */}
                      {searchValue &&
                        !PREDEFINED_CATEGORIES.some(
                          (c) => c.toLowerCase() === searchValue.toLowerCase(),
                        ) && (
                          <CommandItem
                            value={searchValue}
                            onSelect={() => {
                              handleChange("category", searchValue.trim());
                              setOpenCombobox(false);
                              setSearchValue("");
                            }}
                            className="font-medium text-primary"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.category.toLowerCase() ===
                                  searchValue.toLowerCase()
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Create "{searchValue}"
                          </CommandItem>
                        )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
