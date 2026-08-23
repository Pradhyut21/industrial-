import { mock } from "./mock-data";
import { toast } from "sonner";

export const DEFAULT_PROD_API = "https://industrial-pwbj.onrender.com";

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  return DEFAULT_PROD_API;
}

export const API_BASE = getApiBaseUrl();
const BASE = API_BASE;
const MOCK_ONLY = (import.meta.env.VITE_API_MOCK as string | undefined) === "1";

// Once a request fails, flip to mock-only for the rest of the session so we
// don't pay the network timeout cost on every subsequent query.
let liveDown = MOCK_ONLY;

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
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

export interface GroundedSourceItem {
  id: number;
  title: string;
  author: string;
  equipment_tag: string;
  failure_code: string;
  source_type: "ORGANIZATIONAL" | "EMPLOYEE" | "INCIDENT" | "SOP" | "MAINTENANCE" | "CONTINUITY" | "REGULATORY" | string;
  relevance_score: number;
  excerpt: string;
}

export interface EmployeeInsightItem {
  name: string;
  role: string;
  domain: string;
  match_reason: string;
  record_count: number;
  knowledge_freshness: string;
  is_peer_verified: boolean;
  finding: string;
  records_referenced: string[];
}

export interface StructuredChatResponse {
  answer: string;
  evidence_summary: {
    organizational_count: number;
    employee_record_count: number;
    target_equipment: string;
  };
  employee_insights: EmployeeInsightItem[];
  consensus?: {
    consensus: string;
    agreement: string;
    weights: Record<string, number>;
    dissent?: string | null;
  } | null;
  uncertainty: {
    sparsity?: string;
    staleness?: string;
    disagreement?: string;
    causal?: string;
    risk_score: number;
    risk_pct: number;
    evidence_quality: string;
    human_verification_required: boolean;
  };
  sources: GroundedSourceItem[];
  recommended_steps: string[];
  conversation_id: string;
  search_query?: string;
  usage_metrics?: {
    credits_consumed: number;
    balance_remaining: number;
    itemized_cost?: Record<string, number>;
  };
}

export interface UsageSettlementItem {
  id: number;
  service_tier: string;
  credits_added: number;
  amount_microusdc: number;
  amount_usdc_formatted: string;
  txn_id: string;
  payer_address: string;
  lora_explorer_url: string;
  settled_at: string;
}

export interface UsageAccount {
  company_allowance_total: number;
  company_id: string;
  user_id: string;
  account_id: string;
  allocated_credits: number;
  used_credits: number;
  balance_credits: number;
  overage_count: number;
  total_overage_microusdc: number;
  total_overage_usdc_formatted: string;
  todays_usage: {
    chat: number;
    rag_retrieval: number;
    expert_consultation: number;
    consensus_synthesis: number;
    uncertainty_analysis: number;
    agent_query: number;
  };
  settlements_count: number;
  recent_settlements: UsageSettlementItem[];
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured_data?: StructuredChatResponse;
  timestamp: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  role: string;
  title: string;
  summary: string;
  selected_experts: string[];
  relevant_entities: string[];
  is_favorite: boolean;
  tag: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: MessageItem[];
}

export interface ExpertItem {
  name: string;
  role: string;
  status: string;
  retirement_year: number;
  domains: string[];
  primary_domain: string;
  record_count: number;
  incident_count: number;
  is_peer_verified: boolean;
  knowledge_freshness: string;
  avatar: string;
}

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
  
  // Organizational Memory Chat Endpoints
  listConversations: (userId: string = "default_user", search?: string, tag?: string) =>
    apiGet<Conversation[]>(`/api/chat/conversations?user_id=${encodeURIComponent(userId)}${search ? `&search=${encodeURIComponent(search)}` : ''}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`),
  getConversation: (id: string, userId?: string) =>
    apiGet<Conversation>(`/api/chat/conversations/${encodeURIComponent(id)}${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),
  createConversation: (payload: { title?: string; user_id?: string; role?: string; selected_experts?: string[]; tag?: string; initial_query?: string }) =>
    apiPost<Conversation>("/api/chat/conversations", payload),
  updateConversation: (id: string, payload: Partial<Conversation>) =>
    apiPatch<{ status: string; conversation_id: string }>(`/api/chat/conversations/${encodeURIComponent(id)}`, payload),
  deleteConversation: (id: string, userId?: string) =>
    apiDelete<{ status: string; message: string }>(`/api/chat/conversations/${encodeURIComponent(id)}${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),
  queryChat: (payload: { query: string; conversation_id?: string; user_id?: string; role?: string; selected_experts?: string[]; analysis_mode?: string }) =>
    apiPost<StructuredChatResponse>("/api/chat/query", payload),
  listExperts: () =>
    apiGet<ExpertItem[]>("/api/chat/experts"),

  // Platform Metering & x402 Economy Endpoints
  getUsageAccount: (userId: string = "default_user") =>
    apiGet<UsageAccount>(`/api/metering/account/${encodeURIComponent(userId)}`),
  getCompanyEconomyDashboard: (companyId: string = "INDO-POWER-PLANT-01") =>
    apiGet<CompanyEconomyDashboard>(`/api/metering/company/${encodeURIComponent(companyId)}/dashboard`),
  topupAccountX402: (payload: { user_id?: string; credits_to_add: number; amount_microusdc: number; txn_id: string; payer_address: string; service_tier?: string }) =>
    apiPost<{ status: string; user_id: string; credits_added: number; balance_credits: number; txn_id: string; lora_url: string; amount_usdc: string; reimbursement?: ReimbursementRequest }>("/api/metering/topup-x402", payload),
  simulateConsumption: (credits: number, userId: string = "default_user", description?: string) =>
    apiPost<{ status: string; user_id: string; credits_depleted: number; new_balance: number; note: string }>("/api/metering/demo/simulate-depletion", { user_id: userId, credits_to_consume: credits, description }),
  demoRefillCredits: (userId: string = "default_user", credits: number = 500) =>
    apiPost<{ status: string; credits_added: number; balance_credits: number; txn_id: string; lora_url: string; amount_usdc: string }>(`/api/metering/demo/refill?user_id=${encodeURIComponent(userId)}&credits=${credits}`),
  demoResetEconomy: () =>
    apiPost<{ status: string; message: string }>("/api/metering/demo/reset"),

  // Employee Reimbursement Endpoints
  listReimbursements: (companyId: string = "INDO-POWER-PLANT-01", status?: string, employeeId?: string) =>
    apiGet<ReimbursementListResponse>(`/api/reimbursements?company_id=${encodeURIComponent(companyId)}${status ? `&status=${encodeURIComponent(status)}` : ''}${employeeId ? `&employee_id=${encodeURIComponent(employeeId)}` : ''}`),
  getReimbursementPolicy: (companyId: string = "INDO-POWER-PLANT-01") =>
    apiGet<ReimbursementPolicy>(`/api/reimbursements/policy/${encodeURIComponent(companyId)}`),
  updateReimbursementPolicy: (companyId: string, payload: Partial<ReimbursementPolicy>) =>
    apiPut<ReimbursementPolicy>(`/api/reimbursements/policy/${encodeURIComponent(companyId)}`, payload),
  approveReimbursement: (requestId: string, reviewerId?: string, notes?: string) =>
    apiPost<ReimbursementRequest>(`/api/reimbursements/${encodeURIComponent(requestId)}/approve`, { reviewer_id: reviewerId, notes }),
  rejectReimbursement: (requestId: string, reviewerId?: string, notes?: string) =>
    apiPost<ReimbursementRequest>(`/api/reimbursements/${encodeURIComponent(requestId)}/reject`, { reviewer_id: reviewerId, notes }),
  payoutReimbursement: (requestId: string, payoutMethod?: string, processedBy?: string, reference?: string) =>
    apiPost<{ status: string; request: ReimbursementRequest; payout_transaction_id: string; payout_reference: string; amount_usdc: number; payout_method: string }>(`/api/reimbursements/${encodeURIComponent(requestId)}/payout`, { payout_method: payoutMethod, processed_by: processedBy, reference }),
  reconcilePeriodEnd: (companyId: string = "INDO-POWER-PLANT-01", periodName: string = "August 2026") =>
    apiPost<{ reconciliation_id: string; company_id: string; period_name: string; total_allocated: number; total_consumed: number; total_unused_returned: number; action: string; status: string; reconciled_at: string }>("/api/metering/company/reconcile", { company_id: companyId, period_name: periodName }),
};

export interface ReimbursementRequest {
  id: string;
  request_number: string;
  employee_id: string;
  employee_name: string;
  company_id: string;
  payment_transaction_id: string;
  txn_id: string;
  amount_usdc: number;
  amount_microusdc: number;
  credits_covered: number;
  service: string;
  status: "PENDING_REIMBURSEMENT" | "AUTO_APPROVED" | "APPROVED" | "REJECTED" | "REIMBURSED";
  notes?: string;
  payer_address: string;
  reviewer_id?: string;
  reviewed_at?: string;
  reimbursed_at?: string;
  reimbursement_payout_txn_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementPolicy {
  id: string;
  company_id: string;
  max_reimbursement_per_employee_usdc: number;
  max_daily_overage_usdc: number;
  max_monthly_overage_usdc: number;
  auto_approval_threshold_usdc: number;
  require_receipt: boolean;
  allowed_services: string;
  is_active: boolean;
}

export interface ReimbursementSummary {
  pending_count: number;
  pending_amount_usdc: number;
  approved_count: number;
  approved_amount_usdc: number;
  reimbursed_count: number;
  reimbursed_amount_usdc: number;
  auto_approved_count: number;
  auto_approved_amount_usdc: number;
  rejected_count: number;
  rejected_amount_usdc: number;
  total_requests: number;
  total_overage_amount_usdc: number;
}

export interface ReimbursementListResponse {
  company_id: string;
  summary: ReimbursementSummary;
  requests: ReimbursementRequest[];
}

export interface CompanyEconomyDashboard {
  company_id: string;
  company_name: string;
  current_period: string;
  flow_a_base_platform: {
    cloud_infra_cost_usd: number;
    database_cost_usd: number;
    storage_cost_usd: number;
    baseline_ai_cost_usd: number;
    total_platform_cost_usd: number;
    company_monthly_budget_usd: number;
  };
  flow_b_employee_usage: {
    total_employees: number;
    allocated_usd: number;
    consumed_usd: number;
    unused_usd: number;
    allocated_credits: number;
    consumed_credits: number;
    remaining_credits: number;
    total_overage_events: number;
    total_employee_paid_overage_usdc: string;
  };
  flow_c_reimbursements: {
    pending_amount_usdc: number;
    pending_count: number;
    approved_amount_usdc: number;
    approved_count: number;
    reimbursed_amount_usdc: number;
    reimbursed_count: number;
    auto_approved_amount_usdc: number;
    auto_approved_count: number;
    total_reimbursement_requests: number;
    auto_approval_threshold_usdc: number;
  };
  flow_d_period_reconciliation: {
    total_pool_credits: number;
    available_unallocated_credits: number;
    reconciled_returned_credits: number;
    reconciled_returned_usd: number;
    reconciliation_rule: string;
  };
  employees: Array<{
    user_id: string;
    allocated_credits: number;
    used_credits: number;
    balance_credits: number;
    overage_count: number;
  }>;
}

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

export async function apiPut<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: "PUT",
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

export async function apiPatch<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: "PATCH",
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

export async function apiDelete<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: "DELETE",
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

export { BASE as API_BASE };
