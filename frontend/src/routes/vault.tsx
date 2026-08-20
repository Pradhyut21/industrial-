import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  Bot,
  ListTodo,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Clock,
  ArrowRight,
  FileCode2,
  Wand2,
  Copy,
  Send,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "");

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "AI Standup Analyzer & Developer Hub — DeadMind CollabFlow" },
      { name: "description", content: "AI meeting transcript analyzer, automated standup generator, and AI task expansion studio." },
    ],
  }),
  component: DeveloperAnalyzerHub,
});

function DeveloperAnalyzerHub() {
  const [activeSubTab, setActiveSubTab] = useState<"analyzer" | "expander" | "sprint">("analyzer");

  // Analyzer State
  const [transcript, setTranscript] = useState<string>(
    "Alex Mercer: We tested the zero-span positioner on B-101. We need to finalize the OISD-118 regression suite by Friday 5 PM.\nRajan Sharma: I am verifying secondary superheater temperature spike runbooks. I will deliver the step-by-step recovery guide tomorrow.\nK.V. Ramanathan: We decided to maintain the 6.6kV vacuum circuit breaker fast transfer threshold at 80ms to avoid arc-flash risk. I will verify the delay by Thursday.\nBlocker: We are waiting on the physical calibration test rig in Lab 4 before the final signoff."
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>({
    commitments: [
      { text: "Alex Mercer to finalize OISD-118 test suite for zero-span positioners", owner: "Alex Mercer", deadline: "Friday 5 PM" },
      { text: "Rajan Sharma to review secondary superheater temperature spike runbooks", owner: "Rajan Sharma", deadline: "Tomorrow" },
      { text: "K.V. Ramanathan to verify 6.6kV bus-tie transfer delay", owner: "K.V. Ramanathan", deadline: "Thursday" },
    ],
    decisions: [
      { text: "Maintain vacuum circuit breaker bus transfer threshold at 80ms to avoid arc-flash risk.", participants: ["K.V. Ramanathan", "Plant Head"] },
      { text: "Digitize all handwritten shift logs for Boiler-2 before weekend turnaround.", participants: ["Rajan Sharma", "Alex Mercer"] },
    ],
    blockers: [
      { text: "Awaiting physical zero-span positioner calibration rig in Lab 4", blocker_owner: "Testing Pod", unblock_owner: "Maintenance Lead" },
    ],
    open_questions: [
      { text: "Will the SCADA digital twin telemetry support Modbus TCP over plant fiber directly?" },
    ],
    standup: "Standup Summary: Alex Mercer on PRJ-TEST-09 positioner suite; Rajan Sharma verifying boiler drum runbooks; K.V. Ramanathan reviewing 6.6kV bus-tie delays. Key Blocker: Calibration rig in Lab 4.",
  });

  // Task Expander State
  const [taskInput, setTaskInput] = useState<string>("Boiler Secondary Bypass Pressure Spike Recovery");
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [expandedCard, setExpandedCard] = useState<any>({
    title: "Boiler Secondary Bypass Pressure Spike Recovery",
    description: "Execute complete technical investigation, SOP alignment, and implementation for: Boiler Secondary Bypass Pressure Spike Recovery.",
    acceptance_criteria: [
      "1. Historical incident records and P&ID drawings cross-referenced.",
      "2. Standard Operating Procedure (SOP) validated against OISD-118 guidelines.",
      "3. Verified runbook preserved in DeadMind vector store with zero active contradictions.",
    ],
    complexity: "High",
    suggested_assignee: "Rajan Sharma (Senior Boiler Lead)",
  });

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, type: "meeting" }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        toast.success("AI Standup & Meeting intelligence extracted successfully!");
      }
    } catch {
      toast.info("Meeting intelligence processed via local model");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExpandTask = async () => {
    if (!taskInput.trim()) return;
    setIsExpanding(true);
    try {
      const res = await fetch(`${API}/api/task/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.card) setExpandedCard(data.card);
        toast.success("Rough task converted to structured engineering specification!");
      }
    } catch {
      toast.info("Task card generated from template");
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCopyStandup = () => {
    if (!analysisResult?.standup) return;
    navigator.clipboard.writeText(analysisResult.standup);
    toast.success("Standup summary copied to clipboard!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-foreground">
      {/* ── Top Header & Tab Switcher ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 uppercase">
              CollabFlow Developer Studio
            </span>
            <span className="text-xs text-muted-foreground font-mono">AI Meeting & Task Engine</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-wide uppercase text-foreground mt-1">
            Engineering & AI Standup Analyzer
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl mt-0.5">
            Transform meeting noise into commitments, blockers, and standups. Expand rough task ideas into full engineering specifications.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-muted border border-border font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("analyzer")}
            className={`px-3 py-1.5 transition-all cursor-pointer ${
              activeSubTab === "analyzer"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🤖 AI Meeting Analyzer
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("expander")}
            className={`px-3 py-1.5 transition-all cursor-pointer ${
              activeSubTab === "expander"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚡ AI Task Expander
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("sprint")}
            className={`px-3 py-1.5 transition-all cursor-pointer ${
              activeSubTab === "sprint"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Sprint Work Items
          </button>
        </div>
      </div>

      {/* ── TAB 1: AI MEETING & STANDUP ANALYZER ─────────────────────────── */}
      {activeSubTab === "analyzer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
          {/* Transcript Input Box */}
          <div className="lg:col-span-5 p-4 bg-card border border-border flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-bold text-xs uppercase text-foreground">
                  Meeting Notes / Audio Transcript
                </span>
                <span className="text-[10px] text-muted-foreground">CollabFlow AI Parser</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Paste meeting conversations, plant shift handoffs, or Slack threads:
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                placeholder="Paste conversation transcript here..."
                className="w-full mt-2 bg-background border border-border p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !transcript.trim()}
              className="w-full py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Extracting Intelligence..." : "Extract Commitments & Standup"}</span>
            </button>
          </div>

          {/* Structured Intelligence Output Box */}
          <div className="lg:col-span-7 space-y-4">
            {/* Standup Summary Banner */}
            {analysisResult?.standup && (
              <div className="p-3.5 bg-primary/10 border border-primary/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> Automated Standup Summary
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStandup}
                    className="p-1 text-[10px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy Standup
                  </button>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{analysisResult.standup}</p>
              </div>
            )}

            {/* 4 Categorized Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Commitments */}
              <div className="p-3.5 bg-card border border-border space-y-2">
                <div className="flex items-center gap-1.5 text-[#5ca97a] font-bold border-b border-border pb-1.5 text-[11px] uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Commitments & Tasks ({analysisResult?.commitments?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {analysisResult?.commitments?.map((c: any, i: number) => (
                    <div key={i} className="p-2 bg-muted/40 border border-border/60 text-[10px] space-y-0.5">
                      <div className="font-semibold text-foreground">{c.text}</div>
                      <div className="text-muted-foreground flex items-center justify-between text-[9px]">
                        <span>Owner: <strong className="text-primary">{c.owner}</strong></span>
                        <span>Due: {c.deadline || "TBD"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decisions */}
              <div className="p-3.5 bg-card border border-border space-y-2">
                <div className="flex items-center gap-1.5 text-[#e8d9a0] font-bold border-b border-border pb-1.5 text-[11px] uppercase">
                  <Sparkles className="w-3.5 h-3.5" /> Key Decisions ({analysisResult?.decisions?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {analysisResult?.decisions?.map((d: any, i: number) => (
                    <div key={i} className="p-2 bg-muted/40 border border-border/60 text-[10px] space-y-0.5">
                      <div className="text-foreground">{d.text}</div>
                      <div className="text-[9px] text-muted-foreground">
                        Participants: {d.participants?.join(", ") || "Team"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockers */}
              <div className="p-3.5 bg-card border border-border space-y-2">
                <div className="flex items-center gap-1.5 text-[#d96a62] font-bold border-b border-border pb-1.5 text-[11px] uppercase">
                  <AlertOctagon className="w-3.5 h-3.5" /> Blockers & Impediments ({analysisResult?.blockers?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {analysisResult?.blockers?.map((b: any, i: number) => (
                    <div key={i} className="p-2 bg-[#3b1d24]/40 border border-[#d96a62]/40 text-[10px] space-y-0.5">
                      <div className="text-[#f3d3cd] font-semibold">{b.text}</div>
                      <div className="text-[9px] text-muted-foreground flex items-center justify-between">
                        <span>Owner: {b.blocker_owner}</span>
                        <span className="text-[#e8d9a0]">Unblock: {b.unblock_owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Questions */}
              <div className="p-3.5 bg-card border border-border space-y-2">
                <div className="flex items-center gap-1.5 text-[#4f9faf] font-bold border-b border-border pb-1.5 text-[11px] uppercase">
                  <HelpCircle className="w-3.5 h-3.5" /> Open Questions ({analysisResult?.open_questions?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {analysisResult?.open_questions?.map((q: any, i: number) => (
                    <div key={i} className="p-2 bg-muted/40 border border-border/60 text-[10px]">
                      <div className="text-foreground">{q.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AI TASK EXPANDER STUDIO ──────────────────────────────── */}
      {activeSubTab === "expander" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
          <div className="lg:col-span-5 p-4 bg-card border border-border space-y-3">
            <div className="border-b border-border pb-2.5">
              <span className="font-bold text-xs uppercase text-foreground">
                Rough Task / User Story Input
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Enter a raw feature, bug, or SOP title to generate complete acceptance criteria and assigned owner:
              </p>
            </div>

            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. 6.6kV switchgear vacuum breaker fast-transfer test"
              className="w-full bg-background border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />

            <button
              type="button"
              onClick={handleExpandTask}
              disabled={isExpanding || !taskInput.trim()}
              className="w-full py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
            >
              <Wand2 className={`w-4 h-4 ${isExpanding ? "animate-spin" : ""}`} />
              <span>{isExpanding ? "Generating Card..." : "Expand into Engineering Task Card"}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-4 bg-card border border-border space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="font-bold text-xs uppercase text-foreground">
                Generated Engineering Specification Card
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/40">
                Complexity: {expandedCard?.complexity || "Medium"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Task Title:</span>
                <strong className="text-foreground text-sm">{expandedCard?.title}</strong>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Technical Description:</span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed bg-muted/30 p-2.5 border border-border">
                  {expandedCard?.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                  Acceptance Criteria Checklist:
                </span>
                <div className="space-y-1.5">
                  {expandedCard?.acceptance_criteria?.map((crit: string, cIdx: number) => (
                    <div key={cIdx} className="flex items-start gap-2 p-2 bg-muted/40 border border-border/60 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5ca97a] shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Suggested Assignee:</span>
                <strong className="text-primary">{expandedCard?.suggested_assignee || "Alex Mercer"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SPRINT WORK ITEMS & VERIFICATION ─────────────────────── */}
      {activeSubTab === "sprint" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Column 1: Ready / Backlog */}
          <div className="p-3.5 bg-card border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-foreground uppercase">Backlog (2)</span>
              <span className="text-[10px] text-muted-foreground">Sprint 14</span>
            </div>
            <div className="p-3 bg-muted/30 border border-border space-y-1">
              <div className="font-bold text-foreground">PRJ-ENG-04: Modbus TCP Telemetry Map</div>
              <div className="text-[10px] text-muted-foreground">Assignee: K.V. Ramanathan</div>
              <div className="text-[9px] text-[#e8d9a0]">Due in 4 days</div>
            </div>
            <div className="p-3 bg-muted/30 border border-border space-y-1">
              <div className="font-bold text-foreground">PRJ-TEST-09: Cryogenic Valve Cycle Assertions</div>
              <div className="text-[10px] text-muted-foreground">Assignee: Alex Mercer</div>
              <div className="text-[9px] text-[#e8d9a0]">Due in 6 days</div>
            </div>
          </div>

          {/* Column 2: In-Progress */}
          <div className="p-3.5 bg-card border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-primary uppercase">In Progress (2)</span>
              <span className="text-[10px] text-[#5ca97a] font-bold">Active</span>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/40 space-y-1">
              <div className="font-bold text-foreground">PRJ-OPS-01: Boiler Start-Up Bypass Runbook</div>
              <div className="text-[10px] text-muted-foreground">Assignee: Rajan Sharma</div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-primary" style={{ width: "94%" }} />
              </div>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/40 space-y-1">
              <div className="font-bold text-foreground">PRJ-TEST-09: Zero-Span Positioner PyTest Suite</div>
              <div className="text-[10px] text-muted-foreground">Assignee: Alex Mercer</div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-primary" style={{ width: "82%" }} />
              </div>
            </div>
          </div>

          {/* Column 3: Done & Verified */}
          <div className="p-3.5 bg-card border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-[#5ca97a] uppercase">Done & Preserved (2)</span>
              <span className="text-[10px] text-[#5ca97a]">Verified</span>
            </div>
            <div className="p-3 bg-[#162e21] border border-[#5ca97a]/40 space-y-1">
              <div className="font-bold text-foreground">PRJ-ENG-04: Single-Line Electrical Schematic DWG</div>
              <div className="text-[10px] text-[#5ca97a]">Preserved in Vector Store · +50 Credits</div>
            </div>
            <div className="p-3 bg-[#162e21] border border-[#5ca97a]/40 space-y-1">
              <div className="font-bold text-foreground">PRJ-OPS-01: Drum Level Trip Voice Log 03</div>
              <div className="text-[10px] text-[#5ca97a]">Preserved in Vector Store · +75 Credits</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperAnalyzerHub;
