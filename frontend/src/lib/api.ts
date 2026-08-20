import { mock } from "./mock-data";
import { toast } from "sonner";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";
const MOCK_ONLY = (import.meta.env.VITE_API_MOCK as string | undefined) === "1";

// Once a request fails, flip to mock-only for the rest of the session so we
// don't pay the network timeout cost on every subsequent query.
let liveDown = MOCK_ONLY;

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function req<T>(path: string, init: RequestInit | undefined, fallback: () => T | Promise<T>): Promise<T> {
  if (liveDown) return await fallback();
  try {
    return await tryFetch<T>(path, init);
  } catch (err) {
    liveDown = true;
    if (typeof console !== "undefined") {
      console.warn("[DeadMind] live API unreachable — switching permanently to mock data for this session.", err);
    }
    toast.error("Live API offline or unreachable. Falling back to local high-fidelity cognitive simulation.", {
      id: "api-offline-fallback",
    });
    return await fallback();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────
export interface Engineer {
  name: string;
  role: string;
  status: string;
  retirement_date: string;
  retirement_year: number;
  avatar: string;
  risk_score: number;
  specialties: string;
  cognitive_systematic: number;
  cognitive_intuitive: number;
  cognitive_mechanical: number;
  cognitive_electrical: number;
  cognitive_instrumentation: number;
  cognitive_process: number;
}

export interface OwnerRef { name: string; retirement_year: number; }

export interface VulnNode {
  tag: string; name: string; process_area: string;
  x: number; y: number;
  criticality: string; downtime_cost: number;
  active_engineers: OwnerRef[]; retired_engineers: OwnerRef[];
  risk_level: string; color: string;
}

export interface UploadResponse {
  status: string;
  data: { id: number; title: string; author: string; equipment_tag: string; failure_code: string; confidence: number; };
}

export interface Citation { id: number; title: string; author: string; equipment_tag: string; failure_code: string; }

export interface ChatResponse {
  answer: string; citations: Citation[]; confidence: number; engineer: string;
  related_context: string[];
  uncertainty: { sparsity: string; staleness: string; disagreement: string; causal: string; risk_score: number; };
}

export interface CausalLink { id: number; equipment_tag: string; parent_event: string; child_event: string; is_prediction: number; description: string; }
export interface SemanticPoint { id: number; equipment_tag: string; year: number; phrase: string; vector_x: number; vector_y: number; severity_index: number; }
export interface HalfLifeDoc { id: number; title: string; engineer_author: string; age_years: number; reference_count: number; contradiction_count: number; hardware_generation: string; freshness_score: number; status: string; }
export interface ConsensusResponse { consensus: string; agreement: string; weights: Record<string, number>; dissent: string; }
export interface ShiftAnalysis { triggered: boolean; details?: { tag: string; expert: string; alert: string; guide: string; causal_warning: string; }; }
export interface Counterfactual { id: number; equipment_tag: string; title: string; intervention: string; cost_avoided_crore: number; consequences: string; }
export interface Coreference { id: number; standard_name: string; alias_name: string; entity_type: string; confidence: number; }
export interface NetworkRow { id: number; engineer: string; centrality: number; dependencies: string; domains_affected: number; resilience_drop: number; }
export interface SopRow { id: number; sop_id: string; step_number: number; step_desc: string; compliance_rate: number; workaround_detected: string; }

// ─── Endpoints ────────────────────────────────────────────────────────────
export const api = {
  engineers: () => req<Engineer[]>("/api/engineers", undefined, mock.engineers),
  vulnerabilityMap: () => req<VulnNode[]>("/api/vulnerability-map", undefined, mock.vulnerabilityMap),
  upload: (form: FormData) =>
    req<UploadResponse>("/api/upload", { method: "POST", body: form }, mock.upload),
  chat: (query: string, engineer: string) =>
    req<ChatResponse>("/api/chat", { method: "POST", body: JSON.stringify({ query, engineer }) }, () => mock.chat(query, engineer)),
  voiceNote: (engineer: string, audio_base64: string, transcript: string) =>
    req<{ status: string; message: string }>("/api/voice-note", { method: "POST", body: JSON.stringify({ engineer, audio_base64, transcript }) }, mock.voiceNote),
  causal: (tag: string) =>
    req<CausalLink[]>(`/api/causal-chains/${encodeURIComponent(tag)}`, undefined, () => mock.causal(tag)),
  semanticDrift: (tag: string) =>
    req<SemanticPoint[]>(`/api/semantic-drift/${encodeURIComponent(tag)}`, undefined, () => mock.semanticDrift(tag)),
  halfLife: () => req<HalfLifeDoc[]>("/api/half-life", undefined, mock.halfLife),
  consensus: (query: string, engineer: string) =>
    req<ConsensusResponse>("/api/consensus", { method: "POST", body: JSON.stringify({ query, engineer }) }, () => mock.consensus()),
  analyzeShiftNote: (note: string) =>
    req<ShiftAnalysis>("/api/analyze-shift-note", { method: "POST", body: JSON.stringify({ note }) }, () => mock.analyzeShiftNote(note)),
  counterfactuals: (tag: string) =>
    req<Counterfactual[]>(`/api/counterfactuals/${encodeURIComponent(tag)}`, undefined, () => mock.counterfactuals(tag)),
  coreference: () => req<Coreference[]>("/api/coreference", undefined, mock.coreference),
  network: () => req<NetworkRow[]>("/api/network", undefined, mock.network),
  sopAudit: () => req<SopRow[]>("/api/sop-audit", undefined, mock.sopAudit),
};

export async function apiGet<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: {
      Accept: "application/json",
      ...(headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

export { BASE as API_BASE };
