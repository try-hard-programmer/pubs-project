import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  MessageSquare,
  FileSearch,
  FileText,
  Image as ImageIcon,
  Brain,
} from "lucide-react";
import { Sidebar } from "@/components/FileManager/Sidebar";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import { useAuth } from "@/contexts/AuthContext";

export const UsageBilling = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("usage-billing");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  // Credit pricing tiers
  const creditPricing = {
    basic: { name: "Basic Query", credits: 1, icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    fileSearch: { name: "File Search", credits: 2, icon: FileSearch, color: "text-green-500", bgColor: "bg-green-500/10" },
    documentAnalysis: { name: "Document Analysis", credits: 3, icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    imageAnalysis: { name: "Image Analysis", credits: 4, icon: ImageIcon, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    complexQuery: { name: "Complex Query", credits: 5, icon: Brain, color: "text-red-500", bgColor: "bg-red-500/10" },
  };

  // Current credit balance and plan
  const currentPlan = {
    name: "Professional Plan",
    totalCredits: 1000,
    usedCredits: 347,
    remainingCredits: 653,
    resetDate: "2025-11-15",
    price: 99,
    currency: "USD",
  };

  // Usage history - Last 30 days
  const usageHistory = [
    {
      id: 1,
      date: "2025-10-11",
      time: "14:23",
      type: "complexQuery",
      query: "Analyze quarterly financial reports and summarize key trends",
      credits: 5,
      status: "completed",
      duration: "2.3s",
    },
    {
      id: 2,
      date: "2025-10-11",
      time: "13:45",
      type: "documentAnalysis",
      query: "Extract key information from contract.pdf",
      credits: 3,
      status: "completed",
      duration: "1.8s",
    },
    {
      id: 3,
      date: "2025-10-11",
      time: "11:20",
      type: "fileSearch",
      query: "Find all project proposals from last quarter",
      credits: 2,
      status: "completed",
      duration: "0.9s",
    },
    {
      id: 4,
      date: "2025-10-10",
      time: "16:30",
      type: "imageAnalysis",
      query: "Analyze product images and describe features",
      credits: 4,
      status: "completed",
      duration: "3.1s",
    },
    {
      id: 5,
      date: "2025-10-10",
      time: "15:15",
      type: "basic",
      query: "What files did I upload yesterday?",
      credits: 1,
      status: "completed",
      duration: "0.5s",
    },
    {
      id: 6,
      date: "2025-10-10",
      time: "14:50",
      type: "documentAnalysis",
      query: "Summarize meeting notes from team sync",
      credits: 3,
      status: "completed",
      duration: "1.5s",
    },
    {
      id: 7,
      date: "2025-10-09",
      time: "10:00",
      type: "complexQuery",
      query: "Compare sales data across multiple spreadsheets",
      credits: 5,
      status: "completed",
      duration: "2.8s",
    },
    {
      id: 8,
      date: "2025-10-09",
      time: "09:30",
      type: "basic",
      query: "Show me my starred files",
      credits: 1,
      status: "completed",
      duration: "0.4s",
    },
  ];

  // Billing history
  const billingHistory = [
    {
      id: 1,
      date: "2025-10-01",
      description: "Professional Plan - Monthly",
      credits: 1000,
      amount: 99,
      status: "paid",
      invoiceUrl: "#",
    },
    {
      id: 2,
      date: "2025-09-01",
      description: "Professional Plan - Monthly",
      credits: 1000,
      amount: 99,
      status: "paid",
      invoiceUrl: "#",
    },
    {
      id: 3,
      date: "2025-08-01",
      description: "Professional Plan - Monthly",
      credits: 1000,
      amount: 99,
      status: "paid",
      invoiceUrl: "#",
    },
  ];

  // Usage by category
  const usageByCategory = {
    basic: 45,
    fileSearch: 78,
    documentAnalysis: 89,
    imageAnalysis: 56,
    complexQuery: 79,
  };

  const totalUsageCredits = Object.values(usageByCategory).reduce((a, b) => a + b, 0);

  const usagePercentage = (currentPlan.usedCredits / currentPlan.totalCredits) * 100;

  // Calculate days until reset
  const resetDate = new Date(currentPlan.resetDate);
  const today = new Date();
  const daysUntilReset = Math.ceil((resetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div className={`min-h-screen bg-background ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        <div className="overflow-auto bg-background">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Usage & Billing</h1>
                    <p className="text-muted-foreground mt-1">
                      Monitor your AI credit usage and manage billing
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export Report
                  </Button>
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                    <Zap className="w-4 h-4" />
                    Buy Credits
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Plan Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <p className="text-xl font-bold text-foreground">{currentPlan.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-xl font-bold text-foreground">{currentPlan.totalCredits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <TrendingDown className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Used Credits</p>
                      <p className="text-xl font-bold text-foreground">{currentPlan.usedCredits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <DollarSign className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Cost</p>
                      <p className="text-xl font-bold text-foreground">${currentPlan.price}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit Balance */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Credit Balance</CardTitle>
                    <CardDescription className="mt-1">
                      Your current credit usage and remaining balance
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Resets in {daysUntilReset} days
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits Used</span>
                    <span className="font-semibold text-foreground">
                      {currentPlan.usedCredits.toLocaleString()} / {currentPlan.totalCredits.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-3" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{Math.round(usagePercentage)}% used</span>
                    <span className="text-green-600 font-medium">
                      {currentPlan.remainingCredits.toLocaleString()} credits remaining
                    </span>
                  </div>
                </div>

                {usagePercentage > 80 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm text-orange-600">
                      You've used {Math.round(usagePercentage)}% of your monthly credits. Consider upgrading your plan.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Credit Pricing Guide</h4>
                    <div className="space-y-2">
                      {Object.entries(creditPricing).map(([key, pricing]) => {
                        const Icon = pricing.icon;
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${pricing.bgColor}`}>
                                <Icon className={`w-3 h-3 ${pricing.color}`} />
                              </div>
                              <span className="text-sm text-foreground">{pricing.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {pricing.credits} {pricing.credits === 1 ? 'credit' : 'credits'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Usage Breakdown</h4>
                    <div className="space-y-3">
                      {Object.entries(usageByCategory).map(([key, count]) => {
                        const pricing = creditPricing[key as keyof typeof creditPricing];
                        const Icon = pricing.icon;
                        const totalCredits = count * pricing.credits;
                        const percentage = (totalCredits / totalUsageCredits) * 100;

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-3 h-3 ${pricing.color}`} />
                                <span className="text-muted-foreground">{pricing.name}</span>
                              </div>
                              <span className="font-medium text-foreground">
                                {count} queries · {totalCredits} credits
                              </span>
                            </div>
                            <Progress value={percentage} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Usage History and Billing */}
            <Tabs defaultValue="usage" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
                <TabsTrigger value="usage">Usage History</TabsTrigger>
                <TabsTrigger value="billing">Billing History</TabsTrigger>
              </TabsList>

              {/* Usage History Tab */}
              <TabsContent value="usage" className="mt-6">
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Usage</CardTitle>
                        <CardDescription className="mt-1">
                          Your AI query history and credit consumption
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageHistory.map((usage) => {
                        const pricing = creditPricing[usage.type as keyof typeof creditPricing];
                        const Icon = pricing.icon;

                        return (
                          <div
                            key={usage.id}
                            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className={`p-2 rounded-lg ${pricing.bgColor} flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${pricing.color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {pricing.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {usage.date} at {usage.time}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-1 mb-2">
                                {usage.query}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {usage.duration}
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {usage.status}
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-foreground">
                                {usage.credits}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {usage.credits === 1 ? 'credit' : 'credits'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 text-center">
                      <Button variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Load More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing History Tab */}
              <TabsContent value="billing" className="mt-6">
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Billing History</CardTitle>
                        <CardDescription className="mt-1">
                          Your payment history and invoices
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Download All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {billingHistory.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{bill.description}</p>
                              <p className="text-sm text-muted-foreground">{bill.date}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                ${bill.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {bill.credits.toLocaleString()} credits
                              </p>
                            </div>
                            <Badge
                              variant={bill.status === "paid" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {bill.status}
                            </Badge>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Download className="w-4 h-4" />
                              Invoice
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
