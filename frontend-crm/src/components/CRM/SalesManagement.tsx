import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Target,
  Award,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import { DealDetailModal } from "./DealDetailModal";

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

interface Stage {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const SalesManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Pipeline Stages
  const stages: Stage[] = [
    { id: "lead", name: "Lead", color: "bg-slate-500", icon: "👤" },
    { id: "qualified", name: "Qualified", color: "bg-blue-500", icon: "✓" },
    { id: "proposal", name: "Proposal", color: "bg-purple-500", icon: "📄" },
    { id: "negotiation", name: "Negotiation", color: "bg-yellow-500", icon: "💬" },
    { id: "closing", name: "Closing", color: "bg-orange-500", icon: "🤝" },
    { id: "won", name: "Won", color: "bg-green-500", icon: "🎉" },
    { id: "lost", name: "Lost", color: "bg-red-500", icon: "❌" },
  ];

  // Mock data untuk sales pipeline
  const [deals, setDeals] = useState<Deal[]>([
    {
      id: "1",
      name: "Kontrak Software Enterprise",
      company: "PT. Maju Jaya",
      value: 150000000,
      stage: "negotiation",
      probability: 75,
      leadScore: 85,
      needs: ["CRM System", "Integration", "Training"],
      decisionMaker: "Budi Santoso",
      decisionMakerRole: "IT Director",
      contactPhone: "+62 812-3456-7890",
      contactEmail: "budi.santoso@majujaya.com",
      expectedClose: "15 Feb 2024",
      lastActivity: "2 hours ago",
      owner: "John Doe",
      tags: ["Enterprise", "High Value"],
      priority: "high",
    },
    {
      id: "2",
      name: "Implementasi CRM System",
      company: "CV. Sukses Mandiri",
      value: 85000000,
      stage: "proposal",
      probability: 60,
      leadScore: 72,
      needs: ["CRM", "Mobile App"],
      decisionMaker: "Siti Rahayu",
      decisionMakerRole: "Owner",
      contactPhone: "+62 811-2345-6789",
      contactEmail: "siti@suksesmandiri.com",
      expectedClose: "28 Feb 2024",
      lastActivity: "1 day ago",
      owner: "Jane Smith",
      tags: ["SME", "Software"],
      priority: "medium",
    },
    {
      id: "3",
      name: "Maintenance & Support",
      company: "UD. Berkah Jaya",
      value: 35000000,
      stage: "qualified",
      probability: 40,
      leadScore: 58,
      needs: ["Support", "Maintenance"],
      decisionMaker: "Ahmad Hidayat",
      decisionMakerRole: "Operations Manager",
      contactPhone: "+62 813-4567-8901",
      contactEmail: "ahmad@berkahjaya.com",
      expectedClose: "10 Mar 2024",
      lastActivity: "3 days ago",
      owner: "Bob Wilson",
      tags: ["Support", "Recurring"],
      priority: "low",
    },
    {
      id: "4",
      name: "Cloud Infrastructure",
      company: "PT. Teknologi Nusantara",
      value: 200000000,
      stage: "negotiation",
      probability: 80,
      leadScore: 92,
      needs: ["Cloud Migration", "Security", "DevOps"],
      decisionMaker: "Dr. Linda Wijaya",
      decisionMakerRole: "CTO",
      contactPhone: "+62 821-5678-9012",
      contactEmail: "linda.wijaya@teknusantara.com",
      expectedClose: "20 Feb 2024",
      lastActivity: "1 hour ago",
      owner: "Alice Johnson",
      tags: ["Enterprise", "Cloud", "Hot"],
      priority: "high",
    },
    {
      id: "5",
      name: "Digital Marketing Tools",
      company: "PT. Media Digital",
      value: 65000000,
      stage: "lead",
      probability: 25,
      leadScore: 45,
      needs: ["Marketing Automation", "Analytics"],
      decisionMaker: "Rina Kusuma",
      decisionMakerRole: "Marketing Head",
      contactPhone: "+62 822-6789-0123",
      contactEmail: "rina@mediadigital.com",
      expectedClose: "15 Mar 2024",
      lastActivity: "5 days ago",
      owner: "John Doe",
      tags: ["Marketing", "SaaS"],
      priority: "medium",
    },
    {
      id: "6",
      name: "E-commerce Platform",
      company: "CV. Belanja Online",
      value: 120000000,
      stage: "proposal",
      probability: 55,
      leadScore: 68,
      needs: ["E-commerce", "Payment Gateway", "Shipping"],
      decisionMaker: "Hendra Wijaya",
      decisionMakerRole: "CEO",
      contactPhone: "+62 823-7890-1234",
      contactEmail: "hendra@belanjaonline.com",
      expectedClose: "25 Feb 2024",
      lastActivity: "12 hours ago",
      owner: "Jane Smith",
      tags: ["E-commerce", "B2C"],
      priority: "high",
    },
    {
      id: "7",
      name: "HR Management System",
      company: "PT. Sumber Daya",
      value: 95000000,
      stage: "closing",
      probability: 90,
      leadScore: 88,
      needs: ["HRIS", "Payroll", "Attendance"],
      decisionMaker: "Dewi Lestari",
      decisionMakerRole: "HR Director",
      contactPhone: "+62 824-8901-2345",
      contactEmail: "dewi@sumberdaya.com",
      expectedClose: "18 Feb 2024",
      lastActivity: "30 min ago",
      owner: "Bob Wilson",
      tags: ["HR", "Enterprise", "Almost Done"],
      priority: "high",
    },
    {
      id: "8",
      name: "Mobile App Development",
      company: "Startup Tech",
      value: 45000000,
      stage: "qualified",
      probability: 45,
      leadScore: 62,
      needs: ["iOS App", "Android App"],
      decisionMaker: "Arief Rahman",
      decisionMakerRole: "Founder",
      contactPhone: "+62 825-9012-3456",
      contactEmail: "arief@startuptech.id",
      expectedClose: "5 Mar 2024",
      lastActivity: "2 days ago",
      owner: "Alice Johnson",
      tags: ["Startup", "Mobile"],
      priority: "medium",
    },
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter deals by search query
  const filteredDeals = deals.filter((deal) => {
    const query = searchQuery.toLowerCase();
    return (
      deal.name.toLowerCase().includes(query) ||
      deal.company.toLowerCase().includes(query) ||
      deal.decisionMaker.toLowerCase().includes(query) ||
      deal.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Calculate stats
  const activeDeals = filteredDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const totalValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = activeDeals.reduce(
    (sum, deal) => sum + (deal.value * deal.probability) / 100,
    0
  );
  const averageDealSize = activeDeals.length > 0 ? totalValue / activeDeals.length : 0;
  const wonDeals = filteredDeals.filter((d) => d.stage === "won").length;

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) return;

    // If dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Find the deal being moved
    const dealToMove = deals.find((d) => d.id === draggableId);
    if (!dealToMove) return;

    // Update the deal's stage
    const updatedDeals = deals.map((deal) => {
      if (deal.id === draggableId) {
        return { ...deal, stage: destination.droppableId };
      }
      return deal;
    });

    // Update state
    setDeals(updatedDeals);

    // In real app, this would be an API call
    console.log("Deal moved:", {
      dealId: draggableId,
      dealName: dealToMove.name,
      from: source.droppableId,
      to: destination.droppableId,
    });
  };

  // Handle card click to open detail modal
  const handleCardClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDeal(null);
  };

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                notation: "compact",
                compactDisplay: "short"
              }).format(totalValue)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {activeDeals.length} deals aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Weighted Pipeline</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                notation: "compact",
                compactDisplay: "short"
              }).format(weightedValue)}
            </div>
            <p className="text-[10px] text-muted-foreground">Berdasarkan probability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Rata-rata Deal</CardTitle>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">{new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
              notation: "compact",
              compactDisplay: "short"
            }).format(averageDealSize)}</div>
            <p className="text-[10px] text-muted-foreground">Per deal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Deals Won</CardTitle>
            <Award className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-green-600">{wonDeals}</div>
            <p className="text-[10px] text-muted-foreground">Berhasil ditutup</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari berdasarkan nama deal, company, atau tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filter
        </Button>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Deal Baru
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const stageDeals = filteredDeals.filter((deal) => deal.stage === stage.id);
              const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);

              return (
                <Card key={stage.id} className="w-72 flex-shrink-0">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{stage.icon}</span>
                        <div>
                          <CardTitle className="text-xs font-semibold">
                            {stage.name}
                          </CardTitle>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stageDeals.length} deals
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={`${stage.color} text-white hover:${stage.color} text-[10px] h-5`}
                        variant="default"
                      >
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                          notation: "compact",
                          compactDisplay: "short"
                        }).format(stageValue)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`transition-colors ${
                            snapshot.isDraggingOver ? "bg-primary/5" : ""
                          }`}
                        >
                          <ScrollArea className="h-[calc(100vh-24rem)] px-3">
                            <div className="space-y-3 pb-4 pt-2">
                              {stageDeals.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p className="text-sm">Tidak ada deals</p>
                                </div>
                              ) : (
                                stageDeals.map((deal, index) => (
                                  <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`transition-shadow ${
                                          snapshot.isDragging ? "shadow-lg" : ""
                                        }`}
                                      >
                                        <DealCard deal={deal} onCardClick={handleCardClick} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* AI Insights Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex items-start gap-2 p-2 bg-card rounded-lg border">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-medium">High Priority Follow-up</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                3 deals dengan lead score tinggi belum ada activity dalam 2 hari terakhir.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-card rounded-lg border">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-medium">Bottleneck Alert</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Stage "Proposal" memiliki conversion rate rendah (45%).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-card rounded-lg border">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-medium">Revenue Forecast</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Estimated revenue: <span className="font-semibold text-foreground">{formatCurrency(weightedValue)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal Detail Modal */}
      <DealDetailModal deal={selectedDeal} open={modalOpen} onClose={handleCloseModal} />
    </div>
  );
};
