import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  GitCommit,
  Presentation,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Lock,
  Eye,
  Send,
  Loader2,
  ChevronLeft,
  Upload,
  Phone,
  MessageSquare,
  RefreshCw,
  BookOpen,
  User,
  ArrowRight,
  ListTodo,
  ExternalLink,
  PlayCircle,
  Search,
  GitPullRequest,
  AlertCircle,
  Plus,
  X,
  Layers,
  ArrowUpRight,
  CheckCircle,
  Calendar,
  Gamepad2,
} from "lucide-react";
import { ThinkingDots, FlagPulse, SparkleEffect } from "@/components/fx/dm-animations";

export const Route = createFileRoute("/vault/$personId")({
  component: VaultDetailPage,
});

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `http://${window.location.hostname}:8000`
    : "");

const ROLES = [
  "Admin",
  "Field Technician",
  "Finance",
  "Plant Head",
  "QHS Manager",
  "Reliability Engineer",
];

function UrgencyBadge({ status, days }: { status?: string; days?: number | null }) {
  if (status === "overdue") {
    return (
      <FlagPulse>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-rose-500/50 bg-rose-500/10 text-rose-400 rounded-sm dm-blocked-pulse">
          <AlertCircle className="h-2.5 w-2.5" />
          Overdue ({Math.abs(days ?? 0)}d ago)
        </span>
      </FlagPulse>
    );
  }
  if (status === "at_risk") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-amber-400/50 bg-amber-400/10 text-amber-300 rounded-sm">
        <Clock className="h-2.5 w-2.5" />
        At Risk {days !== null && days !== undefined && `(${days}d left)`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 rounded-sm">
      <CheckCircle2 className="h-2.5 w-2.5" />
      On Track {days !== null && days !== undefined && `(${days}d)`}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
    in_progress: "border-primary/50 text-primary bg-primary/10",
    blocked: "border-rose-500/50 text-rose-400 bg-rose-500/10",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest border rounded-sm ${
        map[status] ?? "border-border text-muted-foreground"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function FlowchartVisualizer({ mermaidSource }: { mermaidSource: string }) {
  // Parse lines to extract node relationships for visual rendering
  const lines = mermaidSource.split("\n").filter((l) => l.includes("-->") || l.includes("---"));
  const parsedNodes: { from: string; to: string; label?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/([A-Za-z0-9_]+)(\[.*?\])?\s*-->(\|.*?\|)?\s*([A-Za-z0-9_]+)(\[.*?\])?/);
    if (match) {
      const fromLabel = match[2] ? match[2].slice(1, -1) : match[1];
      const edgeLabel = match[3] ? match[3].slice(1, -1) : undefined;
      const toLabel = match[5] ? match[5].slice(1, -1) : match[4];
      parsedNodes.push({ from: fromLabel, to: toLabel, label: edgeLabel });
    }
  }

  return (
    <div className="space-y-3 bg-popover/40 border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <div className="section-label text-primary flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Planned vs. Completed Flowchart
        </div>
        <span className="text-[9px] font-mono text-muted-foreground uppercase">
          Mermaid Architecture Flow
        </span>
      </div>

      {parsedNodes.length > 0 ? (
        <div className="space-y-2 py-1">
          {parsedNodes.map((node, i) => {
            const isDone = node.label?.toLowerCase().includes("done");
            const isCurrent = node.label?.toLowerCase().includes("current") || node.label?.includes("%");
            const isBlocked = node.label?.toLowerCase().includes("block");

            return (
              <div key={i} className="flex items-center gap-2 text-xs font-mono">
                <div
                  className={`px-3 py-1.5 border rounded-sm flex-1 truncate ${
                    isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : isCurrent
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-[0_0_15px_oklch(0.85_0.16_80_/_0.15)]"
                      : "border-border bg-card/60 text-foreground/80"
                  }`}
                >
                  {node.from}
                </div>

                <div className="flex items-center gap-1 shrink-0 px-1 text-[10px] text-muted-foreground">
                  <ArrowRight className="h-3 w-3 text-primary/70" />
                  {node.label && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${
                        isDone
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isCurrent
                          ? "bg-primary/20 text-primary font-bold"
                          : isBlocked
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {node.label}
                    </span>
                  )}
                </div>

                <div
                  className={`px-3 py-1.5 border rounded-sm flex-1 truncate ${
                    isBlocked
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {node.to}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <pre className="p-3 bg-muted/30 border border-border/40 text-[11px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
          {mermaidSource}
        </pre>
      )}
    </div>
  );
}

function TaskExplainerModal({
  personId,
  taskId,
  role,
  onClose,
}: {
  personId: string;
  taskId: number;
  role: string;
  onClose: () => void;
}) {
  const { data: explainData, isLoading, error, refetch } = useQuery({
    queryKey: ["task-explain", personId, taskId, role],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/tasks/${taskId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-DeadMind-Role": role },
        body: JSON.stringify({ requester_role: role }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl border border-primary/40 bg-card shadow-[0_0_60px_oklch(0.85_0.16_80_/_0.2)] my-8 relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-popover/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                Task-Level Handoff Explainer
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">·</span>
              <span className="text-[10px] font-mono text-foreground/70">Role: {role}</span>
            </div>
            <h2 className="font-display text-base uppercase tracking-wider text-foreground mt-0.5">
              {explainData?.title ?? "Loading Task Plan..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-mono">Generating role-adapted handoff explanation...</p>
            </div>
          )}

          {error && (
            <div className="p-4 border border-destructive/40 bg-destructive/10 text-xs text-destructive">
              Failed to generate task explanation: {(error as Error).message}
            </div>
          )}

          {explainData && (
            <>
              {/* Task Meta Bar */}
              <div className="flex items-center gap-3 flex-wrap border border-border bg-popover/30 p-3 text-xs font-mono">
                <TaskStatusBadge status={explainData.status} />
                <UrgencyBadge status={explainData.urgency_status} days={explainData.days_remaining} />
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] text-muted-foreground uppercase">Progress:</span>
                  <span className="text-primary font-bold">{explainData.percent_complete}%</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${explainData.percent_complete}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Flowchart Breakdown */}
              {explainData.flowchart_mermaid && (
                <FlowchartVisualizer mermaidSource={explainData.flowchart_mermaid} />
              )}

              {/* Role-Aware Gap Explanation */}
              <div className="border border-primary/30 bg-primary/5 p-5 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="section-label text-primary flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Gap & Handover Analysis ({role} View)
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    Role-Adapted by DeadMind
                  </span>
                </div>
                <div className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                  {explainData.gap_explanation}
                </div>
              </div>

              {/* Cross-Domain Dependencies */}
              {explainData.dependencies?.length > 0 && (
                <div className="border border-border bg-card/40 p-4 space-y-3">
                  <div className="section-label flex items-center gap-1.5">
                    <GitPullRequest className="h-3.5 w-3.5 text-amber-400" />
                    Cross-Domain Dependencies & Blockers ({explainData.dependencies.length})
                  </div>
                  <div className="grid gap-2">
                    {explainData.dependencies.map((dep: any, i: number) => (
                      <div
                        key={i}
                        className="border border-border/60 bg-popover/40 p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded ${
                                dep.relationship === "blocks"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {dep.relationship === "blocks" ? "Blocks Downstream" : "Blocked By"}
                            </span>
                            <span className="font-bold text-foreground">{dep.team}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({dep.domain})
                            </span>
                          </div>
                          {dep.note && (
                            <p className="text-[11px] text-foreground/70 mt-1 font-mono">{dep.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Resources */}
              {explainData.learning_resources?.length > 0 && (
                <div className="border border-border bg-card/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="section-label flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Suggested Learning Resources & Technical Primers
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      Auto-curated search links
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {explainData.learning_resources.map((res: any, i: number) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group border border-border/70 bg-popover/60 hover:border-primary/60 hover:bg-popover transition-all p-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="flex items-center gap-1 text-[10px] font-mono text-primary uppercase font-medium">
                              {res.type === "youtube" ? (
                                <PlayCircle className="h-3 w-3 text-rose-400" />
                              ) : (
                                <Search className="h-3 w-3 text-blue-400" />
                              )}
                              {res.type === "youtube" ? "YouTube Tutorial" : "Web Manual"}
                            </span>
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {res.topic}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {res.description}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono text-primary/70 mt-2 flex items-center gap-1 group-hover:underline">
                          Open search query ↗
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-popover/40 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">
            DeadMind Task Continuity Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-primary text-primary-foreground px-4 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-primary/90 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({
  personId,
  onClose,
  onCreated,
}: {
  personId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    project_name: "",
    description: "",
    status: "in_progress",
    percent_complete: 25,
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const r = await fetch(`${API}/vault/${personId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-DeadMind-Role": "Admin" },
        body: JSON.stringify({
          title: form.title,
          project_name: form.project_name || "General Plant Operations",
          description: form.description,
          status: form.status,
          percent_complete: Number(form.percent_complete),
          deadline: form.deadline || undefined,
          dependencies: [
            {
              domain: "Operations",
              team: "Shift Operations Lead",
              relationship: "blocks",
              note: "Handoff review pending",
            },
          ],
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      onCreated();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-primary/40 bg-card p-6 shadow-[0_0_50px_oklch(0.85_0.16_80_/_0.15)] relative space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-display text-sm uppercase tracking-wider text-primary">
              Register In-Flight Task
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              Add a handover task with dependencies and deadline
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="section-label block mb-1">Task Title</label>
            <input
              required
              className="w-full bg-popover border border-border text-foreground px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
              placeholder="e.g. B-101 Feedwater Positioner Calibration"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Project Name</label>
              <input
                className="w-full bg-popover border border-border text-foreground px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
                placeholder="Boiler Reliability Phase 2"
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              />
            </div>
            <div>
              <label className="section-label block mb-1">Status</label>
              <select
                className="w-full bg-popover border border-border text-foreground px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Progress: {form.percent_complete}%</label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-primary"
                value={form.percent_complete}
                onChange={(e) => setForm({ ...form, percent_complete: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="section-label block mb-1">Target Deadline</label>
              <input
                type="date"
                className="w-full bg-popover border border-border text-foreground px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="section-label block mb-1">Description & Handover Notes</label>
            <textarea
              rows={3}
              className="w-full bg-popover border border-border text-foreground px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary resize-none"
              placeholder="Detail what was completed, open blockers, and key parameters..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground/70 px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-accent/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating..." : "Save Task Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VaultDetailPage() {
  const { personId } = Route.useParams();
  const [role, setRole] = useState("Admin");
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"brief" | "tasks" | "artifacts" | "query" | "calls">("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const queryClient = useQueryClient();

  const headers = { "X-DeadMind-Role": role };

  const { data: person } = useQuery({
    queryKey: ["person", personId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/persons`, { headers });
      const persons = await r.json();
      return persons.find((p: any) => String(p.id) === personId) ?? null;
    },
  });

  const { data: brief, isLoading: briefLoading, refetch: refetchBrief } = useQuery({
    queryKey: ["brief", personId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/brief`, { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("Failed to load brief");
      return r.json();
    },
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", personId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/tasks`, { headers });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: freshness } = useQuery({
    queryKey: ["freshness", personId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/freshness`, { headers });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const { data: callSessions = [] } = useQuery({
    queryKey: ["calls", personId],
    queryFn: async () => {
      const r = await fetch(`${API}/call-sessions`, { headers });
      if (!r.ok) return [];
      const all = await r.json();
      return all.filter((s: any) => String(s.person_id) === personId);
    },
  });

  const generateBriefMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ requester_role: role }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      refetchBrief();
      queryClient.invalidateQueries({ queryKey: ["freshness", personId] });
    },
  });

  async function handleVerify() {
    setVerifying(true);
    try {
      await fetch(`${API}/vault/${personId}/brief/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ verifier_name: `${role} (via UI)` }),
      });
      refetchBrief();
    } finally {
      setVerifying(false);
    }
  }

  async function handleQuery() {
    if (!query.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const r = await fetch(`${API}/vault/${personId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-DeadMind-Role": role },
        body: JSON.stringify({ query, requester_role: role }),
      });
      setQueryResult(await r.json());
    } catch (e: any) {
      setQueryResult({ answer: `Error: ${e.message}`, citations: [] });
    }
    setQueryLoading(false);
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("sensitivity_level", "department-restricted");
    const endpoint = uploadFile.name.endsWith(".pptx")
      ? `/vault/${personId}/ingest/pptx`
      : `/vault/${personId}/ingest/doc`;
    try {
      const r = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers,
        body: fd,
      });
      const d = await r.json();
      setUploadMsg(d.plain_language_summary || "Ingested successfully.");
      setUploadFile(null);
    } catch (e: any) {
      setUploadMsg(`Error: ${e.message}`);
    }
    setUploading(false);
  }

  if (!person && !briefLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground text-sm">Person not found.</p>
        <Link to="/vault" className="text-primary text-xs hover:underline mt-2 inline-block">
          ← Back to Vaults
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/vault"
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-mono uppercase tracking-widest transition-colors"
        >
          <ChevronLeft className="h-3 w-3" /> Vaults
        </Link>
        <div className="flex-1 min-w-0">
          <div className="section-label mb-1">Continuity Vault</div>
          <h1 className="font-display text-xl uppercase tracking-[0.15em] text-foreground truncate">
            {person?.name ?? `Vault #${personId}`}
          </h1>
          {person && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {person.role} · {person.department} · Exited{" "}
              {person.exit_date} ({person.exit_reason})
            </p>
          )}
        </div>
        {/* Role selector — the key demo moment */}
        <div className="shrink-0">
          <label className="section-label block mb-1 text-right">Viewing as</label>
          <select
            className="bg-popover border border-primary/40 text-primary px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setQueryResult(null);
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Freshness Bar */}
      {freshness && (
        <div
          className={`flex items-center gap-3 px-4 py-2 border text-xs font-mono ${
            freshness.freshness_flag === "fresh"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
              : freshness.freshness_flag === "review-due"
              ? "border-amber-400/30 bg-amber-400/5 text-amber-300"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {freshness.freshness_flag === "fresh" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : freshness.freshness_flag === "review-due" ? (
            <Clock className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="uppercase tracking-widest text-[9px]">
            {freshness.freshness_flag}
          </span>
          <span className="text-[10px] opacity-80">{freshness.recommendation}</span>
          <span className="ml-auto text-[9px] opacity-60">
            {freshness.artifact_count} artifacts
          </span>
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex border-b border-border">
        {(["tasks", "brief", "artifacts", "query", "calls"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[11px] font-display uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "tasks"
              ? `In-Flight Tasks (${tasks.length})`
              : tab === "brief"
              ? "Handoff Brief"
              : tab === "artifacts"
              ? "Upload Artifacts"
              : tab === "query"
              ? "Role-Aware Query"
              : "Call Log"}
          </button>
        ))}
      </div>

      {/* ── Tab: Tasks (Task-Level Handoff Explainer) ────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4 dm-snap-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-label">Task-Level Continuity Handoff</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Explore in-flight tasks left by {person?.name ?? "this engineer"}. Pick up a task to inspect
                its planned flowchart, gap analysis, dependencies, and learning primers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-primary/90 shadow-[0_0_15px_oklch(0.85_0.16_80_/_0.2)] transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>
          </div>

          {tasksLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-mono">Loading task handoff plans...</span>
            </div>
          )}

          {!tasksLoading && tasks.length === 0 && (
            <div className="border border-dashed border-border/60 p-8 text-center space-y-2">
              <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No active in-flight tasks registered for this person.</p>
              <button
                type="button"
                onClick={() => setShowCreateTask(true)}
                className="text-xs text-primary hover:underline font-mono inline-block"
              >
                + Register first handoff task
              </button>
            </div>
          )}

          <div className="grid gap-3">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className="border border-border bg-card/60 hover:border-primary/50 transition-all p-4 space-y-3 relative group dm-float-bob-hover dm-card-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                        {task.project_name || "General"}
                      </span>
                      <TaskStatusBadge status={task.status} />
                      <UrgencyBadge status={task.urgency_status} days={task.days_remaining} />
                    </div>
                    <h3 className="font-display text-sm uppercase tracking-wide text-foreground mt-1">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="flex items-center gap-1.5 border border-primary/50 bg-primary/10 text-primary px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      Explain Handoff <ArrowRight className="h-3 w-3" />
                    </button>
                    {/* Recovery Run — launches the 3D onboarding simulation game */}
                    <Link
                      to="/game/$taskId"
                      params={{ taskId: String(task.id) }}
                      search={{ personId }}
                      className="flex items-center gap-1.5 border border-amber-400/40 bg-amber-400/10 text-amber-300 px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-amber-400/20 hover:border-amber-400/60 transition-all"
                      title="Play Recovery Run — 3D onboarding simulation"
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                      Play
                    </Link>
                  </div>
                </div>

                {/* Progress bar & dependencies summary */}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-[11px] font-mono">
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <span className="text-[10px] text-muted-foreground">Done: {task.percent_complete}%</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${task.percent_complete}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {task.deadline}
                      </span>
                    )}
                    {task.dependencies?.length > 0 && (
                      <span className="flex items-center gap-1 text-primary/80 font-bold">
                        <GitPullRequest className="h-3 w-3" />
                        {task.dependencies.length} deps
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Brief ───────────────────────────────────────────────────── */}
      {activeTab === "brief" && (
        <div className="space-y-4 dm-snap-in">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateBriefMut.mutate()}
              disabled={generateBriefMut.isPending}
              className="flex items-center gap-2 border border-primary/40 text-primary px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-primary/10 disabled:opacity-50 cursor-pointer transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${generateBriefMut.isPending ? "animate-spin" : ""}`} />
              {generateBriefMut.isPending ? <><ThinkingDots /> Generating...</> : "Regenerate Brief"}
            </button>
            {brief && brief.verification_status !== "verified" && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-2 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer transition-all"
              >
                <CheckCircle2 className="h-3 w-3" />
                {verifying ? "Verifying..." : "Mark Verified"}
              </button>
            )}
            {brief?.verification_status === "verified" && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified by {brief.verified_by}
              </span>
            )}
            {brief?.verification_status === "unverified" && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 border border-amber-400/30 bg-amber-400/10 px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                AI-generated (unverified)
              </span>
            )}
          </div>

          {briefLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!brief && !briefLoading && (
            <div className="border border-dashed border-border/50 p-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No Continuity Brief generated yet.</p>
              <button
                type="button"
                onClick={() => generateBriefMut.mutate()}
                className="mt-3 text-xs text-primary hover:underline cursor-pointer"
              >
                Generate now →
              </button>
            </div>
          )}

          {brief && (
            <div className="space-y-4 animate-fade-in">
              <div className="border border-border bg-card/40 p-4">
                <div className="section-label mb-2">Summary</div>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {brief.summary_text}
                </p>
              </div>

              {brief.unresolved_items?.length > 0 && (
                <div className="border border-amber-400/30 bg-amber-400/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="section-label text-amber-400">
                      Unresolved Items ({brief.unresolved_items.length})
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {brief.unresolved_items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="text-amber-400 font-mono shrink-0 mt-0.5">
                          [{String(i + 1).padStart(2, "0")}]
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(brief.glossary ?? {}).length > 0 && (
                <div className="border border-border bg-card/40 p-4">
                  <div className="section-label mb-3">Domain Glossary (Plain Language)</div>
                  <div className="space-y-2">
                    {Object.entries(brief.glossary).map(([term, def]) => (
                      <div
                        key={term}
                        className="grid grid-cols-[auto_1fr] gap-3 text-xs border-b border-border/30 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-mono text-primary font-medium shrink-0">
                          {term}
                        </span>
                        <span className="text-foreground/70">{def as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Upload Artifacts ─────────────────────────────────────────── */}
      {activeTab === "artifacts" && (
        <div className="space-y-4 dm-snap-in">
          <div className="border border-border bg-card/40 p-5 space-y-4">
            <div className="section-label">Upload Artifacts</div>
            <p className="text-[11px] text-muted-foreground">
              Upload .pptx presentations, .docx documents, .xlsx spreadsheets, .eml emails, or .txt log files.
              They will be indexed into the RAG pipeline and become queryable instantly.
            </p>
            <div className="space-y-3">
              <input
                type="file"
                accept=".pptx,.docx,.xlsx,.eml,.txt,.log,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border file:border-primary/40 file:text-primary file:bg-transparent file:text-xs file:font-display file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-primary/10 cursor-pointer"
              />
              {uploadFile && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {uploading ? "Uploading & indexing..." : "Upload & Index"}
              </button>
              {uploadMsg && (
                <div className="text-[11px] text-muted-foreground bg-muted/20 border border-border/40 p-3 font-mono">
                  {uploadMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Role-Aware Query ─────────────────────────────────────────── */}
      {activeTab === "query" && (
        <div className="space-y-4 dm-snap-in">
          <div className="border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
            💡 Switch the <span className="text-primary font-mono">"Viewing as"</span> role in the top-right
            to see how the same question is answered differently for{" "}
            <span className="text-foreground">Field Technician</span> vs{" "}
            <span className="text-foreground">Finance</span>.
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-popover border border-border text-foreground px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                placeholder="Ask about this person's knowledge domain..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              />
              <button
                type="button"
                onClick={handleQuery}
                disabled={queryLoading || !query.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-display uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {queryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Ask
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "What is the cold startup procedure for B-101?",
                "What are the main open items left unresolved?",
                "Who should I contact about TURBINE-04?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="text-[10px] border border-border/50 text-muted-foreground px-2 py-1 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer font-mono"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {queryResult && (
            <div className="space-y-3 animate-fade-in">
              <div className="border border-primary/30 bg-card/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                      {role} perspective
                    </span>
                  </div>
                  {queryResult.confidence > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Confidence: {queryResult.confidence}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {queryResult.answer}
                </p>
              </div>

              {queryResult.citations?.length > 0 && (
                <div className="border border-border/50 bg-card/30 p-3">
                  <div className="section-label mb-2">Sources</div>
                  <div className="space-y-1">
                    {queryResult.citations.map((c: any, i: number) => (
                      <div key={i} className="text-[10px] font-mono text-muted-foreground flex items-start gap-2">
                        <span className="text-primary shrink-0">[{i + 1}]</span>
                        <span>{c.title} — {c.author}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Call Log ─────────────────────────────────────────────────── */}
      {activeTab === "calls" && (
        <div className="space-y-3 dm-snap-in">
          <div className="section-label">Voice & WhatsApp Sessions</div>
          {callSessions.length === 0 && (
            <div className="border border-dashed border-border/50 p-6 text-center">
              <Phone className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No call sessions recorded yet.</p>
            </div>
          )}
          <div className="space-y-2">
            {callSessions.map((s: any) => (
              <div key={s.id} className="border border-border bg-card/40 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {s.channel === "voice" ? (
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    {s.channel}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{s.language}</span>
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                    {s.started_at}
                    {s.duration_seconds > 0 && ` · ${s.duration_seconds.toFixed(1)}s`}
                  </span>
                </div>
                {s.transcript && (
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Query</div>
                    <p className="text-xs text-foreground/80 font-mono bg-muted/20 p-2">{s.transcript}</p>
                  </div>
                )}
                {s.response_text && (
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Response</div>
                    <p className="text-xs text-foreground/70 font-mono bg-muted/10 p-2 line-clamp-4">
                      {s.response_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Explainer Modal */}
      {selectedTaskId !== null && (
        <TaskExplainerModal
          personId={personId}
          taskId={selectedTaskId}
          role={role}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          personId={personId}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => refetchTasks()}
        />
      )}
    </div>
  );
}
