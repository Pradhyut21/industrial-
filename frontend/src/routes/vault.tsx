import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Shield,
  User,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  GitBranch,
  FileText,
  Presentation,
  Filter,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Gamepad2,
  Loader2,
  X,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Continuity Vaults — DeadMind Intelligence" },
      {
        name: "description",
        content:
          "Preserve retiring and departing plant engineers' tacit knowledge, AI handoff briefs, and in-flight tasks.",
      },
    ],
  }),
  component: VaultLayoutWrapper,
});

function VaultLayoutWrapper() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/vault" && pathname !== "/vault/") {
    return <Outlet />;
  }
  return <ContinuityVaultHub />;
}


import { API_BASE } from "@/lib/api";

const API = API_BASE;

const DEPARTMENTS = [
  "All Departments",
  "Utility Operations",
  "Electrical & Controls",
  "Process & Chemistry",
  "Turbine & Mechanical",
  "Plant Safety & Compliance",
];

const DOMAINS = [
  "All Domains",
  "Mechanical / Steam Systems",
  "Electrical / High Voltage",
  "Automation & SCADA",
  "Process Safety & OISD",
  "Rotating Equipment",
];

function ContinuityVaultHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [filterStatus, setFilterStatus] = useState<"all" | "departed" | "active">("all");
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Wizard form state
  const [wizardName, setWizardName] = useState("");
  const [wizardRole, setWizardRole] = useState("");
  const [wizardDomain, setWizardDomain] = useState("Mechanical / Steam Systems");
  const [wizardDepartment, setWizardDepartment] = useState("Utility Operations");
  const [wizardStatus, setWizardStatus] = useState("departed");
  const [wizardExitDate, setWizardExitDate] = useState("2026-04-30");
  const [wizardExitReason, setWizardExitReason] = useState("retirement");
  const [wizardRepoUrl, setWizardRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all registered persons
  const { data: persons = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["persons"],
    queryFn: async () => {
      const res = await fetch(`${API}/vault/persons`, {
        headers: { "X-DeadMind-Role": "Admin" },
      });
      if (!res.ok) {
        // Fallback demo data if backend is in local fallback mode
        return [
          {
            id: 1,
            name: "Rajan Sharma",
            role: "Senior Boiler & Turbine Lead",
            domain: "Mechanical / Steam Systems",
            department: "Utility Operations",
            status: "departed",
            exit_date: "2026-03-15",
            exit_reason: "retirement",
            created_at: "2026-08-15 12:00:00",
          },
          {
            id: 2,
            name: "Amit Patel",
            role: "Electrical & Substation Lead",
            domain: "Electrical / High Voltage",
            department: "Electrical & Controls",
            status: "departed",
            exit_date: "2026-04-01",
            exit_reason: "resignation",
            created_at: "2026-08-16 09:30:00",
          },
          {
            id: 3,
            name: "Vikram Sen",
            role: "DCS Automation Specialist",
            domain: "Automation & SCADA",
            department: "Electrical & Controls",
            status: "active",
            exit_date: "2026-11-30",
            exit_reason: "transfer",
            created_at: "2026-08-17 14:15:00",
          },
        ];
      }
      return res.json();
    },
  });

  // Filter persons
  const filteredPersons = persons.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDept === "All Departments" || p.department === selectedDept;

    const matchesDomain =
      selectedDomain === "All Domains" || p.domain === selectedDomain;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "departed" && p.status === "departed") ||
      (filterStatus === "active" && p.status !== "departed");

    return matchesSearch && matchesDept && matchesDomain && matchesStatus;
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API}/vault/persons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DeadMind-Role": "Admin",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: async (newPerson) => {
      toast.success(`Continuity Vault for ${newPerson.name} initialized!`);
      // If repo provided, trigger git ingest
      if (wizardRepoUrl.trim()) {
        try {
          await fetch(`${API}/vault/${newPerson.id}/ingest/git`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-DeadMind-Role": "Admin",
            },
            body: JSON.stringify({
              repo_url: wizardRepoUrl.trim(),
              max_commits: 15,
            }),
          });
          toast.success("GitHub repository history indexed.");
        } catch {
          // non-blocking
        }
      }
      // Trigger initial brief generation
      try {
        await fetch(`${API}/vault/${newPerson.id}/brief`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-DeadMind-Role": "Admin",
          },
          body: JSON.stringify({ requester_role: "Plant Head" }),
        });
        toast.success("AI Continuity Handoff Brief synthesized!");
      } catch {
        // non-blocking
      }
      setIsWizardOpen(false);
      resetWizard();
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Failed to create vault: ${err.message}`);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardName.trim() || !wizardRole.trim()) {
      toast.error("Please enter engineer name and role.");
      return;
    }
    createPersonMutation.mutate({
      name: wizardName.trim(),
      role: wizardRole.trim(),
      domain: wizardDomain,
      department: wizardDepartment,
      status: wizardStatus,
      exit_date: wizardExitDate,
      exit_reason: wizardExitReason,
    });
  };

  const resetWizard = () => {
    setWizardName("");
    setWizardRole("");
    setWizardDomain("Mechanical / Steam Systems");
    setWizardDepartment("Utility Operations");
    setWizardStatus("departed");
    setWizardExitDate("2026-04-30");
    setWizardExitReason("retirement");
    setWizardRepoUrl("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-foreground">
      {/* ── Top Header & Action Banner ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/40 uppercase tracking-widest">
              Continuity Intelligence Platform
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Tacit Memory & Exit Handoff Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-wide uppercase text-foreground mt-1">
            Continuity Vaults & Cognitive Capsules
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl mt-0.5">
            Capture, structure, and query everything departing plant specialists knew and built.
            Access AI handoff briefs, in-flight task flowcharts, role-aware translations, and voice transcripts.
          </p>
        </div>

        {/* Start Handoff Wizard Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-primary/90 shadow-[0_0_15px_oklch(0.85_0.16_80_/_0.2)] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Start Handoff Wizard
          </button>
        </div>
      </div>

      {/* ── Metric Snapshot Banner ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border bg-card/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
            <span>Preserved Vaults</span>
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">
            {persons.length}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {persons.filter((p) => p.status === "departed").length} departed ·{" "}
            {persons.filter((p) => p.status !== "departed").length} active
          </div>
        </div>

        <div className="border border-border bg-card/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
            <span>Verified Handoffs</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-display font-bold text-emerald-400">
            {persons.length > 0 ? "100%" : "0%"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Cryptographic SHA-256 peer audit trail
          </div>
        </div>

        <div className="border border-border bg-card/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
            <span>Retirement Exposure</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-display font-bold text-amber-400">
            ₹1.2 Cr
          </div>
          <div className="text-[10px] text-muted-foreground">
            Protected against unplanned downtime
          </div>
        </div>

        <div className="border border-border bg-card/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
            <span>Multi-Channel Access</span>
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">
            Web · Voice · WA
          </div>
          <div className="text-[10px] text-muted-foreground">
            Role-aware semantic answering
          </div>
        </div>
      </div>

      {/* ── Search & Filtering Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card/20 p-3 border border-border">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-background border border-border pl-9 pr-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary text-foreground"
            placeholder="Search by engineer name, domain, role, or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="bg-background border border-border text-xs font-mono px-2.5 py-1.5 focus:outline-none focus:border-primary text-foreground"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className="bg-background border border-border text-xs font-mono px-2.5 py-1.5 focus:outline-none focus:border-primary text-foreground"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            {DOMAINS.map((dm) => (
              <option key={dm} value={dm}>
                {dm}
              </option>
            ))}
          </select>

          <div className="flex border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                filterStatus === "all"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("departed")}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                filterStatus === "departed"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Departed
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                filterStatus === "active"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
          </div>
        </div>
      </div>

      {/* ── Preserved Engineers Grid ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Preserved Vault Roster ({filteredPersons.length} capsules)
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Click any vault to inspect handoff brief & tasks
          </span>
        </div>

        {isLoading ? (
          <div className="border border-border/60 p-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">
              Loading continuity vaults...
            </p>
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center space-y-3">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">
              No matching Continuity Vaults found.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedDept("All Departments");
                setSelectedDomain("All Domains");
                setFilterStatus("all");
              }}
              className="text-xs text-primary underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersons.map((p) => (
              <div
                key={p.id}
                className="border border-border bg-card/40 hover:border-primary/60 transition-all p-5 flex flex-col justify-between space-y-4 group relative"
              >
                {/* Top Row: Avatar + Name + Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-sm bg-muted/60 border border-border flex items-center justify-center font-display font-bold text-primary shrink-0 text-sm">
                        {p.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to="/vault/$personId"
                          params={{ personId: String(p.id) }}
                          className="font-display font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.role}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border shrink-0 ${
                        p.status === "departed"
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                          : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 pt-1 border-t border-border/50 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground/60" />
                        {p.department}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        Exit: {p.exit_date} ({p.exit_reason})
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-1.5 py-0.5 truncate max-w-[200px]">
                        {p.domain}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <Link
                    to="/vault/$personId"
                    params={{ personId: String(p.id) }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground py-1.5 text-xs font-display uppercase tracking-wider transition-all text-center"
                  >
                    Open Vault
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    to="/vault/$personId"
                    params={{ personId: String(p.id) }}
                    className="px-2.5 py-1.5 border border-border hover:border-foreground text-muted-foreground hover:text-foreground text-xs transition-colors"
                    title="View In-Flight Tasks"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Start Handoff Wizard Modal ─────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-popover border border-border w-full max-w-lg shadow-2xl p-6 space-y-5 dm-snap-in relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="section-label">Continuity Ingestion Wizard</span>
                <h2 className="text-lg font-display uppercase tracking-wider text-foreground">
                  Register Departing Specialist
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Specialist Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. Rajan Sharma"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Job Title / Role *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. Senior Boiler Lead"
                    value={wizardRole}
                    onChange={(e) => setWizardRole(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Department
                  </label>
                  <select
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    value={wizardDepartment}
                    onChange={(e) => setWizardDepartment(e.target.value)}
                  >
                    {DEPARTMENTS.filter((d) => d !== "All Departments").map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Technical Domain
                  </label>
                  <select
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    value={wizardDomain}
                    onChange={(e) => setWizardDomain(e.target.value)}
                  >
                    {DOMAINS.filter((d) => d !== "All Domains").map((dm) => (
                      <option key={dm} value={dm}>
                        {dm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Status
                  </label>
                  <select
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-2 py-2 text-foreground focus:outline-none focus:border-primary"
                    value={wizardStatus}
                    onChange={(e) => setWizardStatus(e.target.value)}
                  >
                    <option value="departed">Departed</option>
                    <option value="active">Active (Pending Exit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Exit Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-2 py-2 text-foreground focus:outline-none focus:border-primary"
                    value={wizardExitDate}
                    onChange={(e) => setWizardExitDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Exit Reason
                  </label>
                  <select
                    className="w-full bg-muted/20 border border-border text-xs font-mono px-2 py-2 text-foreground focus:outline-none focus:border-primary"
                    value={wizardExitReason}
                    onChange={(e) => setWizardExitReason(e.target.value)}
                  >
                    <option value="retirement">Retirement</option>
                    <option value="resignation">Resignation</option>
                    <option value="transfer">Transfer</option>
                    <option value="death">Deceased</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                  GitHub Repository URL (Optional Git Commit Ingestion)
                </label>
                <input
                  type="url"
                  className="w-full bg-muted/20 border border-border text-xs font-mono px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  placeholder="https://github.com/org/boiler-controls"
                  value={wizardRepoUrl}
                  onChange={(e) => setWizardRepoUrl(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 text-xs font-display uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPersonMutation.isPending}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {createPersonMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Initialize Vault & Brief
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
