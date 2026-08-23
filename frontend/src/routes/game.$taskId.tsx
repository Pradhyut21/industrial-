/**
 * Recovery Run — Onboarding Simulation Game (Section 2.10)
 *
 * A lightweight 3D mini-game where the player takes the role of a new hire
 * who must recover context from a departed employee's task before the deadline.
 *
 * Architecture:
 *  - Uses @react-three/fiber for 3D rendering (simple box/plane geometry, no AAA assets)
 *  - ALL clues are live API responses — not scripted content
 *  - Timer is sourced from the real tasks.deadline DB field
 *  - Uses existing endpoints: /vault/{person_id}/tasks/{task_id}/explain
 *    and /vault/{person_id}/query — no new backend routes required
 *
 * Route: /game/$taskId?personId=...
 * Launched from the "Play Recovery Run" button on the task list in vault.$personId.tsx
 */

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import { Box, Plane, Text, Html } from "@react-three/drei";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import type { Mesh } from "three";
import {
  ChevronLeft,
  Trophy,
  AlertTriangle,
  Loader2,
  Monitor,
  FileText,
  Phone,
  Archive,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/game/$taskId")({
  component: RecoveryRunGame,
});

import { API_BASE } from "@/lib/api";

const API = API_BASE;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClueSource {
  id: string;
  label: string;
  icon: string;
  description: string;
  endpoint: string;
  color: string;
}

const CLUE_SOURCES: ClueSource[] = [
  {
    id: "terminal",
    label: "Terminal / Task Brief",
    icon: "monitor",
    description: "Access the full AI-generated handoff brief for this task",
    endpoint: "explain",
    color: "#d4af37",
  },
  {
    id: "whiteboard",
    label: "Whiteboard / Flowchart",
    icon: "file",
    description: "View the Mermaid task plan — what was done vs. what remains",
    endpoint: "explain",
    color: "#4ade80",
  },
  {
    id: "cabinet",
    label: "Filing Cabinet / Glossary",
    icon: "archive",
    description: "Query the knowledge vault for glossary and unresolved items",
    endpoint: "query",
    color: "#60a5fa",
  },
  {
    id: "phone",
    label: "Phone / Voice Brief",
    icon: "phone",
    description: "Trigger a stub outbound brief call log entry",
    endpoint: "voice",
    color: "#f472b6",
  },
];

// ── Timer hook ────────────────────────────────────────────────────────────────

function useDeadlineTimer(deadlineStr: string | null | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadlineStr) return;
    const deadline = new Date(deadlineStr + "T23:59:59");
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) {
      setSecondsLeft(0);
      setExpired(true);
      return;
    }
    // For demo purposes: compress real remaining days into a 3-minute game window
    // by scaling so the full deadline maps to a maximum of 180 game-seconds.
    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const gameSecs = Math.min(180, diffDays * 10); // 10s per remaining day, cap at 3 min
    setSecondsLeft(gameSecs);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineStr]);

  return { secondsLeft, expired };
}

// ── 3D Scene objects ──────────────────────────────────────────────────────────

function InteractableObject({
  position,
  color,
  label,
  activated,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  activated: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Gentle float animation
    meshRef.current.position.y =
      position[1] + Math.sin(Date.now() * 0.002) * 0.05;
    // Spin slightly when hovered
    if (hovered) {
      meshRef.current.rotation.y += delta * 1.2;
    }
  });

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[0.7, 0.7, 0.7]}
        onClick={onClick}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <meshStandardMaterial
          color={activated ? color : "#374151"}
          emissive={hovered || activated ? color : "#000000"}
          emissiveIntensity={hovered ? 0.6 : activated ? 0.3 : 0}
          roughness={0.4}
          metalness={0.6}
        />
      </Box>
      <Html
        position={[0, 0.65, 0]}
        center
        style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: activated ? color : "#9ca3af",
            background: "rgba(0,0,0,0.7)",
            padding: "2px 6px",
            borderRadius: "2px",
            border: `1px solid ${activated ? color : "#374151"}`,
          }}
        >
          {activated ? "✓ " : ""}
          {label}
        </div>
      </Html>
    </group>
  );
}

function Room() {
  return (
    <>
      {/* Floor */}
      <Plane args={[12, 12]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </Plane>
      {/* Back wall */}
      <Plane args={[12, 6]} position={[0, 1.8, -6]}>
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </Plane>
      {/* Left wall */}
      <Plane args={[12, 6]} rotation={[0, Math.PI / 2, 0]} position={[-6, 1.8, 0]}>
        <meshStandardMaterial color="#0f1f2e" roughness={0.9} />
      </Plane>
      {/* Ceiling */}
      <Plane args={[12, 12]} rotation={[Math.PI / 2, 0, 0]} position={[0, 4.8, 0]}>
        <meshStandardMaterial color="#0a0a14" roughness={1} />
      </Plane>
      {/* Ambient lighting stripe on back wall */}
      <mesh position={[0, 3.5, -5.9]}>
        <planeGeometry args={[8, 0.05]} />
        <meshStandardMaterial color="#d4af37" emissive="#d4af37" emissiveIntensity={2} />
      </mesh>
    </>
  );
}

// ── Clue Panel overlay ─────────────────────────────────────────────────────────

function CluePanel({
  clue,
  explainData,
  queryData,
  loading,
  onClose,
}: {
  clue: ClueSource;
  explainData: any;
  queryData: any;
  loading: boolean;
  onClose: () => void;
}) {
  const data = clue.endpoint === "voice" ? null : clue.endpoint === "query" ? queryData : explainData;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl border bg-card shadow-2xl mb-4"
        style={{ borderColor: clue.color, boxShadow: `0 0 40px ${clue.color}22` }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between border-b border-border"
          style={{ background: `${clue.color}10` }}
        >
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: clue.color }}>
              Context Recovered — {clue.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{clue.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: clue.color }} />
              <span className="text-xs font-mono">Retrieving context from vault...</span>
            </div>
          )}

          {!loading && clue.id === "terminal" && explainData && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Gap & Handover Analysis
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {explainData.gap_explanation}
              </p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground pt-2 border-t border-border">
                <span>Progress: <span style={{ color: clue.color }}>{explainData.percent_complete}%</span></span>
                <span>Status: <span className="uppercase">{explainData.status}</span></span>
                <span>Urgency: <span className="uppercase">{explainData.urgency_status?.replace("_", " ")}</span></span>
              </div>
            </div>
          )}

          {!loading && clue.id === "whiteboard" && explainData && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Task Flowchart (Mermaid Source)
              </div>
              <pre className="text-[11px] font-mono text-foreground/80 bg-muted/20 border border-border/40 p-3 overflow-x-auto whitespace-pre-wrap">
                {explainData.flowchart_mermaid}
              </pre>
              {explainData.dependencies?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Dependencies</p>
                  {explainData.dependencies.map((d: any, i: number) => (
                    <div key={i} className="text-xs font-mono text-foreground/70">
                      <span
                        className="mr-2 px-1 text-[8px] rounded"
                        style={{
                          background: d.relationship === "blocks" ? "#f4272722" : "#3b82f622",
                          color: d.relationship === "blocks" ? "#f87171" : "#60a5fa",
                        }}
                      >
                        {d.relationship}
                      </span>
                      {d.team} ({d.domain})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && clue.id === "cabinet" && queryData && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Knowledge Vault Query
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {queryData.answer}
              </p>
              {queryData.citations?.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  {queryData.citations.slice(0, 3).map((c: any, i: number) => (
                    <div key={i} className="text-[10px] font-mono text-muted-foreground">
                      <span style={{ color: clue.color }}>[{i + 1}]</span> {c.title} — {c.author}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && clue.id === "phone" && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Outbound Call Log Entry (Stub)
              </div>
              <div className="border border-border/50 bg-muted/20 p-3 text-xs font-mono text-foreground/70">
                <p>📞 Call initiated: Continuity Brief Summary</p>
                <p className="mt-1 text-muted-foreground">
                  STUB — would call /voice/outbound and place a real Twilio call when TWILIO_ACCOUNT_SID is set.
                  In the live product, this calls the department lead with a spoken summary of this task's handoff state.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Win / Lose screens ─────────────────────────────────────────────────────────

function WinScreen({ taskTitle, onReplay }: { taskTitle: string; onReplay: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="text-center space-y-6 max-w-md px-6">
        <Trophy className="h-16 w-16 text-yellow-400 mx-auto" />
        <div>
          <h2 className="font-display text-2xl uppercase tracking-[0.2em] text-yellow-400">
            Context Recovered
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            You've assembled enough context to continue "{taskTitle}" without losing momentum.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onReplay}
            className="px-5 py-2 bg-yellow-400 text-black text-xs font-display uppercase tracking-wider hover:bg-yellow-300 transition-colors cursor-pointer"
          >
            Play Again
          </button>
          <Link
            to="/vault"
            className="px-5 py-2 border border-border text-foreground/70 text-xs font-display uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Back to Vault
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoseScreen({
  explainData,
  taskTitle,
  onReplay,
}: {
  explainData: any;
  taskTitle: string;
  onReplay: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="text-center space-y-6 max-w-2xl px-6 py-8 w-full">
        <AlertTriangle className="h-14 w-14 text-rose-500 mx-auto" />
        <div>
          <h2 className="font-display text-2xl uppercase tracking-[0.2em] text-rose-500">
            Deadline Passed
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            You ran out of time on "{taskTitle}". Here's what would have been missed without DeadMind:
          </p>
        </div>

        {/* The product pitch moment — what would have been missed */}
        {explainData && (
          <div className="text-left space-y-4">
            {explainData.dependencies?.length > 0 && (
              <div className="border border-rose-500/30 bg-rose-500/5 p-4 text-left">
                <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest mb-2">
                  Teams Left Blocked (no handoff received)
                </p>
                {explainData.dependencies.map((d: any, i: number) => (
                  <div key={i} className="text-xs text-foreground/80 font-mono mt-1">
                    • {d.team} ({d.domain}) —{" "}
                    <span className="text-rose-400">{d.relationship.replace("_", " ")}</span>
                    {d.note && `: ${d.note}`}
                  </div>
                ))}
              </div>
            )}

            {explainData.learning_resources?.slice(0, 2).map((r: any, i: number) => (
              <div key={i} className="border border-border/50 bg-card/40 p-3 text-left text-xs font-mono text-muted-foreground">
                <span className="text-[8px] uppercase tracking-widest text-primary block mb-1">
                  Knowledge Gap: {r.topic}
                </span>
                {r.description}
              </div>
            ))}

            <div className="border border-rose-500/20 bg-rose-500/5 p-4 text-left">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <span className="text-rose-400 font-bold">This is the cost of not having DeadMind.</span>{" "}
                Without a Continuity Vault, a new hire would spend days reconstructing this context across 7-12 disconnected systems — missing blockers, misreading priorities, and breaking downstream dependencies.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onReplay}
            className="px-5 py-2 bg-rose-500 text-white text-xs font-display uppercase tracking-wider hover:bg-rose-400 transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <Link
            to="/vault"
            className="px-5 py-2 border border-border text-foreground/70 text-xs font-display uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Back to Vault
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main game component ────────────────────────────────────────────────────────

function RecoveryRunGame() {
  const { taskId } = Route.useParams();
  // personId passed as query param from the vault task list
  const search = useSearch({ strict: false }) as { personId?: string };
  const personId = search.personId ?? "1";

  const [activated, setActivated] = useState<Set<string>>(new Set());
  const [activeClue, setActiveClue] = useState<ClueSource | null>(null);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Fetch task data (for deadline and basic info)
  const { data: taskData } = useQuery({
    queryKey: ["game-task", personId, taskId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/tasks/${taskId}`, {
        headers: { "X-DeadMind-Role": "Field Technician" },
      });
      if (!r.ok) throw new Error("Task not found");
      return r.json();
    },
  });

  // Pre-fetch the explain data once (reused for terminal + whiteboard + lose screen)
  const { data: explainData, isLoading: explainLoading } = useQuery({
    queryKey: ["game-explain", personId, taskId],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/${personId}/tasks/${taskId}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DeadMind-Role": "Field Technician",
        },
        body: JSON.stringify({ requester_role: "Field Technician" }),
      });
      if (!r.ok) throw new Error("Explain failed");
      return r.json();
    },
  });

  const { secondsLeft, expired } = useDeadlineTimer(taskData?.deadline ?? null);

  // Win when all 4 objects activated
  useEffect(() => {
    if (activated.size === CLUE_SOURCES.length && gameState === "playing") {
      setGameState("won");
    }
  }, [activated, gameState]);

  // Lose when timer expires before win
  useEffect(() => {
    if (expired && gameState === "playing") {
      setGameState("lost");
    }
  }, [expired, gameState]);

  const handleObjectClick = useCallback(
    async (clue: ClueSource) => {
      if (gameState !== "playing") return;
      setActiveClue(clue);
      setActivated((prev) => new Set([...prev, clue.id]));

      if (clue.endpoint === "query" && !queryResult) {
        setQueryLoading(true);
        try {
          const r = await fetch(`${API}/vault/${personId}/query`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-DeadMind-Role": "Field Technician",
            },
            body: JSON.stringify({
              query: "What are the main open items and who should I contact?",
              requester_role: "Field Technician",
            }),
          });
          const d = await r.json();
          setQueryResult(d);
        } catch {
          setQueryResult({ answer: "Vault query unavailable. Backend may not be running.", citations: [] });
        } finally {
          setQueryLoading(false);
        }
      }

      if (clue.endpoint === "voice") {
        // Stub: log a call session entry without a real Twilio call
        try {
          await fetch(`${API}/voice/outbound`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-DeadMind-Role": "Admin" },
            body: JSON.stringify({
              person_id: Number(personId),
              to_phone: "+919999999999",
            }),
          });
        } catch {
          // Non-critical — stub may fail gracefully
        }
      }
    },
    [gameState, personId, queryResult]
  );

  const handleReplay = () => {
    setActivated(new Set());
    setActiveClue(null);
    setGameState("playing");
    setQueryResult(null);
  };

  // Object positions in 3D space
  const OBJECT_POSITIONS: [number, number, number][] = [
    [-2.5, 0, 0],   // terminal (left)
    [0, 0, -1],     // whiteboard (centre-back)
    [2.5, 0, 0],    // cabinet (right)
    [0, 0, 1.5],    // phone (front-centre)
  ];

  const progressPct = (activated.size / CLUE_SOURCES.length) * 100;
  const taskTitle = taskData?.title ?? `Task #${taskId}`;

  const formatTime = (secs: number | null) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-[#050a14] flex flex-col">
      {/* HUD — top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-black/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Link
            to="/vault"
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary uppercase tracking-widest"
          >
            <ChevronLeft className="h-3 w-3" />
            Exit
          </Link>
          <div>
            <div className="text-[9px] font-mono text-primary uppercase tracking-widest">
              Recovery Run
            </div>
            <div className="text-xs font-display uppercase text-foreground truncate max-w-xs">
              {taskTitle}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-2 font-mono text-sm font-bold px-3 py-1.5 border ${
            (secondsLeft ?? 999) <= 30
              ? "border-rose-500/60 text-rose-400 bg-rose-500/10"
              : (secondsLeft ?? 999) <= 60
              ? "border-amber-400/60 text-amber-300 bg-amber-400/10"
              : "border-primary/40 text-primary bg-primary/10"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {formatTime(secondsLeft)}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">
            Context Recovered
          </div>
          <div className="flex gap-1">
            {CLUE_SOURCES.map((c) => (
              <div
                key={c.id}
                className={`h-2 w-6 rounded-sm transition-all duration-500 ${
                  activated.has(c.id) ? "opacity-100" : "opacity-20 bg-border"
                }`}
                style={activated.has(c.id) ? { background: c.color } : {}}
              />
            ))}
          </div>
          <div className="text-[10px] font-mono text-primary font-bold">
            {activated.size}/{CLUE_SOURCES.length}
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 2, 6], fov: 55 }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.15} />
            <pointLight position={[0, 4, 0]} intensity={1.5} color="#d4af37" />
            <pointLight position={[-4, 2, 4]} intensity={0.6} color="#1e40af" />
            <pointLight position={[4, 2, 4]} intensity={0.6} color="#0f766e" />

            <Room />

            {/* Interactable objects */}
            {CLUE_SOURCES.map((clue, i) => (
              <InteractableObject
                key={clue.id}
                position={OBJECT_POSITIONS[i]}
                color={clue.color}
                label={clue.label.split("/")[0].trim()}
                activated={activated.has(clue.id)}
                onClick={() => handleObjectClick(clue)}
              />
            ))}
          </Suspense>
        </Canvas>

        {/* Instruction overlay (fades after first interaction) */}
        {activated.size === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center space-y-1 pointer-events-none">
            <p className="text-[11px] font-mono text-muted-foreground animate-pulse">
              Click each glowing object to recover context before the timer expires
            </p>
            <div className="flex justify-center gap-6 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
              {CLUE_SOURCES.map((c) => (
                <span key={c.id} style={{ color: `${c.color}99` }}>
                  {c.label.split("/")[0].trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Object legend — side panel */}
        <div className="absolute right-4 top-4 space-y-2 pointer-events-none">
          {CLUE_SOURCES.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[9px] font-mono">
              <div
                className={`h-2 w-2 rounded-full transition-all ${
                  activated.has(c.id) ? "opacity-100 scale-110" : "opacity-30"
                }`}
                style={{ background: c.color }}
              />
              <span
                className={activated.has(c.id) ? "text-foreground/70" : "text-muted-foreground/40"}
              >
                {activated.has(c.id) ? "✓ " : ""}
                {c.label.split("/")[0].trim()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clue Panel overlay */}
      {activeClue && gameState === "playing" && (
        <CluePanel
          clue={activeClue}
          explainData={explainData}
          queryData={queryResult}
          loading={
            (activeClue.endpoint === "explain" && explainLoading) ||
            (activeClue.endpoint === "query" && queryLoading)
          }
          onClose={() => setActiveClue(null)}
        />
      )}

      {/* Win / Lose screens */}
      {gameState === "won" && (
        <WinScreen taskTitle={taskTitle} onReplay={handleReplay} />
      )}
      {gameState === "lost" && (
        <LoseScreen explainData={explainData} taskTitle={taskTitle} onReplay={handleReplay} />
      )}
    </div>
  );
}
