import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Target,
  DollarSign,
  Edit,
  Trash2,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  FileText,
  Activity,
  Plus,
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

interface DealDetailModalProps {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
}

export const DealDetailModal = ({ deal, open, onClose }: DealDetailModalProps) => {
  if (!deal) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return "Hot Lead 🔥";
    if (score >= 60) return "Warm Lead ⚡";
    return "Cold Lead ❄️";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500 hover:bg-red-600">High Priority</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium Priority</Badge>;
      default:
        return <Badge variant="secondary">Low Priority</Badge>;
    }
  };

  const getStageBadge = (stage: string) => {
    const stageMap: Record<string, { label: string; color: string }> = {
      lead: { label: "Lead", color: "bg-slate-500" },
      qualified: { label: "Qualified", color: "bg-blue-500" },
      proposal: { label: "Proposal", color: "bg-purple-500" },
      negotiation: { label: "Negotiation", color: "bg-yellow-500" },
      closing: { label: "Closing", color: "bg-orange-500" },
      won: { label: "Won", color: "bg-green-500" },
      lost: { label: "Lost", color: "bg-red-500" },
    };

    const stageInfo = stageMap[stage] || { label: stage, color: "bg-gray-500" };
    return (
      <Badge className={`${stageInfo.color} text-white hover:${stageInfo.color}`}>
        {stageInfo.label}
      </Badge>
    );
  };

  // Mock activities
  const activities = [
    {
      id: 1,
      type: "call",
      description: "Follow-up call with decision maker",
      timestamp: "2 hours ago",
      user: deal.owner,
    },
    {
      id: 2,
      type: "email",
      description: "Sent proposal document",
      timestamp: "1 day ago",
      user: deal.owner,
    },
    {
      id: 3,
      type: "meeting",
      description: "Product demo meeting",
      timestamp: "3 days ago",
      user: deal.owner,
    },
  ];

  // Mock notes
  const notes = [
    {
      id: 1,
      content: "Customer is very interested in the enterprise package. Need to follow up on pricing.",
      timestamp: "2 days ago",
      user: deal.owner,
    },
    {
      id: 2,
      content: "Decision maker mentioned budget approval expected by end of month.",
      timestamp: "5 days ago",
      user: deal.owner,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">{deal.name}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStageBadge(deal.stage)}
                {getPriorityBadge(deal.priority)}
                {deal.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Deal Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(deal.value)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Weighted: {formatCurrency((deal.value * deal.probability) / 100)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Probability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{deal.probability}%</div>
                  <Progress value={deal.probability} className="h-2 mt-2" />
                </CardContent>
              </Card>

              <Card className={`border-2 ${getLeadScoreColor(deal.leadScore)}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Lead Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{deal.leadScore}</div>
                  <p className="text-xs font-semibold mt-1">{getLeadScoreLabel(deal.leadScore)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                      <p className="text-sm font-semibold">{deal.company}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Decision Maker */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Decision Maker
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {deal.decisionMaker
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{deal.decisionMaker}</p>
                        <p className="text-sm text-muted-foreground">{deal.decisionMakerRole}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{deal.contactPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="break-all">{deal.contactEmail}</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button size="sm" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Decision Maker
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Needs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Customer Needs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {deal.needs.map((need, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {need}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expected Close:</span>
                      </div>
                      <span className="font-semibold">{deal.expectedClose}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last Activity:</span>
                      </div>
                      <span className="font-semibold">{deal.lastActivity}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Owner */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Deal Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {deal.owner
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{deal.owner}</p>
                        <p className="text-sm text-muted-foreground">Sales Representative</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3 mt-4">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{activity.user}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {activity.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </TabsContent>

              <TabsContent value="notes" className="space-y-3 mt-4">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">{note.user}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
