import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Tag,
  Edit,
  ShoppingCart,
  Clock,
  Send, // Telegram Icon
  MessageCircle, // WhatsApp Icon
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Ensure the type handles nulls safely
interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  metadata?: {
    telegram_id?: string;
    company?: string;
    location?: string;
    total_orders?: number;
    total_spent?: number;
    [key: string]: any;
  };
  // Fallback fields
  company?: string;
  location?: string;
  status?: "active" | "inactive";
  lastContact?: string;
  tags?: string[];
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdDate?: string;
  industry?: string;
  position?: string;
}

interface CustomerDetailPanelProps {
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerDetailPanel = ({
  customer,
  onClose,
}: CustomerDetailPanelProps) => {
  if (!customer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // --- SAFE GUARDS FOR GHOST USERS ---
  const hasPhone = Boolean(customer.phone); // Safer check
  const telegramId = customer.metadata?.telegram_id;
  const hasTelegram = Boolean(telegramId) || hasPhone;

  // Safe Fallbacks
  const displayName = customer.name || "Unknown";
  const displayEmail = customer.email || "-";
  const displayPhone = customer.phone || "-";
  const displayCompany = customer.metadata?.company || customer.company || "-";
  const displayLocation =
    customer.metadata?.location || customer.location || "-";

  // Safe Math
  const totalOrders =
    customer.metadata?.total_orders ?? customer.totalOrders ?? 0;
  const totalSpent = customer.metadata?.total_spent ?? customer.totalSpent ?? 0;

  return (
    // Added 'bg-background' to ensure it's not transparent
    <div className="w-96 border-l bg-background flex flex-col h-full shadow-xl z-20 absolute right-0 top-0 bottom-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <h3 className="font-semibold text-lg">Customer Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-bold text-xl">{displayName}</h4>
              <p className="text-sm text-muted-foreground">
                {customer.position || "Customer"}
              </p>
            </div>
            <Badge
              variant={customer.status === "active" ? "default" : "secondary"}
              className={customer.status === "active" ? "bg-green-500" : ""}
            >
              {customer.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-all">
                    {displayEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Phone (WhatsApp)
                  </p>
                  <p className="text-sm font-medium">{displayPhone}</p>
                </div>
              </div>

              {/* Show Telegram ID if phone is missing */}
              {!hasPhone && telegramId && (
                <div className="flex items-start gap-3">
                  <Send className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Telegram ID</p>
                    <p className="text-sm font-medium">{telegramId}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{displayLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-medium">{displayCompany}</p>
                </div>
              </div>
              {customer.industry && (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="text-sm font-medium">{customer.industry}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Total Orders
                  </span>
                </div>
                <span className="text-sm font-bold">{totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Total Spent
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(totalSpent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last Contact
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {customer.lastContact || "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2 bg-background">
        <Button className="w-full" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {/* WhatsApp Button - Only enabled if phone exists */}
          <Button
            className="w-full"
            variant="outline"
            size="sm"
            disabled={!hasPhone}
            title={
              !hasPhone ? "No phone number available" : "Chat via WhatsApp"
            }
          >
            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
            WhatsApp
          </Button>

          {/* Telegram Button - Enabled if ID exists OR Phone exists */}
          <Button
            className="w-full"
            variant="outline"
            size="sm"
            disabled={!hasTelegram}
            title={
              !hasTelegram
                ? "No Telegram ID or phone available"
                : "Chat via Telegram"
            }
          >
            <Send className="h-4 w-4 mr-2 text-blue-500" />
            Telegram
          </Button>
        </div>
      </div>
    </div>
  );
};
