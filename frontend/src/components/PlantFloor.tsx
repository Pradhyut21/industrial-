/**
 * PlantFloor — Munder Difflin–inspired 2D animated plant floor
 *
 * A lightweight <canvas> scene (no Pixi.js) that shows engineer avatars
 * walking between station nodes. Adapts the Munder Difflin visual language
 * (walk-bob, status overlays, arrival dust, envelope flight) to DeadMind's
 * industrial-plant context.
 *
 * Data: pulls from /vault/persons (existing API).
 * Interaction: clicking an avatar navigates to /vault/{personId}.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `http://${window.location.hostname}:8000`
    : "");

// ── Station Layout ────────────────────────────────────────────────────────
interface Station {
  id: string;
  label: string;
  x: number;
  y: number;
  icon: string;  // emoji
  color: string; // oklch fill
}

const STATIONS: Station[] = [
  { id: "vault",       label: "Vault",       x: 0.15, y: 0.35, icon: "🔒", color: "oklch(0.85 0.16 80)" },
  { id: "terminal",    label: "Terminal",     x: 0.40, y: 0.20, icon: ">_", color: "oklch(0.75 0.18 180)" },
  { id: "whiteboard",  label: "Whiteboard",   x: 0.65, y: 0.35, icon: "📋", color: "oklch(0.80 0.14 300)" },
  { id: "cabinet",     label: "Filing",       x: 0.85, y: 0.20, icon: "🗄️", color: "oklch(0.70 0.12 40)" },
  { id: "phone",       label: "Comms",        x: 0.50, y: 0.55, icon: "📞", color: "oklch(0.65 0.20 28)" },
];

// ── Avatar State ──────────────────────────────────────────────────────────
interface Avatar {
  id: number;
  name: string;
  status: string;           // "active" | "departed"
  x: number;
  y: number;
  targetStation: number;    // index into STATIONS
  speed: number;            // px/sec
  phase: number;            // walk phase
  arrived: boolean;
  waitTimer: number;
  dustParticles: Dust[];
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Envelope {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number; // 0→1
  color: string;
}

// ── Component ─────────────────────────────────────────────────────────────
export function PlantFloor({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const avatarsRef = useRef<Avatar[]>([]);
  const envelopesRef = useRef<Envelope[]>([]);
  const lastTimeRef = useRef<number>(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: async () => {
      const r = await fetch(`${API}/vault/persons`, {
        headers: { "X-DeadMind-Role": "Admin" },
      });
      if (!r.ok) return [];
      return r.json();
    },
  });

  // ── Init avatars from person data ──
  useEffect(() => {
    if (!persons.length) return;
    const existing = avatarsRef.current;
    const next: Avatar[] = persons.map((p: any, i: number) => {
      const old = existing.find((a) => a.id === p.id);
      if (old) return { ...old, name: p.name, status: p.status };
      const station = i % STATIONS.length;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        x: STATIONS[station].x + (Math.random() - 0.5) * 0.05,
        y: STATIONS[station].y + 0.08 + (Math.random() - 0.5) * 0.04,
        targetStation: station,
        speed: 60 + Math.random() * 40,   // 60–100 px/sec
        phase: Math.random() * Math.PI * 2,
        arrived: true,
        waitTimer: 2 + Math.random() * 4,
        dustParticles: [],
      };
    });
    avatarsRef.current = next;
  }, [persons]);

  // ── Spawn an envelope occasionally ──
  const spawnEnvelope = useCallback(() => {
    const avs = avatarsRef.current;
    if (avs.length < 2) return;
    const from = avs[Math.floor(Math.random() * avs.length)];
    let to = avs[Math.floor(Math.random() * avs.length)];
    if (to.id === from.id) to = avs[(avs.indexOf(from) + 1) % avs.length];
    envelopesRef.current.push({
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      t: 0,
      color: "oklch(0.85 0.16 80)",
    });
  }, []);

  // ── Canvas click → navigate ──
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      for (const av of avatarsRef.current) {
        const dx = av.x - mx;
        const dy = av.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 0.04) {
          navigate({ to: "/vault/$personId", params: { personId: String(av.id) } });
          return;
        }
      }
    },
    [navigate]
  );

  // ── Canvas mousemove → cursor ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      let found: number | null = null;
      for (const av of avatarsRef.current) {
        const dx = av.x - mx;
        const dy = av.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 0.04) {
          found = av.id;
          break;
        }
      }
      setHovered(found);
    },
    []
  );

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let envelopeTimer = 3 + Math.random() * 5;

    function frame(time: number) {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;
      if (!canvas || !ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // ── Clear ──
      ctx.clearRect(0, 0, W, H);

      // ── Background — dark industrial floor ──
      ctx.fillStyle = "oklch(0.12 0.02 250)";
      ctx.fillRect(0, 0, W, H);

      // Floor grid lines
      ctx.strokeStyle = "oklch(0.18 0.01 250)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // ── Draw stations ──
      for (const s of STATIONS) {
        const sx = s.x * W;
        const sy = s.y * H;
        const r = 22;

        // Glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = s.color;
        ctx.fillStyle = "oklch(0.16 0.02 250)";
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sx - r, sy - r, r * 2, r * 2, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Icon
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = s.color;
        ctx.fillText(s.icon, sx, sy);

        // Label
        ctx.font = "bold 8px 'Inter', monospace";
        ctx.fillStyle = "oklch(0.55 0.02 250)";
        ctx.textAlign = "center";
        ctx.fillText(s.label.toUpperCase(), sx, sy + r + 12);
      }

      // ── Update & draw avatars ──
      const avatars = avatarsRef.current;
      for (const av of avatars) {
        const target = STATIONS[av.targetStation];
        const tx = target.x + 0.02;
        const ty = target.y + 0.10;

        if (av.arrived) {
          av.waitTimer -= dt;
          if (av.waitTimer <= 0) {
            // Pick new random station
            let next = Math.floor(Math.random() * STATIONS.length);
            while (next === av.targetStation && STATIONS.length > 1) {
              next = Math.floor(Math.random() * STATIONS.length);
            }
            av.targetStation = next;
            av.arrived = false;
          }
        } else {
          // Walk toward target
          const dx = tx - av.x;
          const dy = ty - av.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = (av.speed / W) * dt;

          if (dist < step) {
            av.x = tx;
            av.y = ty;
            av.arrived = true;
            av.waitTimer = 2 + Math.random() * 4;
            // Spawn dust
            for (let d = 0; d < 3; d++) {
              av.dustParticles.push({
                x: av.x * W,
                y: av.y * H + 8,
                vx: (Math.random() - 0.5) * 40,
                vy: -20 - Math.random() * 20,
                life: 0.35,
                maxLife: 0.35,
              });
            }
          } else {
            av.x += (dx / dist) * step;
            av.y += (dy / dist) * step;
            av.phase += dt * 8 * Math.PI;
          }
        }

        // Avatar draw position
        const ax = av.x * W;
        const ay = av.y * H + (av.arrived ? 0 : Math.sin(av.phase) * 2); // walk bob

        const isDeparted = av.status === "departed";
        const opacity = isDeparted ? 0.4 : 1;

        ctx.globalAlpha = opacity;

        // Body (simple capsule shape)
        ctx.fillStyle = isDeparted ? "oklch(0.40 0.02 250)" : "oklch(0.75 0.12 80)";
        ctx.beginPath();
        ctx.ellipse(ax, ay + 4, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = isDeparted ? "oklch(0.50 0.02 250)" : "oklch(0.85 0.08 80)";
        ctx.beginPath();
        ctx.arc(ax, ay - 6, 5, 0, Math.PI * 2);
        ctx.fill();

        // Status overlay
        if (!isDeparted && !av.arrived) {
          // Walking: show dots
          ctx.fillStyle = "oklch(0.85 0.16 80)";
          const dotPhase = (time / 375) % 3;
          for (let di = 0; di < 3; di++) {
            const dotAlpha = Math.abs(dotPhase - di) < 0.8 ? 1 : 0.3;
            ctx.globalAlpha = opacity * dotAlpha;
            ctx.beginPath();
            ctx.arc(ax - 4 + di * 4, ay - 16, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (!isDeparted && av.arrived) {
          // Idle at station: small checkmark
          ctx.strokeStyle = "oklch(0.75 0.18 160)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ax - 3, ay - 15);
          ctx.lineTo(ax - 1, ay - 13);
          ctx.lineTo(ax + 3, ay - 17);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // Name label
        ctx.font = "bold 7px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isDeparted
          ? "oklch(0.40 0.02 250)"
          : "oklch(0.70 0.06 80)";
        ctx.fillText(av.name.split(" ")[0], ax, ay + 18);

        // Update dust particles
        av.dustParticles = av.dustParticles.filter((d) => {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.vy += 60 * dt; // gravity
          d.life -= dt;
          if (d.life <= 0) return false;

          ctx.globalAlpha = d.life / d.maxLife;
          ctx.fillStyle = "oklch(0.85 0.16 80 / 0.6)";
          ctx.beginPath();
          ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          return true;
        });
      }

      // ── Envelope flight ──
      envelopeTimer -= dt;
      if (envelopeTimer <= 0 && avatars.length >= 2) {
        spawnEnvelope();
        envelopeTimer = 5 + Math.random() * 8;
      }

      envelopesRef.current = envelopesRef.current.filter((env) => {
        env.t += dt * 0.8;
        if (env.t >= 1) return false;

        // Quadratic bezier
        const t = env.t;
        const cpY = Math.min(env.fromY, env.toY) - 0.12;
        const ex = (1 - t) * (1 - t) * env.fromX * W + 2 * (1 - t) * t * ((env.fromX + env.toX) / 2) * W + t * t * env.toX * W;
        const ey = (1 - t) * (1 - t) * env.fromY * H + 2 * (1 - t) * t * cpY * H + t * t * env.toY * H;

        ctx.globalAlpha = 1 - t * 0.5;
        ctx.fillStyle = env.color;
        // Small diamond shape
        ctx.beginPath();
        ctx.moveTo(ex, ey - 4);
        ctx.lineTo(ex + 5, ey);
        ctx.lineTo(ex, ey + 3);
        ctx.lineTo(ex - 5, ey);
        ctx.closePath();
        ctx.fill();

        // Trail
        ctx.strokeStyle = env.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.15;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(env.fromX * W, env.fromY * H);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        return true;
      });

      animRef.current = requestAnimationFrame(frame);
    }

    // Respect reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches) {
      animRef.current = requestAnimationFrame(frame);
    } else {
      // Draw one static frame
      requestAnimationFrame(frame);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [persons, spawnEnvelope]);

  // ── Handle resize ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      // Reset canvas logical size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Title bar */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 dm-status-dot--active" />
        <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground/70">
          Plant Floor — Live Activity
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: hovered ? "pointer" : "default" }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-2 right-3 bg-card/90 border border-border px-2 py-1 text-[10px] font-mono text-foreground dm-snap-in">
          Click to open vault →
        </div>
      )}
    </div>
  );
}
