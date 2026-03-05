import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  getSubscription,
  getStats,
  getTransactions,
  SubscriptionPlan,
  BillingStats,
  Transaction,
} from "@/services/billingService";

export const UsageBilling = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("usage-billing");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // --- Live Data State ---
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const [planData, statsData, txData] = await Promise.all([
        getSubscription(),
        getStats(),
        getTransactions({ limit: 50, offset: 0 }),
      ]);
      setPlan(planData);
      setStats(statsData);
      setTransactions(txData);
    } catch (error) {
      console.error("Failed to load billing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  // Credit pricing tiers - Keys updated to match potential backend snake_case types
  const creditPricing: Record<string, any> = {
    basic_query: {
      name: "Basic Query",
      credits: 1,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    file_search: {
      name: "File Search",
      credits: 2,
      icon: FileSearch,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    document_analysis: {
      name: "Document Analysis",
      credits: 3,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    image_analysis: {
      name: "Image Analysis",
      credits: 4,
      icon: ImageIcon,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    complex_query: {
      name: "Complex Query",
      credits: 5,
      icon: Brain,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  };

  // --- Derived Calculations from Live Data ---

  // Split transactions into usage deductions and billing additions
  const usageHistory = transactions.filter(
    (tx) => tx.transaction_type === "usage" || tx.amount < 0,
  );
  const billingHistory = transactions.filter(
    (tx) => tx.transaction_type !== "usage" && tx.amount > 0,
  );

  const totalUsageCredits = plan ? plan.used_credits : 0;
  const usagePercentage =
    plan && plan.total_credits > 0
      ? (plan.used_credits / plan.total_credits) * 100
      : 0;

  const remainingCredits = plan ? plan.total_credits - plan.used_credits : 0;

  // Calculate days until reset
  const resetDate = plan ? new Date(plan.end_date) : new Date();
  const today = new Date();
  const daysUntilReset = Math.max(
    0,
    Math.ceil((resetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
      />

      <div
        className={`min-h-screen bg-background ${isSidebarCollapsed ? "ml-20" : "ml-64"} transition-all duration-300`}
      >
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
                    <h1 className="text-3xl font-bold text-foreground">
                      Usage & Billing
                    </h1>
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
                  <Button
                    size="lg"
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Zap className="w-4 h-4" />
                    Buy Credits
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Plan Overview */}
            {plan && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        <Zap className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Current Plan
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {plan.plan_name}
                        </p>
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
                        <p className="text-sm text-muted-foreground">
                          Total Credits
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {plan.total_credits.toLocaleString()}
                        </p>
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
                        <p className="text-sm text-muted-foreground">
                          Used Credits
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {plan.used_credits.toLocaleString()}
                        </p>
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
                        <p className="text-sm text-muted-foreground">
                          Total Spent
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          ${stats?.total_spent.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Credit Balance */}
            {plan && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Credit Balance</CardTitle>
                      <CardDescription className="mt-1">
                        Your current credit usage and remaining balance
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      Resets in {daysUntilReset} days
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Credits Used
                      </span>
                      <span className="font-semibold text-foreground">
                        {plan.used_credits.toLocaleString()} /{" "}
                        {plan.total_credits.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-3" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {Math.round(usagePercentage)}% used
                      </span>
                      <span className="text-green-600 font-medium">
                        {remainingCredits.toLocaleString()} credits remaining
                      </span>
                    </div>
                  </div>

                  {usagePercentage > 80 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <p className="text-sm text-orange-600">
                        You've used {Math.round(usagePercentage)}% of your
                        monthly credits. Consider upgrading your plan.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        Credit Pricing Guide
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(creditPricing).map(([key, pricing]) => {
                          const Icon = pricing.icon;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`p-1.5 rounded ${pricing.bgColor}`}
                                >
                                  <Icon
                                    className={`w-3 h-3 ${pricing.color}`}
                                  />
                                </div>
                                <span className="text-sm text-foreground">
                                  {pricing.name}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {pricing.credits}{" "}
                                {pricing.credits === 1 ? "credit" : "credits"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        Usage Breakdown
                      </h4>
                      <div className="space-y-3">
                        {stats?.by_type &&
                          Object.entries(stats.by_type).map(([key, amount]) => {
                            const pricing =
                              creditPricing[key] || creditPricing.basic_query;
                            const Icon = pricing.icon;
                            const percentage =
                              stats.total_spent > 0
                                ? (amount / stats.total_spent) * 100
                                : 0;

                            return (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      className={`w-3 h-3 ${pricing.color}`}
                                    />
                                    <span className="text-muted-foreground">
                                      {pricing.name}
                                    </span>
                                  </div>
                                  <span className="font-medium text-foreground">
                                    ${amount.toFixed(2)} spent
                                  </span>
                                </div>
                                <Progress
                                  value={percentage}
                                  className="h-1.5"
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      {usageHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No usage history found.
                        </p>
                      ) : (
                        usageHistory.map((usage) => {
                          // Try to map to the correct pricing tier, fallback to basic_query
                          const queryType =
                            usage.metadata?.query_type || "basic_query";
                          const pricing =
                            creditPricing[queryType] ||
                            creditPricing.basic_query;
                          const Icon = pricing.icon;
                          const usageDate = new Date(usage.created_at);

                          return (
                            <div
                              key={usage.id}
                              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <div
                                className={`p-2 rounded-lg ${pricing.bgColor} flex-shrink-0`}
                              >
                                <Icon className={`w-4 h-4 ${pricing.color}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {pricing.name}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {usageDate.toLocaleDateString()} at{" "}
                                    {usageDate.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground line-clamp-1 mb-2">
                                  {usage.description}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1 capitalize">
                                    <Brain className="w-3 h-3" />
                                    Provider:{" "}
                                    {usage.metadata?.provider || "System"}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    completed
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                {/* Backend amounts for usage are negative, we use Math.abs to display the magnitude */}
                                <div className="text-lg font-bold text-foreground">
                                  {Math.abs(usage.amount).toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.abs(usage.amount) === 1
                                    ? "credit"
                                    : "credits"}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {usageHistory.length > 0 && (
                      <div className="mt-6 text-center">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={loadBillingData}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh List
                        </Button>
                      </div>
                    )}
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
                      {billingHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No billing history found.
                        </p>
                      ) : (
                        billingHistory.map((bill) => {
                          const billDate = new Date(bill.created_at);

                          return (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {bill.description}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {billDate.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  {/* Showing top-up magnitude */}
                                  <p className="font-semibold text-green-500">
                                    +{bill.amount.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    credits added
                                  </p>
                                </div>
                                <Badge variant="default" className="capitalize">
                                  paid
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Invoice
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
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
