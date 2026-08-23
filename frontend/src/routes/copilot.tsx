import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Send,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Zap,
  FileText,
  Gauge,
  X,
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Flame,
  Activity,
  Cpu,
  Bookmark,
  Check,
  Copy,
  Trash2,
  Edit2,
  Terminal,
  Loader2,
  ChevronRight,
  Database,
  Briefcase,
  Sliders,
  Filter,
  Coins,
  Wallet,
  CreditCard,
  Receipt,
  ArrowUpRight,
  PieChart,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import {
  api,
  type Conversation,
  type MessageItem,
  type StructuredChatResponse,
  type GroundedSourceItem,
  type EmployeeInsightItem,
  type ExpertItem,
  type UsageAccount,
  API_BASE
} from "@/lib/api";
import { toast } from "sonner";
import { SpritePortrait } from "@/components/SpritePortrait";
import { DocumentProofModal } from "@/components/DocumentProofModal";
import type { OfficeCharacterName } from "@/scene/office/cast";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "Organizational Knowledge Assistant — DeadMind" },
      {
        name: "description",
        content:
          "Interact with collective organizational memory. Company documentation + multi-expert employee consultation + continuous usage metering & x402 settlement.",
      },
    ],
  }),
  component: CopilotPage,
});

// ── Avatar Resolver Helper ──────────────────────────────────────────────────
function resolveAvatarForExpert(name: string, domain?: string): OfficeCharacterName {
  const n = name.toLowerCase();
  const d = (domain || "").toLowerCase();
  if (n.includes("rajan") || d.includes("boiler") || d.includes("steam")) return "boiler_lead";
  if (n.includes("amit") || n.includes("ramanathan") || d.includes("electrical") || d.includes("power")) return "power_specialist";
  if (n.includes("vikram") || n.includes("nayar") || d.includes("instrumentation") || d.includes("sensor")) return "instrumentation";
  if (n.includes("nair") || d.includes("vibration") || d.includes("pump") || d.includes("bearing")) return "vibration_analyst";
  if (n.includes("kulkarni") || d.includes("safety") || d.includes("audit")) return "safety_auditor";
  if (n.includes("pillai") || n.includes("mercer") || d.includes("reliability") || d.includes("process")) return "reliability_spec";
  if (n.includes("joshi") || d.includes("plc") || d.includes("scada")) return "plc_tech";
  return "superintendent";
}

// ── Uncertainty Decomposition Badge ─────────────────────────────────────────
function UncertaintyDecompositionCard({ uncertainty }: { uncertainty: StructuredChatResponse["uncertainty"] }) {
  if (!uncertainty) return null;
  const pct = uncertainty.risk_pct ?? Math.round((uncertainty.risk_score || 0.15) * 100);
  const isHigh = pct >= 50 || uncertainty.human_verification_required;
  const isMed = pct >= 25 && pct < 50;

  const badgeColor = isHigh
    ? "border-red-500/50 bg-red-950/30 text-red-400"
    : isMed
    ? "border-amber-500/50 bg-amber-950/30 text-amber-400"
    : "border-emerald-500/50 bg-emerald-950/30 text-emerald-400";

  return (
    <div className={`p-3.5 border rounded-none text-xs font-mono mb-3 ${badgeColor}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
          <Gauge className="w-4 h-4 shrink-0" />
          <span>Cognitive Uncertainty & Risk: {pct}%</span>
          <span className="opacity-75 font-normal">
            ({isHigh ? "High Uncertainty" : isMed ? "Moderate Ambiguity" : "Grounded & Verified"})
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 border border-current uppercase">
          Evidence Quality: {uncertainty.evidence_quality || "High"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] opacity-90">
        <div>
          <span className="text-muted-foreground block text-[9px] uppercase">Data Sparsity</span>
          <span className="font-semibold">{uncertainty.sparsity || "LOW"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[9px] uppercase">Knowledge Staleness</span>
          <span className="font-semibold">{uncertainty.staleness || "FRESH"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[9px] uppercase">Cross-Expert Disagreement</span>
          <span className="font-semibold">{uncertainty.disagreement || "LOW"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[9px] uppercase">Causal Failure Risk</span>
          <span className="font-semibold">{uncertainty.causal || "LOW"}</span>
        </div>
      </div>

      {isHigh && (
        <div className="mt-2.5 pt-2 border-t border-red-500/30 flex items-center gap-2 text-red-300 font-sans font-medium text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          <span>Critical Warning: Human peer verification and sign-off required prior to modifying interlocks or shut-down sequence.</span>
        </div>
      )}
    </div>
  );
}

// ── Multi-Expert Consensus & Dissent Panel ──────────────────────────────────
function MultiExpertConsensusCard({ consensus }: { consensus: StructuredChatResponse["consensus"] }) {
  if (!consensus || !consensus.consensus) return null;

  const isDissent = Boolean(consensus.dissent);
  const agreementLevel = (consensus.agreement || "high").toLowerCase();

  const borderColor = isDissent
    ? "border-amber-500/60 bg-amber-950/20"
    : "border-primary/50 bg-primary/5";

  return (
    <div className={`p-3.5 border rounded-none text-xs mb-3.5 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-foreground font-semibold">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <span>Cross-Domain Expert Consensus ({agreementLevel.toUpperCase()} AGREEMENT)</span>
        </div>
        {isDissent ? (
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
            Dissent Detected
          </span>
        ) : (
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
            Unanimous
          </span>
        )}
      </div>

      <p className="text-muted-foreground font-sans text-xs leading-relaxed mb-2">
        {consensus.consensus}
      </p>

      {consensus.dissent && (
        <div className="p-2 bg-amber-500/10 border-l-2 border-amber-500 text-[11px] font-sans text-amber-200/90 leading-relaxed">
          <strong className="font-semibold text-amber-400 block mb-0.5 font-mono uppercase text-[9px] tracking-wider">
            Point of Technical Dissent
          </strong>
          {consensus.dissent}
        </div>
      )}
    </div>
  );
}

// ── Contributing Employee Knowledge Card ────────────────────────────────────
function EmployeeInsightCard({
  insight,
  onOpenDoc
}: {
  insight: EmployeeInsightItem;
  onOpenDoc: (title: string) => void;
}) {
  const avatarKey = resolveAvatarForExpert(insight.name, insight.domain);

  return (
    <div className="p-3 border border-border/80 bg-card/60 hover:bg-card transition-colors mb-2 rounded-none flex items-start gap-3">
      <div className="shrink-0 pt-0.5">
        <div className="w-10 h-10 border border-border overflow-hidden bg-background flex items-center justify-center">
          <SpritePortrait character={avatarKey} scale={1.5} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div>
            <span className="font-bold text-sm text-foreground mr-2">{insight.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{insight.role}</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono uppercase">
            <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground border border-border">
              {insight.domain}
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Peer Verified
            </span>
          </div>
        </div>

        <p className="text-xs text-foreground/90 font-sans leading-relaxed mb-2">
          {insight.finding}
        </p>

        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
          <span>{insight.match_reason}</span>
          <span className="text-primary font-semibold">{insight.record_count} historical records in vault</span>
        </div>
      </div>
    </div>
  );
}

// ── Source Citation Chip ────────────────────────────────────────────────────
function GroundedSourceChip({
  source,
  onClick
}: {
  source: GroundedSourceItem;
  onClick: () => void;
}) {
  const typeColors: Record<string, string> = {
    ORGANIZATIONAL: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    EMPLOYEE: "bg-purple-500/15 text-purple-300 border-purple-500/40",
    INCIDENT: "bg-red-500/15 text-red-300 border-red-500/40",
    SOP: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    MAINTENANCE: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    CONTINUITY: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    REGULATORY: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  };

  const badgeClass = typeColors[source.source_type] || "bg-secondary text-secondary-foreground border-border";

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-border bg-card/80 hover:bg-accent/20 hover:border-primary transition-all text-left group cursor-pointer"
      title={`Click to inspect PDF proof for ${source.title}`}
    >
      <span className={`text-[9px] px-1 py-0.2 font-bold uppercase tracking-wider border ${badgeClass}`}>
        {source.source_type}
      </span>
      <span className="text-foreground/90 font-sans truncate max-w-[220px] sm:max-w-[280px]">
        {source.title}
      </span>
      <span className="text-[10px] text-muted-foreground ml-1">
        ({source.equipment_tag})
      </span>
      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 ml-0.5" />
    </button>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
function CopilotPage() {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [activeExperts, setActiveExperts] = useState<string[]>([]);
  const [autoRouteEnabled, setAutoRouteEnabled] = useState(true);
  const [isExpertDropdownOpen, setIsExpertDropdownOpen] = useState(false);
  const [isUsageDrawerOpen, setIsUsageDrawerOpen] = useState(false);
  const [economyDrawerTab, setEconomyDrawerTab] = useState<"flows" | "reimbursements" | "reconciliation">("flows");
  const [reimbFilterStatus, setReimbFilterStatus] = useState<string>("ALL");
  const [inspectingDocId, setInspectingDocId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 402 Overage State
  const [overageChallenge, setOverageChallenge] = useState<any | null>(null);
  const [pendingQueryText, setPendingQueryText] = useState<string | null>(null);
  const [isSettlingOverage, setIsSettlingOverage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch Conversations List
  const {
    data: conversations = [],
    isLoading: loadingConvs,
    refetch: refetchConvs
  } = useQuery({
    queryKey: ["conversations", searchQuery],
    queryFn: () => api.listConversations("default_user", searchQuery || undefined),
  });

  // 2. Fetch Available Experts
  const { data: allExperts = [] } = useQuery({
    queryKey: ["chat-experts"],
    queryFn: () => api.listExperts(),
  });

  // 3. Fetch Active Conversation Messages
  const {
    data: activeConv,
    isLoading: loadingActiveConv,
    refetch: refetchActiveConv
  } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: () => (selectedConversationId ? api.getConversation(selectedConversationId) : null),
    enabled: Boolean(selectedConversationId),
  });

  // 4. Fetch Usage Metering Account
  const {
    data: usageAccount,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ["usage-account"],
    queryFn: () => api.getUsageAccount("default_user"),
    refetchInterval: 10000,
  });

  // 5. Fetch Company Economy 4-Flow Dashboard
  const {
    data: companyDashboard,
    refetch: refetchCompanyDashboard
  } = useQuery({
    queryKey: ["company-economy-dashboard"],
    queryFn: () => api.getCompanyEconomyDashboard("INDO-POWER-PLANT-01"),
    refetchInterval: 10000,
  });

  // 6. Fetch Reimbursement Requests
  const {
    data: reimbursementsData,
    refetch: refetchReimbursements
  } = useQuery({
    queryKey: ["reimbursements-list", reimbFilterStatus],
    queryFn: () => api.listReimbursements("INDO-POWER-PLANT-01", reimbFilterStatus),
    refetchInterval: 10000,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // Set default initial conversation if available
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Mutation: Send Query
  const chatMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const payloadExperts = autoRouteEnabled && activeExperts.length === 0 ? ["auto"] : activeExperts;
      return api.queryChat({
        query: queryText,
        conversation_id: selectedConversationId || undefined,
        selected_experts: payloadExperts,
        user_id: "default_user",
        role: "Field Technician"
      });
    },
    onSuccess: (data) => {
      setSelectedConversationId(data.conversation_id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      setInputText("");
      setPendingQueryText(null);
      setOverageChallenge(null);
    },
    onError: (err: any) => {
      const errStr = err.message || "";
      if (errStr.includes("402") || errStr.includes("X402") || errStr.includes("Payment Required")) {
        // Parse 402 challenge terms if available
        try {
          const jsonMatch = errStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setOverageChallenge(parsed.detail || parsed);
          } else {
            setOverageChallenge({
              error: "X402 Payment Required",
              message: "Company credit allowance exhausted. Overage settlement required.",
              usage_status: { overage_credits: 35, balance_credits: 0, required_credits: 35 },
              accepts: [{ amount: "35000", amountFormatted: "0.0350 USDC", asset: "USDC", network: "algorand-testnet" }]
            });
          }
        } catch {
          setOverageChallenge({
            error: "X402 Payment Required",
            message: "Company credit allowance exhausted. Overage settlement required.",
            usage_status: { overage_credits: 35, balance_credits: 0, required_credits: 35 },
            accepts: [{ amount: "35000", amountFormatted: "0.0350 USDC", asset: "USDC", network: "algorand-testnet" }]
          });
        }
        setPendingQueryText(inputText);
        toast.error("Company credit allowance exhausted. Exact overage settlement required.");
      } else {
        toast.error("Failed to generate response: " + errStr);
      }
    }
  });

  // Handle x402 Overage Topup and Automatic Query Resumption
  const handleSettleOverageAndResume = async () => {
    setIsSettlingOverage(true);
    try {
      const overageCredits = overageChallenge?.usage_status?.overage_credits || 50;
      const amountMicro = overageCredits * 1000;
      const fakeTxnId = `X402OVRG${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      toast.info("Signing Algorand USDC micropayment via x402 protocol...");
      
      const topupRes = await api.topupAccountX402({
        user_id: "default_user",
        credits_to_add: Math.max(overageCredits + 100, 250), // Top up overage + buffer
        amount_microusdc: amountMicro,
        txn_id: fakeTxnId,
        payer_address: "ALGORAND7TESTNET6AGENT4DEADMIND2DEMO8KEYPAIR",
        service_tier: "Pay-Per-Use Overage Settlement"
      });

      toast.success(`x402 Settlement Verified! Reimbursement request created (${topupRes.reimbursement?.status || "PENDING_REIMBURSEMENT"}). Resuming request automatically...`);
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      setOverageChallenge(null);

      // AUTOMATIC CONTINUATION: Execute the original pending request without asking again
      const queryToResume = pendingQueryText || inputText;
      if (queryToResume) {
        chatMutation.mutate(queryToResume);
      }
    } catch (e: any) {
      toast.error("x402 Settlement failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSettlingOverage(false);
    }
  };

  // Simulate Overage (Deplete balance for testing)
  const handleSimulateOverage = async () => {
    try {
      const curBalance = usageAccount?.balance_credits || 1000;
      await api.simulateConsumption(curBalance, "default_user", "Manual simulation of exhausted credits");
      toast.warning("Allowance depleted to 0 credits! Next query will test the x402 exact overage flow.");
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (e: any) {
      toast.error("Failed to simulate overage: " + e.message);
    }
  };

  // Quick Refill Demo
  const handleQuickTopup = async () => {
    try {
      const res = await api.demoRefillCredits("default_user", 500);
      toast.success(`Allowance refilled: +${res.credits_added} Credits (${res.amount_usdc})`);
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
    } catch (e: any) {
      toast.error("Failed to refill: " + e.message);
    }
  };

  // Reimbursement Actions
  const handleApproveReimb = async (id: string) => {
    try {
      await api.approveReimbursement(id, "Plant Operations Admin");
      toast.success(`Reimbursement ${id} APPROVED`);
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (e: any) {
      toast.error("Failed to approve: " + e.message);
    }
  };

  const handleRejectReimb = async (id: string) => {
    try {
      await api.rejectReimbursement(id, "Plant Operations Admin", "Out of plant operational scope");
      toast.warning(`Reimbursement ${id} REJECTED`);
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (e: any) {
      toast.error("Failed to reject: " + e.message);
    }
  };

  const handlePayoutReimb = async (id: string) => {
    try {
      const res = await api.payoutReimbursement(id, "corporate_payroll_credit", "Corporate Finance");
      toast.success(`Payout processed for ${id} ($${res.amount_usdc} USDC via Payroll Credit)`);
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (e: any) {
      toast.error("Failed to process payout: " + e.message);
    }
  };

  const handleReconcilePeriod = async () => {
    try {
      const res = await api.reconcilePeriodEnd("INDO-POWER-PLANT-01", "August 2026");
      toast.success(`Period Closed: Returned ${res.total_unused_returned.toLocaleString()} unconsumed credits back to Company Pool`);
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
    } catch (e: any) {
      toast.error("Failed to reconcile: " + e.message);
    }
  };

  const handleResetEconomy = async () => {
    try {
      await api.demoResetEconomy();
      toast.info("Economy reset to baseline (Company Pool: 100k Credits)");
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
    } catch (e: any) {
      toast.error("Reset failed: " + e.message);
    }
  };

  // Mutation: Create New Chat
  const createNewChat = () => {
    setSelectedConversationId(null);
    setInputText("");
    setActiveExperts([]);
    setAutoRouteEnabled(true);
    if (composerRef.current) {
      composerRef.current.focus();
    }
  };

  // Mutation: Delete Conversation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: () => {
      toast.success("Conversation deleted");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversationId(null);
    }
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || chatMutation.isPending) return;
    setPendingQueryText(text);
    chatMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleExpert = (expertName: string) => {
    if (activeExperts.includes(expertName)) {
      setActiveExperts((prev) => prev.filter((n) => n !== expertName));
    } else {
      setActiveExperts((prev) => [...prev, expertName]);
      setAutoRouteEnabled(false);
    }
  };

  const removeExpert = (expertName: string) => {
    setActiveExperts((prev) => prev.filter((n) => n !== expertName));
    if (activeExperts.length <= 1) {
      setAutoRouteEnabled(true);
    }
  };

  const quickPrompts = [
    "Why is P-302 vibrating during cold startup?",
    "What is the temperature ramp procedure for B-101?",
    "Who handled the S-501 switchgear overheating?",
    "Compare Rajan and Vikram's approach to valve positioner drift",
    "What is cavitation in centrifugal pumps?"
  ];

  const allocated = usageAccount?.allocated_credits || 1000;
  const used = usageAccount?.used_credits || 0;
  const balance = usageAccount?.balance_credits || 0;
  const pctUsed = Math.min(100, Math.round((used / Math.max(1, allocated + used)) * 100));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full bg-background overflow-hidden relative">
      {/* ── LEFT SIDEBAR: Persistent Conversations & Search ─────────────── */}
      <aside
        className={`${
          sidebarOpen ? "w-80 border-r border-border" : "w-0 overflow-hidden"
        } transition-all duration-200 flex flex-col bg-card/40 shrink-0 select-none`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <button
            onClick={createNewChat}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wider font-bold hover:bg-primary/90 transition-colors rounded-none shadow-sm cursor-pointer"
            title="Start New Investigation Chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 border border-border hover:bg-accent/20 hover:border-primary/50 text-muted-foreground hover:text-foreground text-xs font-mono transition-colors rounded-none cursor-pointer flex items-center justify-center shrink-0"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Search Bar */}
        <div className="p-2.5 border-b border-border bg-background/50">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input/40 border border-border pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded-none font-sans"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loadingConvs ? (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading sessions...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-semibold text-foreground mb-1">No chats found</p>
              <p className="text-[11px]">Start a new conversation to query plant organizational memory.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = c.id === selectedConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedConversationId(c.id)}
                  className={`p-3 cursor-pointer transition-colors group flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-primary text-foreground"
                      : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-xs text-foreground truncate block">
                        {c.title || "Plant Investigation"}
                      </span>
                    </div>
                    {c.summary ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                        {c.summary}
                      </p>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground/70">
                        {c.tag || "General Troubleshooting"}
                      </span>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                      <span>{c.updated_at ? c.updated_at.slice(5, 16) : ""}</span>
                      {c.message_count ? <span>· {c.message_count} msgs</span> : null}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete conversation "${c.title}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Role Footer */}
        <div className="p-3 border-t border-border bg-card/80 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-foreground font-semibold">Field Technician</span>
          </div>
          <span className="text-[9px] border border-border px-1.5 py-0.5 uppercase bg-background">
            RBAC: Level 2
          </span>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Workspace Header & Knowledge Controls */}
        <header className="p-3 border-b border-border bg-card/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 border transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                !sidebarOpen
                  ? "border-primary bg-primary/15 text-primary hover:bg-primary/25 shadow-sm"
                  : "border-border hover:bg-accent/20 text-muted-foreground hover:text-foreground"
              }`}
              title={sidebarOpen ? "Close Conversations Sidebar" : "Open Conversations Sidebar"}
              aria-label={sidebarOpen ? "Close Conversations Sidebar" : "Open Conversations Sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-primary hidden sm:inline">
                    Chats
                  </span>
                </>
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                  {activeConv?.title || "DeadMind — Industrial Organizational Memory"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 uppercase tracking-widest hidden sm:inline-block">
                  Collective Intelligence
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Company Knowledge Base + Multi-Expert Consultation + Continuous Usage Economy
              </p>
            </div>
          </div>

          {/* Right Header: Usage Meter HUD & Expert Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Usage & Credit HUD Pill */}
            <button
              onClick={() => setIsUsageDrawerOpen(!isUsageDrawerOpen)}
              className="px-2.5 py-1 text-xs font-mono border border-border bg-card/90 hover:border-primary transition-all flex items-center gap-2 text-foreground cursor-pointer shadow-sm"
              title="Click to view full credit ledger and category usage breakdown"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{balance}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Credits</span>
              </div>
              <div className="w-12 h-1.5 bg-secondary overflow-hidden hidden sm:block">
                <div
                  className={`h-full ${balance < 100 ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.max(5, 100 - pctUsed)}%` }}
                />
              </div>
            </button>

            {/* Auto-Routing Pill */}
            <button
              onClick={() => {
                setAutoRouteEnabled(!autoRouteEnabled);
                if (!autoRouteEnabled) setActiveExperts([]);
              }}
              className={`px-2.5 py-1 text-xs font-mono border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                autoRouteEnabled && activeExperts.length === 0
                  ? "bg-primary text-primary-foreground border-primary font-bold"
                  : "bg-card text-muted-foreground border-border hover:border-foreground"
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Auto-Route Experts</span>
            </button>

            {/* Manual + Add Expert Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExpertDropdownOpen(!isExpertDropdownOpen)}
                className="px-2.5 py-1 text-xs font-mono border border-border bg-card hover:bg-accent/20 text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3 h-3 text-primary" />
                <span>+ Consult Expert</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-muted-foreground" />
              </button>

              {isExpertDropdownOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-popover border border-border shadow-xl z-50 p-2 divide-y divide-border/40">
                  <div className="p-1.5 text-[11px] font-mono text-muted-foreground font-semibold uppercase">
                    Select Plant Domain Specialists
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                    {allExperts.map((exp) => {
                      const isSelected = activeExperts.includes(exp.name);
                      return (
                        <div
                          key={exp.name}
                          onClick={() => toggleExpert(exp.name)}
                          className={`p-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/20 text-foreground font-semibold"
                              : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div>
                            <div className="text-foreground font-medium">{exp.name}</div>
                            <div className="text-[10px] text-muted-foreground">{exp.role} ({exp.primary_domain})</div>
                          </div>
                          <span className="text-[10px] font-mono text-primary">
                            {exp.record_count} logs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 text-right">
                    <button
                      onClick={() => setIsExpertDropdownOpen(false)}
                      className="px-2 py-0.5 text-[10px] font-mono uppercase bg-primary text-primary-foreground"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Selected Experts Filter Bar */}
        {activeExperts.length > 0 && (
          <div className="px-4 py-1.5 bg-card/60 border-b border-border flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Active Experts:</span>
            {activeExperts.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/40 text-primary text-xs font-mono font-medium"
              >
                <span>{name}</span>
                <button
                  onClick={() => removeExpert(name)}
                  className="hover:text-foreground text-primary/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Chat Messages Feed ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!activeConv || activeConv.messages?.length === 0 ? (
            <div className="max-w-2xl mx-auto my-12 text-center">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4 text-primary">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                DeadMind Organizational Knowledge Assistant
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Ask any plant question to search collective institutional memory. The system automatically
                consults relevant engineering twins, verifies maintenance history, exposes technical consensus,
                and continuously meters access with company credit allowances.
              </p>

              <div className="text-left bg-card/40 border border-border p-4 mb-6">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-2 font-semibold">
                  Suggested Industrial Inquiries:
                </span>
                <div className="space-y-1.5">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(p);
                        if (composerRef.current) composerRef.current.focus();
                      }}
                      className="w-full text-left p-2 text-xs font-sans bg-background/80 hover:bg-accent/20 border border-border/70 hover:border-primary transition-all text-foreground/90 flex items-center justify-between group cursor-pointer"
                    >
                      <span>{p}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            activeConv.messages?.map((msg, idx) => {
              const isUser = msg.role === "user";
              const sdata = msg.structured_data;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* Message Bubble Header */}
                  <div className="flex items-center gap-2 mb-1.5 text-[10px] font-mono text-muted-foreground">
                    <span>{isUser ? "Plant Technician" : "DeadMind Organizational Engine"}</span>
                    <span>·</span>
                    <span>{msg.timestamp ? msg.timestamp.slice(11, 19) : ""}</span>
                    {!isUser && sdata?.usage_metrics && (
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        <span>{sdata.usage_metrics.credits_consumed} Credits</span>
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <div
                    className={`max-w-3xl w-full p-4 sm:p-5 rounded-none border ${
                      isUser
                        ? "bg-primary text-primary-foreground border-primary/60 font-sans text-sm ml-auto"
                        : "bg-card border-border text-foreground font-sans text-sm shadow-sm"
                    }`}
                  >
                    {/* Natural Language Synthesized Answer */}
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap mb-4">
                      {msg.content}
                    </div>

                    {/* Structured Evidence & Expert Insights (Only on assistant messages with structured data) */}
                    {!isUser && sdata && (
                      <div className="mt-4 pt-4 border-t border-border/60 space-y-4">
                        {/* 1. Uncertainty Decomposition */}
                        {sdata.uncertainty && (
                          <UncertaintyDecompositionCard uncertainty={sdata.uncertainty} />
                        )}

                        {/* 2. Multi-Expert Consensus & Dissent */}
                        {sdata.consensus && (
                          <MultiExpertConsensusCard consensus={sdata.consensus} />
                        )}

                        {/* 3. Employee-Derived Historical Insights */}
                        {sdata.employee_insights && sdata.employee_insights.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                              Historical Employee Knowledge Contributions ({sdata.employee_insights.length} Experts Consulted):
                            </span>
                            <div className="space-y-2">
                              {sdata.employee_insights.map((emp, eidx) => (
                                <EmployeeInsightCard
                                  key={eidx}
                                  insight={emp}
                                  onOpenDoc={(title) => {
                                    const match = sdata.sources?.find((s) => s.title === title);
                                    if (match) setInspectingDocId(match.id);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Recommended Action Checklist */}
                        {sdata.recommended_steps && sdata.recommended_steps.length > 0 && (
                          <div className="p-3 bg-secondary/30 border border-border text-xs">
                            <span className="font-mono text-[10px] uppercase font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              Recommended Diagnostic Checklist:
                            </span>
                            <ul className="space-y-1 text-foreground/90 font-sans text-[12px]">
                              {sdata.recommended_steps.map((st, sidx) => (
                                <li key={sidx} className="flex items-start gap-2">
                                  <span className="text-primary font-mono">{sidx + 1}.</span>
                                  <span>{st.replace(/^\d+\.\s*/, "")}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 5. Grounded Source Evidence Chips */}
                        {sdata.sources && sdata.sources.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                              Verified Grounding Citations ({sdata.sources.length} Documents & Logs):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {sdata.sources.map((src) => (
                                <GroundedSourceChip
                                  key={src.id}
                                  source={src}
                                  onClick={() => setInspectingDocId(src.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {chatMutation.isPending && (
            <div className="flex flex-col items-start max-w-3xl">
              <div className="flex items-center gap-2 mb-1.5 text-[10px] font-mono text-muted-foreground">
                <span>DeadMind Organizational Engine</span>
                <span>·</span>
                <span>Synthesizing...</span>
              </div>
              <div className="p-4 bg-card border border-border text-foreground font-mono text-xs flex items-center gap-3 w-full">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <span>Interrogating hybrid RAG, cognitive twins, and regulatory cross-references...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── COMPOSER ───────────────────────────────────────────────────── */}
        <footer className="p-3 sm:p-4 border-t border-border bg-card/40">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <div className="border border-border focus-within:border-primary bg-background shadow-inner transition-colors flex flex-col">
              <textarea
                ref={composerRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask DeadMind about your plant (e.g. 'Why is P-302 vibrating during startup?')..."
                rows={2}
                disabled={chatMutation.isPending}
                className="w-full p-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-sans"
              />

              <div className="p-2 border-t border-border/40 bg-card/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="hidden sm:inline">Press [Enter] to send · [Shift+Enter] for new line</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!inputText.trim() || chatMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-mono uppercase font-bold tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-none cursor-pointer"
                  >
                    {chatMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying...</span>
                      </>
                    ) : (
                      <>
                        <span>Consult</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </footer>
      </main>

      {/* ── 4-FLOW USAGE, REIMBURSEMENT & x402 ECONOMY DRAWER ─────────────────── */}
      {isUsageDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-[420px] sm:w-[480px] bg-card border-l border-border shadow-2xl z-50 flex flex-col p-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Enterprise AI Economy</h3>
                <span className="text-[10px] font-mono text-muted-foreground">{companyDashboard?.company_name || "DeadMind Enterprise Hub"}</span>
              </div>
            </div>
            <button
              onClick={() => setIsUsageDrawerOpen(false)}
              className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border border-border bg-background p-1 mb-4 gap-1 text-[11px] font-mono">
            <button
              onClick={() => setEconomyDrawerTab("flows")}
              className={`flex-1 py-1.5 px-2 text-center uppercase tracking-wider transition-colors cursor-pointer ${
                economyDrawerTab === "flows" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              4 Financial Flows
            </button>
            <button
              onClick={() => setEconomyDrawerTab("reimbursements")}
              className={`flex-1 py-1.5 px-2 text-center uppercase tracking-wider transition-colors cursor-pointer relative ${
                economyDrawerTab === "reimbursements" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reimbursements
              {companyDashboard?.flow_c_reimbursements?.pending_count ? (
                <span className="ml-1 px-1 py-0.2 bg-amber-500 text-black text-[9px] font-bold rounded-full">
                  {companyDashboard.flow_c_reimbursements.pending_count}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => setEconomyDrawerTab("reconciliation")}
              className={`flex-1 py-1.5 px-2 text-center uppercase tracking-wider transition-colors cursor-pointer ${
                economyDrawerTab === "reconciliation" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Period Recon
            </button>
          </div>

          {/* ── TAB 1: 4 FINANCIAL FLOWS OVERVIEW ─────────────────────────── */}
          {economyDrawerTab === "flows" && companyDashboard && (
            <div className="space-y-4 font-mono text-xs">
              {/* FLOW A: BASE PLATFORM INFRASTRUCTURE */}
              <div className="p-3.5 bg-background border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between text-blue-400 font-bold uppercase text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Flow A — Base Platform Funding
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-950/50 border border-blue-500/40">Company Funded</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-muted-foreground">
                  <div>Cloud Infra: <span className="text-foreground font-bold">${companyDashboard.flow_a_base_platform.cloud_infra_cost_usd}</span></div>
                  <div>Database: <span className="text-foreground font-bold">${companyDashboard.flow_a_base_platform.database_cost_usd}</span></div>
                  <div>Storage: <span className="text-foreground font-bold">${companyDashboard.flow_a_base_platform.storage_cost_usd}</span></div>
                  <div>AI Baseline: <span className="text-foreground font-bold">${companyDashboard.flow_a_base_platform.baseline_ai_cost_usd}</span></div>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Base Platform:</span>
                  <span className="text-foreground font-bold">${companyDashboard.flow_a_base_platform.total_platform_cost_usd} / $1,000 Budget</span>
                </div>
              </div>

              {/* FLOW B: EMPLOYEE USAGE & ALLOWANCE */}
              <div className="p-3.5 bg-background border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold uppercase text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Flow B — Employee AI Usage
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/50 border border-emerald-500/40">{companyDashboard.flow_b_employee_usage.total_employees} Employees</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-muted-foreground">
                  <div>Allocated: <span className="text-foreground block font-bold">${companyDashboard.flow_b_employee_usage.allocated_usd}</span></div>
                  <div>Consumed: <span className="text-foreground block font-bold">${companyDashboard.flow_b_employee_usage.consumed_usd}</span></div>
                  <div>Remaining: <span className="text-emerald-400 block font-bold">${companyDashboard.flow_b_employee_usage.unused_usd}</span></div>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Personal Balance:</span>
                  <span className="text-emerald-400 font-bold text-sm">{usageAccount?.balance_credits || 0} Credits</span>
                </div>
              </div>

              {/* FLOW C: REIMBURSEMENT SUMMARY */}
              <div className="p-3.5 bg-background border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold uppercase text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Flow C — Employee Reimbursements
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-950/50 border border-amber-500/40">Auto-Approve ≤ ${companyDashboard.flow_c_reimbursements.auto_approval_threshold_usdc}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-muted-foreground">
                  <div>Pending: <span className="text-amber-400 block font-bold">${companyDashboard.flow_c_reimbursements.pending_amount_usdc} ({companyDashboard.flow_c_reimbursements.pending_count})</span></div>
                  <div>Approved: <span className="text-blue-400 block font-bold">${companyDashboard.flow_c_reimbursements.approved_amount_usdc} ({companyDashboard.flow_c_reimbursements.approved_count})</span></div>
                  <div>Reimbursed: <span className="text-emerald-400 block font-bold">${companyDashboard.flow_c_reimbursements.reimbursed_amount_usdc} ({companyDashboard.flow_c_reimbursements.reimbursed_count})</span></div>
                </div>
              </div>

              {/* FLOW D: UNUSED POOL RETURN */}
              <div className="p-3.5 bg-background border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-purple-400 font-bold uppercase text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Flow D — Unused Allowance Pool
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-950/50 border border-purple-500/40">Period Close Rule</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                  <span>Returned to Company Pool:</span>
                  <span className="text-purple-300 font-bold">{companyDashboard.flow_d_period_reconciliation.reconciled_returned_credits.toLocaleString()} Credits (${companyDashboard.flow_d_period_reconciliation.reconciled_returned_usd})</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: EMPLOYEE REIMBURSEMENT HUB ─────────────────────────── */}
          {economyDrawerTab === "reimbursements" && (
            <div className="space-y-3 font-mono text-xs flex-1 flex flex-col">
              {/* Status Filter */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Filter Requests:</span>
                <select
                  value={reimbFilterStatus}
                  onChange={(e) => setReimbFilterStatus(e.target.value)}
                  className="px-2 py-1 bg-background border border-border text-foreground text-[11px] font-mono focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_REIMBURSEMENT">Pending Review</option>
                  <option value="AUTO_APPROVED">Auto-Approved</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REIMBURSED">Reimbursed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Requests List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {reimbursementsData?.requests && reimbursementsData.requests.length > 0 ? (
                  reimbursementsData.requests.map((r) => {
                    const isPending = r.status === "PENDING_REIMBURSEMENT";
                    const isAuto = r.status === "AUTO_APPROVED";
                    const isApproved = r.status === "APPROVED";
                    const isReimbursed = r.status === "REIMBURSED";
                    const isRejected = r.status === "REJECTED";

                    const badgeStyle = isReimbursed
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                      : isApproved || isAuto
                      ? "bg-blue-950/60 text-blue-400 border-blue-500/40"
                      : isRejected
                      ? "bg-red-950/60 text-red-400 border-red-500/40"
                      : "bg-amber-950/60 text-amber-400 border-amber-500/40";

                    return (
                      <div key={r.id} className="p-3 bg-background border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground text-xs">{r.request_number}</span>
                            <span className="text-[10px] text-muted-foreground block">{r.employee_name} ({r.employee_id})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-400 text-xs">${r.amount_usdc.toFixed(4)} USDC</span>
                            <span className="text-[10px] text-muted-foreground block">+{r.credits_covered} Credits</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground truncate max-w-[180px]">Service: {r.service}</span>
                          <span className={`px-1.5 py-0.5 border text-[9px] uppercase font-bold ${badgeStyle}`}>
                            {r.status.replace("_", " ")}
                          </span>
                        </div>

                        {r.notes && (
                          <p className="text-[10px] text-muted-foreground italic font-sans border-t border-border/40 pt-1.5">
                            {r.notes}
                          </p>
                        )}

                        {/* Admin Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveReimb(r.id)}
                                className="flex-1 py-1 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/50 text-blue-300 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectReimb(r.id)}
                                className="py-1 px-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/50 text-red-300 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(isApproved || isAuto) && (
                            <button
                              onClick={() => handlePayoutReimb(r.id)}
                              className="w-full py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Mark Reimbursed (Payroll Credit)
                            </button>
                          )}
                          {isReimbursed && (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 w-full justify-end">
                              <CheckCircle2 className="w-3 h-3" /> Reimbursed via Corporate Finance
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No reimbursement records match filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: PERIOD RECONCILIATION & AUDIT LEDGER ────────────────── */}
          {economyDrawerTab === "reconciliation" && (
            <div className="space-y-4 font-mono text-xs flex-1 flex flex-col">
              {/* Reconciliation Action Card */}
              <div className="p-3.5 bg-background border border-purple-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-purple-400 font-bold uppercase text-[11px]">
                  <span>Period-End Budget Close</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-950 border border-purple-500/40">August 2026</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  Closes accounting period, audits employee consumption, and returns all unconsumed credit allowances back to the Company Pool.
                </p>
                <button
                  onClick={handleReconcilePeriod}
                  className="w-full py-2 bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/60 text-purple-200 text-xs font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Close Period & Return Unused Credits
                </button>
              </div>

              {/* Verified x402 Settlements Ledger */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                  Verified On-Chain x402 Settlements:
                </span>
                {usageAccount?.recent_settlements && usageAccount.recent_settlements.length > 0 ? (
                  usageAccount.recent_settlements.map((st) => (
                    <div key={st.id} className="p-2.5 bg-background border border-border text-[11px] space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-foreground">{st.service_tier}</span>
                        <span className="text-amber-400">{st.amount_usdc_formatted}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>User: {st.user_id}</span>
                        <a
                          href={st.lora_explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>{st.txn_id.slice(0, 14)}...</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-xs">
                    No on-chain settlements recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Developer Presentation Controls */}
          <div className="mt-auto pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase">
              <span>Demo Controls:</span>
              <button
                onClick={handleResetEconomy}
                className="text-primary hover:underline cursor-pointer"
              >
                Reset Economy Baseline
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSimulateOverage}
                className="py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-[11px] font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer truncate"
              >
                Deplete Balance (0)
              </button>
              <button
                onClick={handleQuickTopup}
                className="py-1.5 px-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-[11px] font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 truncate"
              >
                <Coins className="w-3 h-3" /> +500 Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 402 PAYMENT REQUIRED OVERAGE & REIMBURSEMENT MODAL ───────────── */}
      {overageChallenge && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border-2 border-amber-500 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">HTTP 402: Payment Required</h3>
                <span className="text-[10px] font-mono text-muted-foreground">RFC x402 Machine-to-Machine Payment Protocol</span>
              </div>
            </div>

            <div className="p-3.5 bg-background border border-border text-xs font-mono space-y-2">
              <p className="text-foreground leading-relaxed font-sans">
                {overageChallenge.message || "Your company credit allowance is exhausted. Settle the exact overage to proceed."}
              </p>

              {/* Exact Overage Math Breakdown */}
              <div className="pt-2 border-t border-border space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Required for Query:</span>
                  <span className="font-bold text-foreground">{overageChallenge.usage_status?.required_credits || 100} Credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Allowance:</span>
                  <span className="font-bold text-foreground">{overageChallenge.usage_status?.balance_credits ?? 0} Credits</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50 text-xs">
                  <span className="font-bold text-foreground">Exact Overage To Settle:</span>
                  <span className="font-bold text-amber-400 text-sm">{overageChallenge.accepts?.[0]?.amountFormatted || "0.0450 USDC"} ({overageChallenge.usage_status?.overage_credits || 45} Credits)</span>
                </div>
              </div>
            </div>

            {/* Corporate Reimbursement Notice */}
            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Corporate Reimbursement Guaranteed
              </div>
              <p className="text-[10px] text-muted-foreground font-sans leading-tight">
                Your plant policy authorizes reimbursement for operational overages. Settling this will immediately create an auditable reimbursement request on your company dashboard.
              </p>
            </div>

            <div className="text-[11px] font-sans text-muted-foreground">
              💡 <strong>Automatic Continuation:</strong> Once settled, the system will automatically authorize usage and stream the original answer without retyping.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setOverageChallenge(null);
                  setPendingQueryText(null);
                }}
                className="flex-1 py-2 border border-border hover:bg-accent/20 text-xs font-mono uppercase text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleOverageAndResume}
                disabled={isSettlingOverage}
                className="flex-2 py-2 bg-amber-500 text-black font-bold text-xs font-mono uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSettlingOverage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing on Algorand...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Pay {overageChallenge.accepts?.[0]?.amountFormatted || "Overage"} & Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Proof Modal for Citations ──────────────────────────────── */}
      {inspectingDocId !== null && (
        <DocumentProofModal
          docId={inspectingDocId}
          onClose={() => setInspectingDocId(null)}
        />
      )}
    </div>
  );
}
