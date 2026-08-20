import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  MessageSquare,
  Clock,
  Globe,
  Mic,
  Play,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  User,
  Send,
  X,
} from "lucide-react";
import { apiPost, apiGet, API_BASE } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "Voice & WhatsApp Call Log — DeadMind" },
      {
        name: "description",
        content:
          "Session log for all inbound voice and WhatsApp calls routed to DeadMind's multilingual expert knowledge system. Simulate calls, dispatch real Twilio outbound calls, and review transcripts.",
      },
    ],
  }),
  component: CallsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface CallLog {
  id: number;
  caller: string;
  engineer_name: string;
  role: string;
  language: string;
  duration: string;
  summary: string;
  timestamp: string;
  channel: "voice" | "whatsapp";
  status: string;
  call_sid?: string;
}

interface SimulateResponse {
  reply: string;
  engineer_name: string;
  language: string;
}

interface DispatchResponse {
  ok: boolean;
  status: string;
  call_sid: string;
  phone_number: string;
  speech_text: string;
  note: string;
}

// ── Engineer options ───────────────────────────────────────────────────────

const ENGINEER_OPTIONS = [
  { name: "Rajan Sharma",    role: "Senior Boiler Lead" },
  { name: "K.V. Ramanathan", role: "Controls & Switchgear Lead" },
  { name: "Alex Mercer",     role: "Lead QA Engineer" },
  { name: "R. Nayar",        role: "Rotating Equipment Specialist" },
];

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi (हिंदी)",
  "Kannada (ಕನ್ನಡ)",
  "Telugu (తెలుగు)",
  "Tamil (தமிழ்)",
];

// ── Channel badge ──────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const isVoice = channel === "voice";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 border font-mono uppercase tracking-wider ${
        isVoice
          ? "border-sky-400/40 bg-sky-400/10 text-sky-400"
          : "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
      }`}
    >
      {isVoice ? <Phone className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
      {channel}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isLive = status.toLowerCase().includes("live") || status.toLowerCase().includes("calling");
  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 border font-mono uppercase tracking-wider ${
        isLive
          ? "border-amber-400/40 bg-amber-400/10 text-amber-400 animate-pulse"
          : "border-border/60 bg-muted/10 text-muted-foreground"
      }`}
    >
      {isLive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {status}
    </span>
  );
}

// ── Dispatch modal ─────────────────────────────────────────────────────────

function DispatchModal({
  engineer,
  onClose,
}: {
  engineer: (typeof ENGINEER_OPTIONS)[number];
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState<DispatchResponse | null>(null);
  const queryClient = useQueryClient();

  const dispatchMut = useMutation({
    mutationFn: () =>
      apiPost<DispatchResponse>("/api/calls/dispatch", {
        phone_number: phone,
        engineer_name: engineer.name,
        language,
        role: engineer.role,
        person_id: 1,
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["callLogs"] });
      toast.success(`Outbound call dispatched to ${phone}`);
    },
    onError: (err: Error) => {
      toast.error(`Dispatch failed: ${err.message}`);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-primary" />
            <span className="font-display uppercase tracking-wider text-sm">Dispatch Real Call</span>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-display text-sm uppercase tracking-wider">Call Dispatched</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Call SID</span>
                <span className="text-foreground">{result.call_sid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{result.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-amber-400">{result.status}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">{result.note}</p>
            <p className="text-xs text-foreground border border-border/60 bg-muted/10 p-2 leading-relaxed">
              <span className="text-muted-foreground block mb-1">Speech script:</span>
              {result.speech_text}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 border border-border text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 py-2 border-b border-border/50">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs font-display uppercase tracking-wider">{engineer.name}</div>
                <div className="text-[0.6rem] text-muted-foreground">{engineer.role}</div>
              </div>
            </div>
            <div>
              <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1 block">
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                id="dispatch-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-1 block">
                Call Language
              </label>
              <select
                id="dispatch-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <p className="text-[0.6rem] text-muted-foreground border-l-2 border-amber-400/40 pl-2">
              This places a real outbound Twilio call to the number you provide. Requires TWILIO_* env vars.
              Degrades gracefully to stub response when credentials are absent.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-border text-xs font-display uppercase tracking-wider text-muted-foreground hover:bg-accent/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="dispatch-submit"
                onClick={() => dispatchMut.mutate()}
                disabled={!phone.trim() || dispatchMut.isPending}
                className="flex-1 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-display uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {dispatchMut.isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <PhoneCall className="w-3.5 h-3.5" />
                )}
                Dispatch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function CallsPage() {
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulateResult, setSimulateResult] = useState<Record<string, string>>({});
  const [dispatchTarget, setDispatchTarget] = useState<(typeof ENGINEER_OPTIONS)[number] | null>(null);
  const [simLanguage, setSimLanguage] = useState("English");

  const queryClient = useQueryClient();

  const logsQ = useQuery({
    queryKey: ["callLogs"],
    queryFn: () => apiGet<CallLog[]>("/api/calls/list"),
    refetchInterval: 10_000,
  });

  const simulateMut = useMutation({
    mutationFn: ({ engineer_name, language }: { engineer_name: string; language: string }) =>
      apiPost<SimulateResponse>("/api/calls/simulate", { engineer_name, language }),
    onSuccess: (data, variables) => {
      setSimulateResult((prev) => ({ ...prev, [variables.engineer_name]: data.reply }));
      setSimulatingId(null);
      queryClient.invalidateQueries({ queryKey: ["callLogs"] });
      toast.success(`Simulated call with ${variables.engineer_name}`);
    },
    onError: (err: Error) => {
      setSimulatingId(null);
      toast.error(`Simulation failed: ${err.message}`);
    },
  });

  const logs = logsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-5 h-5 text-primary" />
          <h1 className="font-display uppercase tracking-[0.2em] text-foreground text-sm">
            Voice & WhatsApp Call Log
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Session log for all inbound voice and WhatsApp interactions routed to the DeadMind multilingual knowledge system.
        </p>
      </div>

      {/* Simulate panel */}
      <div className="border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-4 h-4 text-primary" />
          <span className="font-display uppercase tracking-wider text-xs text-foreground">Simulate an Inbound Call</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Language:</label>
          <select
            id="sim-language"
            value={simLanguage}
            onChange={(e) => setSimLanguage(e.target.value)}
            className="bg-background border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/60"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ENGINEER_OPTIONS.map((eng) => {
            const isSim = simulatingId === eng.name;
            return (
              <div key={eng.name} className="flex flex-col gap-1">
                <button
                  type="button"
                  id={`simulate-${eng.name.replace(/\s/g, "-").toLowerCase()}`}
                  onClick={() => {
                    setSimulatingId(eng.name);
                    simulateMut.mutate({ engineer_name: eng.name, language: simLanguage });
                  }}
                  disabled={simulateMut.isPending}
                  className="flex items-center gap-2 px-3 py-2 border border-border bg-background hover:bg-accent/10 disabled:opacity-50 text-left transition-colors"
                >
                  {isSim ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-display uppercase tracking-wider truncate">{eng.name.split(" ")[0]}</div>
                    <div className="text-[0.55rem] text-muted-foreground truncate">{eng.role}</div>
                  </div>
                </button>
                {simulateResult[eng.name] && (
                  <div className="text-[0.6rem] border border-border/60 bg-muted/5 p-2 text-muted-foreground leading-relaxed">
                    {simulateResult[eng.name]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dispatch row */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50 items-center">
          <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <PhoneCall className="w-3 h-3" /> Real outbound (Twilio):
          </span>
          {ENGINEER_OPTIONS.map((eng) => (
            <button
              key={eng.name}
              type="button"
              id={`dispatch-${eng.name.replace(/\s/g, "-").toLowerCase()}`}
              onClick={() => setDispatchTarget(eng)}
              className="px-2.5 py-1 border border-primary/40 text-primary hover:bg-primary/10 text-[0.6rem] font-display uppercase tracking-wider transition-colors"
            >
              {eng.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Call log table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="font-display uppercase tracking-wider text-xs text-foreground">Session Log</span>
          </div>
          <span className="text-[0.6rem] text-muted-foreground font-mono">{logs.length} sessions recorded</span>
        </div>

        {logsQ.isLoading ? (
          <div className="text-xs text-muted-foreground py-8 text-center">Loading call sessions…</div>
        ) : logsQ.isError ? (
          <div className="flex items-center gap-2 py-8 justify-center text-destructive text-xs">
            <AlertCircle className="w-4 h-4" />
            Could not load call logs — API offline.
          </div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center border border-border/50">
            No sessions recorded yet. Simulate a call above.
          </div>
        ) : (
          <div className="space-y-px border border-border">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px_60px_80px] gap-px bg-border/30">
              {["Engineer", "Summary", "Duration", "Language", "Channel", "Status"].map((h) => (
                <div key={h} className="px-3 py-2 bg-muted/20 text-[0.55rem] uppercase tracking-widest text-muted-foreground font-display">
                  {h}
                </div>
              ))}
            </div>
            {/* Rows */}
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_100px_60px_80px] gap-px bg-border/20"
              >
                {/* Engineer */}
                <div className="px-3 py-2.5 bg-card/60 flex flex-col gap-0.5">
                  <span className="text-xs font-display uppercase tracking-wider text-foreground">{log.engineer_name}</span>
                  <span className="text-[0.6rem] text-muted-foreground">{log.role}</span>
                  <span className="text-[0.55rem] text-muted-foreground/60">{log.caller} · {log.timestamp}</span>
                </div>
                {/* Summary */}
                <div className="px-3 py-2.5 bg-card/40 text-[0.65rem] text-muted-foreground leading-relaxed">
                  {log.summary}
                </div>
                {/* Duration */}
                <div className="px-3 py-2.5 bg-card/40 flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  {log.duration}
                </div>
                {/* Language */}
                <div className="px-3 py-2.5 bg-card/40 text-[0.65rem] text-muted-foreground flex items-center">
                  {log.language}
                </div>
                {/* Channel */}
                <div className="px-3 py-2.5 bg-card/40 flex items-center">
                  <ChannelBadge channel={log.channel} />
                </div>
                {/* Status */}
                <div className="px-3 py-2.5 bg-card/40 flex items-center">
                  <StatusBadge status={log.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatch modal */}
      {dispatchTarget && (
        <DispatchModal engineer={dispatchTarget} onClose={() => setDispatchTarget(null)} />
      )}
    </div>
  );
}
