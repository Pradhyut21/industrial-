import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
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
} from "lucide-react";
import { api, type ChatResponse, type ConsensusResponse, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { SpritePortrait } from "@/components/SpritePortrait";

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

// ── Uncertainty badge ──────────────────────────────────────────────────────

function UncertaintyBadge({ score }: { score: number }) {
  const level = score < 0.35 ? "low" : score < 0.65 ? "medium" : "high";
  const color =
    level === "low"
      ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/10"
      : level === "medium"
        ? "text-amber-400 border-amber-400/40 bg-amber-400/10"
        : "text-red-400 border-red-400/40 bg-red-400/10";
  return (
    <span className={`inline-flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 border font-mono uppercase tracking-wider ${color}`}>
      <Gauge className="w-2.5 h-2.5" />
      {Math.round(score * 100)}% uncertainty
    </span>
  );
}

// ── Citation chip ──────────────────────────────────────────────────────────

function CitationChip({ c }: { c: ChatResponse["citations"][number] }) {
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem] px-1.5 py-0.5 border border-primary/30 bg-primary/5 text-primary/80 font-mono">
      <FileText className="w-2.5 h-2.5 shrink-0" />
      [{c.id}] {c.title}
      {c.author ? ` — ${c.author}` : ""}
    </span>
  );
}

// ── Single chat bubble ─────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
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
          <div className="flex flex-wrap gap-1 mt-0.5">
            {msg.citations.map((c) => (
              <CitationChip key={c.id} c={c} />
            ))}
          </div>
        )}
        {/* uncertainty */}
        {msg.uncertainty && <UncertaintyBadge score={msg.uncertainty.risk_score} />}
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedEngineer = ENGINEERS.find((e) => e.id === selectedId)!;

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
              else if (evt.type === "token") {
                fullText += evt.data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.role === "assistant"
                      ? { ...m, text: fullText, isStreaming: true }
                      : m,
                  ),
                );
              } else if (evt.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.role === "assistant"
                      ? { ...m, text: fullText, citations, isStreaming: false }
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

        {/* Engineer selector */}
        <div className="ml-auto relative">
          <button
            type="button"
            id="engineer-selector"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border bg-background hover:bg-accent/10 text-sm transition-colors"
          >
            <div className="w-6 h-7 bg-[#18161d] border border-primary/30 flex items-end justify-center overflow-hidden">
              <SpritePortrait character={selectedEngineer.avatar} scale={0.8} />
            </div>
            <span className="font-display text-xs uppercase tracking-wider hidden sm:block">{selectedEngineer.name}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border shadow-xl z-50">
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
      <div className="border-b border-border/50 px-4 py-2 bg-card/20 shrink-0 flex items-center gap-3 flex-wrap">
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
        {consensusMode && (
          <span className="ml-auto text-[0.6rem] px-2 py-0.5 border border-primary/50 text-primary bg-primary/10 font-display uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            Multi-expert consensus active
          </span>
        )}
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-12">
            <div className="w-14 h-14 border-2 border-primary/40 bg-primary/5 flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary/60" />
            </div>
            <div>
              <p className="font-display uppercase tracking-wider text-foreground text-sm">
                Interrogate the cognitive twin of {selectedEngineer.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Every answer is grounded in verified plant logs with source citations and uncertainty scoring.
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
            <ChatBubble key={msg.id} msg={msg as ChatMessage} />
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
          Grounded answers only · All responses cite source documents
        </p>
      </div>

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
