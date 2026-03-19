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
  XCircle,
  Zap,
  MessageSquare,
  FileText,
  Brain,
  Lock,
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

  // Map backend query_types to UI presentation
  const queryTypeMapping: Record<string, any> = {
    text_query: {
      name: "AI Text Query",
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    upload_file: {
      name: "File Processing",
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    default: {
      name: "System Action",
      icon: Brain,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
  };

  // Helper untuk format IDR
  const formatIDR = (value: number, minFraction = 2) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: minFraction,
    }).format(value);
  };

  // --- Derived Calculations ---
  // A transaction is 'usage' if it has a query_type OR if it's explicitly marked as usage / negative amount
  const usageHistory = transactions.filter(
    (tx) =>
      tx.query_type ||
      tx.transaction_type === "usage" ||
      (tx.amount && tx.amount < 0),
  );

  // A transaction is 'billing' (top-up) if it lacks a query type AND is a top up / positive amount
  const billingHistory = transactions.filter(
    (tx) =>
      !tx.query_type &&
      (tx.transaction_type === "top_up" || (tx.amount && tx.amount > 0)),
  );

  const usagePercentage =
    plan && plan.total_credits > 0
      ? (plan.used_credits / plan.total_credits) * 100
      : 0;

  const remainingCredits = plan ? plan.total_credits - plan.used_credits : 0;

  const resetDate = plan ? new Date(plan.end_date) : new Date();
  const today = new Date();
  const daysUntilReset = Math.max(
    0,
    Math.ceil((resetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

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

            {isLoading ? (
              <div className="h-[50vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-muted-foreground">
                    Loading billing data...
                  </p>
                </div>
              </div>
            ) : (
              <>
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
                            <p className="text-xl font-bold text-foreground capitalize">
                              {plan.plan_name.replace("_", " ")}
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
                              {plan.total_credits.toLocaleString("id-ID")}
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
                              {plan.used_credits.toLocaleString("id-ID")}
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
                              IDR{" "}
                              {stats?.total_spent
                                ? formatIDR(stats.total_spent)
                                : "0,00"}
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
                            {plan.used_credits.toLocaleString("id-ID")} /{" "}
                            {plan.total_credits.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <Progress value={usagePercentage} className="h-3" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {Math.round(usagePercentage)}% used
                          </span>
                          <span className="text-green-600 font-medium">
                            {remainingCredits.toLocaleString("id-ID")} credits
                            remaining
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
                              Detailed breakdown of AI query history and token
                              consumption
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
                              const qType = usage.query_type || "default";
                              const presentation =
                                queryTypeMapping[qType] ||
                                queryTypeMapping.default;
                              const Icon = presentation.icon;

                              const title =
                                usage.query_text ||
                                usage.description ||
                                "Unknown Action";
                              const credits =
                                usage.credits_used ??
                                Math.abs(usage.amount || 0);
                              const isFailed = usage.status === "failed";
                              const usageDate = new Date(usage.created_at);

                              return (
                                <div
                                  key={usage.id}
                                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                                    isFailed
                                      ? "bg-red-50/50 border-red-100 hover:bg-red-50"
                                      : "border-border hover:bg-muted/50"
                                  }`}
                                >
                                  {/* Icon */}
                                  <div
                                    className={`p-2 rounded-lg flex-shrink-0 ${
                                      isFailed
                                        ? "bg-red-100 text-red-600"
                                        : presentation.bgColor
                                    }`}
                                  >
                                    <Icon
                                      className={`w-4 h-4 ${isFailed ? "text-red-600" : presentation.color}`}
                                    />
                                  </div>

                                  {/* Main Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant={
                                          isFailed ? "destructive" : "outline"
                                        }
                                        className="text-xs"
                                      >
                                        {presentation.name}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {usageDate.toLocaleDateString("id-ID")}{" "}
                                        at{" "}
                                        {usageDate.toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>

                                    <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                                      {title}
                                    </p>

                                    {/* Metadata Footer */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                      {/* Status Status */}
                                      <div
                                        className={`flex items-center gap-1 font-medium ${isFailed ? "text-red-600" : "text-green-600"}`}
                                      >
                                        {isFailed ? (
                                          <>
                                            <XCircle className="w-3 h-3" />{" "}
                                            Failed
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="w-3 h-3" />{" "}
                                            Completed
                                          </>
                                        )}
                                      </div>

                                      {/* Cost */}
                                      {usage.cost !== undefined &&
                                        usage.cost > 0 && (
                                          <div className="flex items-center gap-1 border-l pl-4">
                                            Cost:{" "}
                                            <span className="text-foreground">
                                              IDR {formatIDR(usage.cost, 5)}
                                            </span>
                                          </div>
                                        )}

                                      {/* Tokens */}
                                      {(usage.input_tokens > 0 ||
                                        usage.output_tokens > 0) && (
                                        <div className="flex items-center gap-1 border-l pl-4">
                                          Tokens:{" "}
                                          <span className="text-foreground">
                                            {(
                                              (usage.input_tokens || 0) +
                                              (usage.output_tokens || 0)
                                            ).toLocaleString("id-ID")}
                                          </span>
                                        </div>
                                      )}

                                      {/* Escrow Status */}
                                      {usage.metadata?.escrow_status && (
                                        <div className="flex items-center gap-1 border-l pl-4 text-orange-600">
                                          <Lock className="w-3 h-3" />
                                          <span className="capitalize">
                                            {usage.metadata.escrow_status}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right side: Credits Used */}
                                  <div className="text-right flex-shrink-0">
                                    <div
                                      className={`text-lg font-bold ${isFailed ? "text-red-600" : "text-foreground"}`}
                                    >
                                      {credits.toLocaleString("id-ID")}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {credits === 1 ? "credit" : "credits"}
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
                                        {bill.description || "Credit Top-up"}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {billDate.toLocaleDateString("id-ID")}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <p className="font-semibold text-green-500">
                                        +
                                        {(bill.amount || 0).toLocaleString(
                                          "id-ID",
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        credits added
                                      </p>
                                    </div>
                                    <Badge
                                      variant="default"
                                      className="capitalize"
                                    >
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
              </>
            )}
          </div>
        </div>
      </div>

      <FloatingAIButton />
    </>
  );
};
