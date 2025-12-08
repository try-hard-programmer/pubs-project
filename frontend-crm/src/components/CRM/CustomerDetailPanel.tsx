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
  Calendar,
  Tag,
  Edit,
  MessageSquare,
  ShoppingCart,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  status: "active" | "inactive";
  lastContact: string;
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

  return (
    <div className="w-96 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-lg">Customer Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Customer Avatar & Name */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {customer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-bold text-xl">{customer.name}</h4>
              <p className="text-sm text-muted-foreground">
                {customer.position || "Customer"}
              </p>
            </div>
            <Badge
              variant={customer.status === "active" ? "default" : "secondary"}
              className={
                customer.status === "active"
                  ? "bg-green-500 hover:bg-green-600"
                  : ""
              }
            >
              {customer.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-all">
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{customer.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{customer.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-medium">{customer.company}</p>
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
            <CardHeader>
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
                <span className="text-sm font-bold">
                  {customer.totalOrders || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Total Spent
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(customer.totalSpent || 0)}
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
                  {customer.lastContact}
                </span>
              </div>
              {customer.createdDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Customer Since
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {customer.createdDate}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
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

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-2">
        <Button className="w-full" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
        <Button className="w-full" variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </Button>
      </div>
    </div>
  );
};
