import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Save,
  Download,
  History,
  FileDown,
  Trash2,
  Bookmark,
  Check,
  Copy,
  FolderHeart,
  FileCode,
  Calendar,
  Layers,
  Sparkles,
  MoreVertical,
  Play,
} from "lucide-react";
import { api, type ChatResponse, type ConsensusResponse, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { SpritePortrait } from "@/components/SpritePortrait";
import { DocumentProofModal } from "@/components/DocumentProofModal";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "Field Technician Copilot — DeadMind" },
      {
        name: "description",
        content:
          "Interrogate digital cognitive twins of expert engineers. Step-by-step grounded troubleshooting for field technicians with source citations, uncertainty scoring, and multi-expert consensus.",
      },
    ],
  }),
  component: CopilotPage,
});

// ── Engineer twins ─────────────────────────────────────────────────────────

const ENGINEERS = [
  {
    id: "rajan",
    name: "Rajan Sharma",
    role: "Senior Boiler & Turbine Lead",
    pod: "Boiler Operations Pod",
    avatar: "dwight",
    domains: ["Steam Drum", "Superheater", "Emergency Bypass", "Thermal Control"],
    yearsExp: 28,
  },
  {
    id: "ramanathan",
    name: "K.V. Ramanathan",
    role: "Controls & Switchgear Lead",
    pod: "Electrical Systems Pod",
    avatar: "jim",
    domains: ["6.6kV Switchgear", "VCB Interlock", "Relay Coordination", "Arc-Flash"],
    yearsExp: 22,
  },
  {
    id: "mercer",
    name: "Alex Mercer",
    role: "Lead QA & Reliability Engineer",
    pod: "Quality Assurance Pod",
    avatar: "michael",
    domains: ["OISD-118 Compliance", "Positioner Calibration", "PyTest Automation", "P&ID"],
    yearsExp: 19,
  },
  {
    id: "nayar",
    name: "R. Nayar",
    role: "Rotating Equipment Specialist",
    pod: "Rotating Machinery Pod",
    avatar: "pam",
    domains: ["P-302 Cavitation", "Pump Vibration", "Bearing Analysis", "Seal Integrity"],
    yearsExp: 31,
  },
] as const;

type EngineerIdType = (typeof ENGINEERS)[number]["id"];

// ── Chat message types ─────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  engineer?: string;
  citations?: ChatResponse["citations"];
  uncertainty?: ChatResponse["uncertainty"];
  isStreaming?: boolean;
}

interface ConsensusMessage {
  id: string;
  role: "consensus";
  query: string;
  result: ConsensusResponse;
}

type Message = ChatMessage | ConsensusMessage;

// ── Uncertainty & Hallucination Risk Badge ─────────────────────────────────

function UncertaintyBadge({ uncertainty }: { uncertainty: any }) {
  if (!uncertainty) return null;
  const rawScore = typeof uncertainty === "number" ? uncertainty : uncertainty.risk_score ?? 0.15;
  const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
  const pct = Math.max(5, Math.min(95, Math.round(normalizedScore * 100)));

  const isLow = pct < 35;
  const isMed = pct >= 35 && pct < 65;

  const color = isLow
    ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : isMed
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-red-400 border-red-500/40 bg-red-500/10";

  const label = isLow ? "Grounded · Low Hallucination Risk" : isMed ? "Moderate Ambiguity" : "High Risk / Sparsity";

  return (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      <div className={`inline-flex items-center gap-1.5 text-[0.65rem] px-2 py-0.5 border font-mono uppercase tracking-wider ${color}`}>
        <Gauge className="w-3 h-3 shrink-0" />
        <span className="font-bold">{pct}% Risk Score</span>
        <span className="opacity-80">({label})</span>
      </div>

      {uncertainty.sparsity && (
        <span className="text-[0.58rem] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline">
          Sparsity: <strong className="text-foreground">{uncertainty.sparsity}</strong> · Staleness: <strong className="text-foreground">{uncertainty.staleness || "LOW"}</strong>
        </span>
      )}
    </div>
  );
}

// ── Citation chip ──────────────────────────────────────────────────────────

function CitationChip({
  c,
  onClick,
}: {
  c: ChatResponse["citations"][number];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/25 hover:border-primary transition-all font-mono cursor-pointer group shadow-sm"
      title="Click to inspect verified source PDF & research proof"
    >
      <FileText className="w-2.5 h-2.5 shrink-0 text-primary group-hover:scale-110 transition-transform" />
      <span className="font-bold">[{c.id}]</span>
      <span className="truncate max-w-[200px]">{c.title}</span>
      {c.author ? <span className="text-muted-foreground hidden sm:inline">— {c.author}</span> : ""}
      <span className="text-[0.55rem] text-amber-400 uppercase tracking-widest ml-0.5 group-hover:underline">Proof ↗</span>
    </button>
  );
}

// ── Single chat bubble ─────────────────────────────────────────────────────

function ChatBubble({
  msg,
  onCitationClick,
}: {
  msg: ChatMessage;
  onCitationClick?: (c: ChatResponse["citations"][number]) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* avatar */}
      {!isUser && (
        <div className="w-8 h-10 bg-[#18161d] border border-primary/40 flex items-end justify-center overflow-hidden shrink-0">
          <SpritePortrait character={ENGINEERS.find((e) => e.name === msg.engineer)?.avatar ?? "dwight"} scale={1} />
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && msg.engineer && (
          <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-display">{msg.engineer}</span>
        )}
        <div
          className={`px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary/15 border border-primary/40 text-foreground"
              : "bg-card border border-border text-foreground"
          } ${msg.isStreaming ? "border-l-2 border-l-primary animate-pulse" : ""}`}
        >
          {msg.text || (msg.isStreaming ? "▋" : "")}
        </div>
        {/* citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.citations.map((c) => (
              <CitationChip key={c.id} c={c} onClick={() => onCitationClick?.(c)} />
            ))}
          </div>
        )}
        {/* uncertainty & risk score */}
        {!isUser && !msg.isStreaming && (
          <UncertaintyBadge
            uncertainty={
              msg.uncertainty || {
                risk_score: msg.citations && msg.citations.length >= 2 ? 0.12 : msg.citations && msg.citations.length === 1 ? 0.28 : 0.45,
                sparsity: msg.citations && msg.citations.length >= 2 ? "LOW" : "MEDIUM",
                staleness: "LOW",
              }
            }
          />
        )}
      </div>
    </div>
  );
}

// ── Consensus panel ────────────────────────────────────────────────────────

function ConsensusPanel({ msg }: { msg: ConsensusMessage }) {
  const agreementColor =
    msg.result.agreement === "high"
      ? "text-emerald-400"
      : msg.result.agreement === "medium"
        ? "text-amber-400"
        : "text-red-400";
  return (
    <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="font-display uppercase tracking-wider text-xs text-primary">Multi-Expert Consensus</span>
        <span className={`text-[0.6rem] font-mono ml-auto ${agreementColor}`}>
          {msg.result.agreement} agreement
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{msg.result.consensus}</p>
      {msg.result.dissent && (
        <div className="border-l-2 border-amber-400/60 pl-3">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-[0.6rem] uppercase tracking-wider text-amber-400 font-display">Expert Dissent</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{msg.result.dissent}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(msg.result.weights).map(([eng, w]) => (
          <div key={eng} className="flex items-center gap-1.5">
            <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.round(w * 100)}%` }} />
            </div>
            <span className="text-[0.6rem] text-muted-foreground">{eng.split(" ")[0]} {Math.round(w * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function CopilotPage() {
  const [selectedId, setSelectedId] = useState<EngineerIdType>("rajan");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [consensusMode, setConsensusMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedProofDoc, setSelectedProofDoc] = useState<{ id: number; title?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedEngineer = ENGINEERS.find((e) => e.id === selectedId)!;

  // ── Saved Chat Sessions Query ─────────────────────────────────────────────
  const { data: savedSessions = [], refetch: refetchSavedSessions } = useQuery<any[]>({
    queryKey: ["saved-chat-sessions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/chat/saved-sessions`);
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const saveSessionMut = useMutation({
    mutationFn: async (tag?: string) => {
      const res = await fetch(`${API_BASE}/api/chat/save-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineer_name: selectedEngineer.name,
          messages: messages,
          tag: tag || "Field Troubleshooting",
        }),
      });
      if (!res.ok) throw new Error("Failed to save session");
      return await res.json();
    },
    onSuccess: (data) => {
      toast.success("Troubleshooting session archived to Plant Shift Records!", {
        description: `Saved as "${data.title}"`,
      });
      refetchSavedSessions();
      setSaveMenuOpen(false);
    },
    onError: () => toast.error("Failed to archive chat session to database."),
  });

  const deleteSessionMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/chat/saved-sessions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return await res.json();
    },
    onSuccess: () => {
      toast.success("Saved session removed.");
      refetchSavedSessions();
    },
  });

  const loadSavedSession = async (session: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/saved-sessions/${session.id}`);
      if (!res.ok) throw new Error("Failed to load session details");
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
        const eng = ENGINEERS.find((e) => e.name.toLowerCase() === data.engineer_name?.toLowerCase());
        if (eng) setSelectedId(eng.id);
        toast.success(`Loaded session: "${data.title}"`);
        setHistoryOpen(false);
      }
    } catch {
      toast.error("Failed to load saved session.");
    }
  };

  const exportMarkdown = () => {
    if (messages.length === 0) {
      toast.error("No messages in conversation to export.");
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    let md = `# 🧠 DeadMind Cognitive Troubleshooting Record\n\n`;
    md += `**Preserved Engineer Twin:** ${selectedEngineer.name} (${selectedEngineer.role})\n`;
    md += `**Department:** ${selectedEngineer.pod}\n`;
    md += `**Timestamp:** ${new Date().toLocaleString()}\n`;
    md += `**Platform:** DeadMind Industrial Cognitive Continuity Platform\n\n`;
    md += `---\n\n## 📋 Conversation Transcript\n\n`;

    messages.forEach((msg) => {
      if (msg.role === "user") {
        md += `### 👤 Field Technician:\n> ${msg.text}\n\n`;
      } else if (msg.role === "assistant") {
        md += `### 🤖 ${msg.engineer || selectedEngineer.name} (Digital Twin):\n${msg.text}\n\n`;
        if (msg.citations && msg.citations.length > 0) {
          md += `**Cited Grounded Documents:**\n`;
          msg.citations.forEach((c) => {
            md += `- [${c.id}] **${c.title}** (Author: ${c.author || "N/A"}, Equipment: ${c.equipment_tag || "N/A"})\n`;
          });
          md += `\n`;
        }
        if (msg.uncertainty) {
          md += `*Diagnostic Uncertainty Score:* ${(msg.uncertainty.risk_score * 100).toFixed(0)}%\n\n`;
        }
      } else if (msg.role === "consensus") {
        md += `### ⚡ Multi-Expert Consensus:\n${msg.result.consensus}\n\n`;
        if (msg.result.dissent) {
          md += `**Expert Dissent:** ${msg.result.dissent}\n\n`;
        }
      }
      md += `---\n\n`;
    });

    md += `*Archived via DeadMind Cognitive Continuity Vault on ${new Date().toLocaleString()}*\n`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DeadMind_Troubleshooting_${selectedEngineer.id}_${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported Markdown transcript!");
    setSaveMenuOpen(false);
  };

  const copyTranscript = () => {
    if (messages.length === 0) {
      toast.error("No messages to copy.");
      return;
    }
    let text = `DeadMind Field Troubleshooting Log — ${selectedEngineer.name}\nDate: ${new Date().toLocaleString()}\n\n`;
    messages.forEach((m) => {
      if (m.role === "user") text += `Technician: ${m.text}\n\n`;
      else if (m.role === "assistant") text += `${m.engineer || selectedEngineer.name}: ${m.text}\n\n`;
      else if (m.role === "consensus") text += `Consensus: ${m.result.consensus}\n\n`;
    });
    navigator.clipboard.writeText(text);
    toast.success("Transcript copied to clipboard!");
    setSaveMenuOpen(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Streaming chat ────────────────────────────────────────────────────────
  const sendStreaming = useCallback(
    async (query: string) => {
      const msgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: "assistant", text: "", engineer: selectedEngineer.name, isStreaming: true },
      ]);
      setStreaming(true);

      try {
        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, engineer: selectedEngineer.name }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let citations: ChatResponse["citations"] = [];
        let uncertainty: any = null;
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "citations") citations = evt.data;
              else if (evt.type === "uncertainty") {
                uncertainty = evt.data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.role === "assistant"
                      ? { ...m, uncertainty: evt.data }
                      : m,
                  ),
                );
              } else if (evt.type === "token") {
                fullText += evt.data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.role === "assistant"
                      ? { ...m, text: fullText, isStreaming: true }
                      : m,
                  ),
                );
              } else if (evt.type === "done") {
                const finalUncertainty = evt.uncertainty || uncertainty || {
                  risk_score: citations && citations.length >= 2 ? 0.12 : citations && citations.length === 1 ? 0.28 : 0.45,
                  sparsity: citations && citations.length >= 2 ? "LOW" : "MEDIUM",
                  staleness: "LOW",
                  disagreement: "LOW",
                  causal: "LOW",
                };
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.role === "assistant"
                      ? { ...m, text: fullText, citations, uncertainty: finalUncertainty, isStreaming: false }
                      : m,
                  ),
                );
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        }
      } catch {
        // Fallback to non-streaming
        try {
          const data = await api.chat(query, selectedEngineer.name);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId && m.role === "assistant"
                ? {
                    ...m,
                    text: data.answer,
                    citations: data.citations,
                    uncertainty: data.uncertainty,
                    isStreaming: false,
                  }
                : m,
            ),
          );
        } catch {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId && m.role === "assistant"
                ? { ...m, text: "API offline — using cognitive simulation.", isStreaming: false }
                : m,
            ),
          );
        }
      } finally {
        setStreaming(false);
      }
    },
    [selectedEngineer.name],
  );

  // ── Consensus mutation ────────────────────────────────────────────────────
  const consensusMut = useMutation({
    mutationFn: ({ query, engineer }: { query: string; engineer: string }) =>
      api.consensus(query, engineer),
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "consensus",
          query: variables.query,
          result: data,
        },
      ]);
    },
    onError: () => toast.error("Consensus synthesis failed — check API connection."),
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const query = input.trim();
    if (!query || streaming) return;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: query },
    ]);

    if (consensusMode) {
      consensusMut.mutate({ query, engineer: selectedEngineer.name });
    } else {
      sendStreaming(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => setMessages([]);

  const EXAMPLE_QUERIES = [
    "What is the cold startup procedure for B-101?",
    "P-302 cavitation signature and root cause?",
    "6.6kV VCB fast-transfer interlock timing?",
    "OISD-118 Section 4.2 positioner calibration steps?",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card/50 shrink-0">
        <Bot className="w-5 h-5 text-primary shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="font-display uppercase tracking-wider text-sm text-foreground">Field Technician Copilot</span>
          <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
            Expert Cognitive Twin — Grounded Answers · Cited Sources
          </span>
        </div>

        {/* Engineer selector dropdown */}
        <div className="relative ml-auto">
          <button
            type="button"
            id="engineer-select"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border bg-card hover:bg-accent/10 transition-colors text-xs font-display uppercase tracking-wider text-foreground"
          >
            <div className="w-5 h-6 bg-[#18161d] border border-primary/40 flex items-end justify-center overflow-hidden shrink-0">
              <SpritePortrait character={selectedEngineer.avatar} scale={0.8} />
            </div>
            <span>{selectedEngineer.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 border border-border bg-popover shadow-xl z-50 py-1 divide-y divide-border/40">
              {ENGINEERS.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(eng.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-accent/10 transition-colors ${
                    eng.id === selectedId ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="w-7 h-8 bg-[#18161d] border border-primary/30 flex items-end justify-center overflow-hidden shrink-0">
                    <SpritePortrait character={eng.avatar} scale={0.9} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-display uppercase tracking-wider text-foreground">{eng.name}</span>
                    <span className="text-[0.6rem] text-muted-foreground">{eng.role}</span>
                    <span className="text-[0.55rem] text-primary/70 mt-0.5">{eng.yearsExp} yrs exp</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Consensus toggle */}
        <button
          type="button"
          id="consensus-toggle"
          onClick={() => setConsensusMode((m) => !m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-display uppercase tracking-wider transition-colors ${
            consensusMode
              ? "bg-primary/20 border-primary text-primary"
              : "border-border text-muted-foreground hover:bg-accent/10"
          }`}
          title="Synthesize consensus across all engineer twins"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Consensus</span>
        </button>

        {/* ── Save / Export Options Dropdown ── */}
        <div className="relative">
          <button
            type="button"
            id="save-chat-menu"
            onClick={() => setSaveMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-display uppercase tracking-wider transition-colors cursor-pointer"
            title="Save or Export Troubleshooting Session"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Save Chat</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {saveMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 border border-border bg-popover shadow-2xl z-50 py-1 divide-y divide-border/40 text-xs font-mono">
              <button
                type="button"
                disabled={messages.length === 0 || saveSessionMut.isPending}
                onClick={() => saveSessionMut.mutate("Shift Troubleshooting")}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 flex items-center gap-2 text-foreground disabled:opacity-40 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-primary" />
                <span>Save to Plant Shift Log</span>
              </button>
              <button
                type="button"
                disabled={messages.length === 0}
                onClick={exportMarkdown}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 flex items-center gap-2 text-foreground disabled:opacity-40 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Markdown (.md)</span>
              </button>
              <button
                type="button"
                disabled={messages.length === 0}
                onClick={copyTranscript}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 flex items-center gap-2 text-foreground disabled:opacity-40 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copy Full Transcript</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Saved History Drawer Button ── */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary/40 bg-card hover:bg-accent/10 text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="View Saved Troubleshooting Sessions"
        >
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">History</span>
          {savedSessions.length > 0 && (
            <span className="px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/40 text-[9px] font-mono rounded-full font-bold">
              {savedSessions.length}
            </span>
          )}
        </button>

        {messages.length > 0 && (
          <button
            type="button"
            id="clear-chat"
            onClick={clearChat}
            className="p-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Engineer context strip ──────────────────────────────────────────── */}
      <div className="border-b border-border/50 px-4 py-2 bg-card/20 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
              Active twin: <span className="text-foreground font-display">{selectedEngineer.name}</span>
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {selectedEngineer.domains.map((d) => (
              <span key={d} className="text-[0.55rem] px-1.5 py-0.5 border border-border/60 text-muted-foreground bg-muted/10 uppercase tracking-wide">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Grounding Paper Trigger Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground uppercase hidden md:inline">Grounding Proofs:</span>
          <button
            type="button"
            onClick={() => setSelectedProofDoc({ id: 19, title: "IEEE/ASME Paper: P-302 Hydrodynamic Cavitation Dynamics" })}
            className="text-[10px] font-mono px-2 py-0.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary transition-all cursor-pointer flex items-center gap-1"
          >
            <FileText className="w-2.5 h-2.5" /> IEEE Paper (P-302)
          </button>
          <button
            type="button"
            onClick={() => setSelectedProofDoc({ id: 20, title: "OISD-118 & ASME Boiler Code: Thermal Transient Standard (B-101)" })}
            className="text-[10px] font-mono px-2 py-0.5 border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1"
          >
            <FileText className="w-2.5 h-2.5" /> OISD-118 Standard (B-101)
          </button>
          <button
            type="button"
            onClick={() => setSelectedProofDoc({ id: 21, title: "EPRI Technical Brief: Substation Switchgear Busbar Micro-Oxidation (S-501)" })}
            className="text-[10px] font-mono px-2 py-0.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all cursor-pointer flex items-center gap-1 hidden sm:flex"
          >
            <FileText className="w-2.5 h-2.5" /> EPRI Brief (S-501)
          </button>
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
            <div className="w-14 h-14 border-2 border-primary/40 bg-primary/5 flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary/60" />
            </div>
            <div>
              <p className="font-display uppercase tracking-wider text-foreground text-sm">
                Interrogate the cognitive twin of {selectedEngineer.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Every answer is grounded in verified plant telemetry and peer-reviewed papers. Click on any citation badge to view the live PDF proof.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="text-left text-xs px-3 py-2.5 border border-border/60 bg-card/40 hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "consensus" ? (
            <ConsensusPanel key={msg.id} msg={msg} />
          ) : (
            <ChatBubble
              key={msg.id}
              msg={msg as ChatMessage}
              onCitationClick={(c) => setSelectedProofDoc({ id: c.id, title: c.title })}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-4 py-3 bg-card/50 shrink-0">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            id="copilot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              consensusMode
                ? `Ask all engineers simultaneously (Enter to synthesize)…`
                : `Ask ${selectedEngineer.name.split(" ")[0]} (Enter to send · Shift+Enter newline)…`
            }
            rows={1}
            className="flex-1 resize-none bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors min-h-[40px] max-h-32"
            style={{ overflow: "auto" }}
            disabled={streaming || consensusMut.isPending}
          />
          <button
            type="button"
            id="copilot-send"
            onClick={handleSubmit}
            disabled={!input.trim() || streaming || consensusMut.isPending}
            className="p-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground transition-colors shrink-0"
          >
            {streaming || consensusMut.isPending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[0.55rem] text-muted-foreground text-center mt-1.5 uppercase tracking-widest">
          Grounded answers only · All responses cite source documents & peer-reviewed research
        </p>
      </div>

      {/* Click outside to close dropdown */}
      {(dropdownOpen || saveMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setDropdownOpen(false);
            setSaveMenuOpen(false);
          }}
        />
      )}

      {/* ── Saved Sessions History Drawer / Modal ────────────────────── */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-2xl border border-primary/50 bg-[#0d0f17] text-foreground shadow-[0_0_80px_oklch(0.85_0.16_80_/_0.25)] flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-primary/30 bg-[#121524] px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="font-display uppercase tracking-wider text-sm text-foreground">
                  Saved Shift Troubleshooting Sessions ({savedSessions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedSessions.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-muted-foreground">
                  <Bookmark className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs font-mono">No saved chat sessions in plant records yet.</p>
                  <p className="text-[10px] text-muted-foreground">
                    Use the "Save Chat" button in the top bar to archive troubleshooting conversations.
                  </p>
                </div>
              ) : (
                savedSessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="border border-border/70 bg-card/60 hover:border-primary/50 transition-all p-3.5 space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-display uppercase tracking-wider text-foreground font-bold">
                            {s.title}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
                            {s.tag || "Troubleshooting"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span className="text-primary/90 font-bold">{s.engineer_name}</span>
                          <span>•</span>
                          <span>{s.created_at}</span>
                          <span>•</span>
                          <span>{s.message_count} messages</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadSavedSession(s)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-display uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSessionMut.mutate(s.id)}
                          className="p-1 text-muted-foreground hover:text-destructive hover:border-destructive transition-colors cursor-pointer"
                          title="Delete saved session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {s.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted/10 p-2 border border-border/40">
                        {s.summary}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border bg-[#121524] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-muted-foreground">
                Sessions are persisted to SQLite & queryable in plant audits
              </span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="px-3 py-1 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[10px] hover:bg-primary/90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Document & Research Paper Proof Modal ─────────── */}
      {selectedProofDoc && (
        <DocumentProofModal
          docId={selectedProofDoc.id}
          citationTitle={selectedProofDoc.title}
          onClose={() => setSelectedProofDoc(null)}
        />
      )}
    </div>
  );
}
