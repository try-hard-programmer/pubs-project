import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  Target,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  probability: number;
  stage: string;
  leadScore: number;
  needs: string[];
  decisionMaker: string;
  decisionMakerRole: string;
  contactPhone: string;
  contactEmail: string;
  expectedClose: string;
  lastActivity: string;
  owner: string;
  tags: string[];
  priority: "low" | "medium" | "high";
}

interface DealCardProps {
  deal: Deal;
  onCardClick?: (deal: Deal) => void;
}

export const DealCard = ({ deal, onCardClick }: DealCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return "Hot Lead";
    if (score >= 60) return "Warm Lead";
    return "Cold Lead";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4"
      style={{ borderLeftColor: deal.probability >= 70 ? "#22c55e" : deal.probability >= 40 ? "#eab308" : "#94a3b8" }}
      onClick={() => onCardClick?.(deal)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Priority + Tags */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(deal.priority)} mt-1.5`} />
            {deal.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {deal.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{deal.tags.length - 2}
              </Badge>
            )}
          </div>
          <div className={`px-2 py-1 rounded-md text-xs font-bold ${getLeadScoreColor(deal.leadScore)}`}>
            {deal.leadScore}
          </div>
        </div>

        {/* Deal Name */}
        <div>
          <h3 className="font-bold text-base line-clamp-1">{deal.name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <Building2 className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{deal.company}</span>
          </div>
        </div>

        {/* Lead Score Label */}
        <div className="flex items-center gap-2">
          <Target className={`h-4 w-4 ${deal.leadScore >= 80 ? "text-green-600" : deal.leadScore >= 60 ? "text-yellow-600" : "text-red-600"}`} />
          <span className={`text-xs font-semibold ${deal.leadScore >= 80 ? "text-green-600" : deal.leadScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
            {getLeadScoreLabel(deal.leadScore)}
          </span>
        </div>

        {/* Value */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Nilai Deal</span>
            <span className="text-sm font-bold text-green-600">
              {formatCurrency(deal.value)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Probability</span>
            <span className="font-semibold">{deal.probability}%</span>
          </div>
          <Progress value={deal.probability} className="h-1.5 mt-1" />
          <div className="mt-1 text-xs text-muted-foreground">
            Weighted: <span className="font-semibold text-foreground">
              {formatCurrency(deal.value * deal.probability / 100)}
            </span>
          </div>
        </div>

        {/* Needs */}
        {deal.needs.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Kebutuhan:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {deal.needs.map((need, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {need}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Decision Maker */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Decision Maker:</span>
          </div>
          <p className="text-sm font-semibold">{deal.decisionMaker}</p>
          <p className="text-xs text-muted-foreground">{deal.decisionMakerRole}</p>
        </div>

        {/* Contact Info */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{deal.contactPhone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground line-clamp-1">{deal.contactEmail}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Expected Close:</span>
            </div>
            <span className="font-semibold">{deal.expectedClose}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last Activity:</span>
            </div>
            <span className="font-semibold">{deal.lastActivity}</span>
          </div>
        </div>

        {/* Owner */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {deal.owner.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{deal.owner}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
