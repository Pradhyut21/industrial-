// Realistic mock fixtures used when the live DeadMind backend is unreachable.
// This makes the entire UI render and demo-able in the Lovable preview without
// requiring a local backend on http://localhost:8000.

import type {
  Engineer,
  VulnNode,
  ChatResponse,
  ConsensusResponse,
  CausalLink,
  Counterfactual,
  Coreference,
  NetworkRow,
  SopRow,
  HalfLifeDoc,
  ShiftAnalysis,
  SemanticPoint,
  UploadResponse,
} from "./api";

const ENGINEERS: Engineer[] = [
  { name: "Rajan Sharma", role: "Senior Boiler & Turbine Lead", status: "Retired", retirement_date: "2026-03-15", retirement_year: 2026, avatar: "RS", risk_score: 92, specialties: "Boiler Operations, Steam Turbines, High Pressure Systems", cognitive_systematic: 85, cognitive_intuitive: 20, cognitive_mechanical: 90, cognitive_electrical: 30, cognitive_instrumentation: 45, cognitive_process: 80 },
  { name: "Amit Patel", role: "Electrical Maintenance Lead", status: "ACTIVE", retirement_date: "2031-08-10", retirement_year: 2031, avatar: "AP", risk_score: 45, specialties: "Switchgears, Transformers, Power Distribution", cognitive_systematic: 40, cognitive_intuitive: 85, cognitive_mechanical: 25, cognitive_electrical: 92, cognitive_instrumentation: 50, cognitive_process: 40 },
  { name: "Vikram Sen", role: "Instrumentation & Control Expert", status: "ACTIVE", retirement_date: "2033-05-12", retirement_year: 2033, avatar: "VS", risk_score: 30, specialties: "Control Valves, Loop Calibration, PLC Systems", cognitive_systematic: 75, cognitive_intuitive: 55, cognitive_mechanical: 35, cognitive_electrical: 45, cognitive_instrumentation: 95, cognitive_process: 70 },
  { name: "T. Nair", role: "Rotating Equipment Specialist", status: "ACTIVE", retirement_date: "2028-04-01", retirement_year: 2028, avatar: "TN", risk_score: 81, specialties: "Pumps, Seals, Bearings, Vibration Trend Analysis", cognitive_systematic: 78, cognitive_intuitive: 82, cognitive_mechanical: 95, cognitive_electrical: 32, cognitive_instrumentation: 50, cognitive_process: 60 },
  { name: "M. Pillai", role: "Process Veteran", status: "ACTIVE", retirement_date: "2026-09-15", retirement_year: 2026, avatar: "MP", risk_score: 96, specialties: "Distillation, Heat Exchange, Startup Procedures", cognitive_systematic: 70, cognitive_intuitive: 95, cognitive_mechanical: 55, cognitive_electrical: 35, cognitive_instrumentation: 60, cognitive_process: 99 },
  { name: "R. Nayar", role: "Senior Instrument Systems Engineer", status: "ACTIVE", retirement_date: "2027-06-30", retirement_year: 2027, avatar: "RN", risk_score: 88, specialties: "Positioner Calibration, Signal Drift, Field Devices", cognitive_systematic: 92, cognitive_intuitive: 45, cognitive_mechanical: 70, cognitive_electrical: 40, cognitive_instrumentation: 98, cognitive_process: 75 },
  { name: "S. Kulkarni", role: "High Pressure Safety Auditor", status: "ACTIVE", retirement_date: "2030-10-15", retirement_year: 2030, avatar: "SK", risk_score: 55, specialties: "Safety Valves, Relief Systems, Hazard Analysis", cognitive_systematic: 90, cognitive_intuitive: 60, cognitive_mechanical: 60, cognitive_electrical: 50, cognitive_instrumentation: 80, cognitive_process: 85 },
  { name: "H. Mehta", role: "Auxiliary Systems Technician", status: "ACTIVE", retirement_date: "2029-12-31", retirement_year: 2029, avatar: "HM", risk_score: 72, specialties: "Compressors, Heat Exchangers, Auxiliary Steam", cognitive_systematic: 65, cognitive_intuitive: 70, cognitive_mechanical: 85, cognitive_electrical: 60, cognitive_instrumentation: 55, cognitive_process: 60 },
  { name: "A. Joshi", role: "Automation & PLC Engineer", status: "ACTIVE", retirement_date: "2035-05-20", retirement_year: 2035, avatar: "AJ", risk_score: 25, specialties: "SCADA systems, Logic Controller, Network architecture", cognitive_systematic: 95, cognitive_intuitive: 80, cognitive_mechanical: 40, cognitive_electrical: 85, cognitive_instrumentation: 90, cognitive_process: 80 }
];

const NODES: VulnNode[] = [
  { tag: "TURBINE-04", name: "Auxiliary Steam Turbine", process_area: "Utility Section", x: 200, y: 120, criticality: "High", downtime_cost: 15000000, active_engineers: [{ name: "R. Nayar", retirement_year: 2027 }, { name: "H. Mehta", retirement_year: 2029 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "BOILER-2", name: "High-Pressure Boiler 2", process_area: "Utility Section", x: 500, y: 110, criticality: "High", downtime_cost: 18000000, active_engineers: [{ name: "R. Nayar", retirement_year: 2027 }, { name: "S. Kulkarni", retirement_year: 2030 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "P-302", name: "Boiler Feedwater Pump A", process_area: "Feedwater Station", x: 320, y: 420, criticality: "High", downtime_cost: 8000000, active_engineers: [{ name: "T. Nair", retirement_year: 2028 }, { name: "H. Mehta", retirement_year: 2029 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "B-101", name: "Primary Steam Boiler", process_area: "Utility Section", x: 460, y: 140, criticality: "High", downtime_cost: 12000000, active_engineers: [{ name: "S. Kulkarni", retirement_year: 2030 }], retired_engineers: [{ name: "Rajan Sharma", retirement_year: 2026 }], risk_level: "MEDIUM", color: "yellow" },
  { tag: "V-205", name: "Low-Ambient Control Valve", process_area: "Feedwater Station", x: 650, y: 250, criticality: "Medium", downtime_cost: 5000000, active_engineers: [{ name: "Vikram Sen", retirement_year: 2033 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "C-104", name: "Main Air Compressor", process_area: "Instrument Air Section", x: 180, y: 200, criticality: "High", downtime_cost: 10000000, active_engineers: [{ name: "Amit Patel", retirement_year: 2031 }, { name: "H. Mehta", retirement_year: 2029 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "S-501", name: "Main Electrical Switchgear", process_area: "Power House", x: 750, y: 380, criticality: "High", downtime_cost: 12000000, active_engineers: [{ name: "Amit Patel", retirement_year: 2031 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "E-310", name: "Feed/Effluent HX", process_area: "Reaction Section", x: 560, y: 360, criticality: "Medium", downtime_cost: 1800000, active_engineers: [{ name: "Vikram Sen", retirement_year: 2033 }], retired_engineers: [{ name: "M. Pillai", retirement_year: 2026 }], risk_level: "MEDIUM", color: "yellow" },
  { tag: "T-401", name: "Main Fractionator Column", process_area: "Distillation", x: 820, y: 460, criticality: "High", downtime_cost: 20000000, active_engineers: [{ name: "Vikram Sen", retirement_year: 2033 }, { name: "A. Joshi", retirement_year: 2035 }], retired_engineers: [{ name: "M. Pillai", retirement_year: 2026 }], risk_level: "MEDIUM", color: "yellow" },
  { tag: "D-220", name: "Reactor Knockout Drum", process_area: "Reaction Section", x: 660, y: 80, criticality: "Medium", downtime_cost: 7800000, active_engineers: [{ name: "S. Kulkarni", retirement_year: 2030 }], retired_engineers: [{ name: "M. Pillai", retirement_year: 2026 }], risk_level: "MEDIUM", color: "yellow" },
  { tag: "P-304", name: "Emergency Backup Pump", process_area: "Feedwater Station", x: 380, y: 480, criticality: "Medium", downtime_cost: 6000000, active_engineers: [{ name: "T. Nair", retirement_year: 2028 }, { name: "A. Joshi", retirement_year: 2035 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "H-102", name: "Primary Flue Gas Heater", process_area: "Utility Section", x: 580, y: 180, criticality: "Low", downtime_cost: 4000000, active_engineers: [{ name: "H. Mehta", retirement_year: 2029 }], retired_engineers: [], risk_level: "LOW", color: "green" },
  { tag: "V-206", name: "High-Pressure Safety Vessel", process_area: "Reaction Section", x: 700, y: 150, criticality: "High", downtime_cost: 14000000, active_engineers: [{ name: "S. Kulkarni", retirement_year: 2030 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" },
  { tag: "TURBINE-02", name: "Main Generator Turbine", process_area: "Power House", x: 850, y: 280, criticality: "High", downtime_cost: 25000000, active_engineers: [{ name: "A. Joshi", retirement_year: 2035 }], retired_engineers: [], risk_level: "MEDIUM", color: "yellow" }
];

const CHAT_ANSWERS: Record<string, string> = {
  default:
    "The procedure begins with isolation lockouts at both block valves. I always verify the local pressure indicator reads zero before breaking any flange — never trust the DCS alone. The torque sequence on the casing bolts matters: cross-pattern, 30% / 60% / 100%, and re-check after one heat cycle. The plant's been running these units since '98 and the one trap to avoid is over-tightening the gland; you'll warp the housing and chase a phantom leak for weeks.",
  zerospan:
    "For the B-101 and V-205 positioner zero-span: stroke the valve fully closed at 4 mA, confirm mechanical seat, then drive to 20 mA and verify full lift. The cam follower has a known tendency to drift after thermal cycling — re-check after 48 hours of steady state. If you see hysteresis above 1.5%, the bushing is worn; we replace, not adjust.",
  cavitation:
    "P-302 cavitation almost always starts at the suction strainer. Watch for a 5–8% drop in discharge pressure with rising motor amps — that's the signature. The reflux drum level controller is touchy; a tight tuning band masks it. I'd pull the strainer first, inspect the impeller eye for pitting, and verify NPSH margin against the latest curve, not the nameplate.",
  startup:
    "For the V-205 vessel pre-startup checks: check the pressure baseline sensor offsets first. Ensure the local isolation block valves are verified physically open, and run the standard SOP-114 purge sequence. Watch for low-temperature feedback drift which can trip the downstream line interlocks."
};

function mockChat(query: string, engineer: string): ChatResponse {
  const q = query.toLowerCase();
  let answer = CHAT_ANSWERS.default;
  if (q.includes("zero") || q.includes("span") || q.includes("positioner")) answer = CHAT_ANSWERS.zerospan;
  else if (q.includes("cavit") || q.includes("p-302") || q.includes("pump")) answer = CHAT_ANSWERS.cavitation;
  else if (q.includes("startup") || q.includes("v-205") || q.includes("checks")) answer = CHAT_ANSWERS.startup;
  return {
    answer,
    engineer: engineer || "R. Nayar",
    confidence: 0.88,
    citations: [
      { id: 11, title: "Shift Log 2019-04-22 — C-104 Trip", author: engineer || "R. Nayar", equipment_tag: "C-104", failure_code: "VIB-HIGH" },
      { id: 27, title: "Overhaul Report 2021", author: "T. Nair", equipment_tag: "P-302", failure_code: "CAV-01" },
      { id: 38, title: "Startup Procedure SOP-114", author: "M. Pillai", equipment_tag: "V-205", failure_code: "—" },
    ],
    related_context: [
      "Vibration trend 2018–2026 indicates progressive bearing wear",
      "Two prior cavitation events on sister pump P-302B (2020, 2022)",
      "Pillai's note on heat-soak interval contradicts the OEM manual",
    ],
    uncertainty: { sparsity: "LOW", staleness: "MEDIUM", disagreement: "LOW", causal: "MEDIUM", risk_score: 28 },
  };
}

const CAUSAL: Record<string, CausalLink[]> = {
  default: [
    { id: 1, equipment_tag: "C-104", parent_event: "Lube oil temp rise", child_event: "Bearing whirl", is_prediction: 0, description: "Sustained 8°C rise over 72h preceded the 2019 trip." },
    { id: 2, equipment_tag: "C-104", parent_event: "Bearing whirl", child_event: "Vibration alarm", is_prediction: 0, description: "Whirl frequency at 0.42x running speed." },
    { id: 3, equipment_tag: "C-104", parent_event: "Vibration alarm", child_event: "Forecast trip in 14 days", is_prediction: 1, description: "If oil temp trends repeat, expect trip mid-month." },
  ],
};

const COUNTERFACTUALS: Record<string, Counterfactual[]> = {
  default: [
    { id: 1, equipment_tag: "C-104", title: "What if R. Nayar retires without succession?", intervention: "No knowledge transfer to backup; rely on OEM hotline.", cost_avoided_crore: 4.2, consequences: "14-day unplanned outage; OEM dispatch from Germany; lost margin on hydrogen recycle; reputational hit with regulator" },
    { id: 2, equipment_tag: "C-104", title: "What if voice notes were captured weekly?", intervention: "Structured 2-min weekly recording on standing anomalies.", cost_avoided_crore: 1.8, consequences: "Earlier detection of oil-temp drift; smaller intervention window; no fractionator knock-on" },
  ],
};

const SOP: SopRow[] = [
  { id: 1, sop_id: "SOP-2019-047", step_number: 1, step_desc: "Verify feedwater pump suction valves are open", compliance_rate: 1.00, workaround_detected: "None" },
  { id: 2, sop_id: "SOP-2019-047", step_number: 2, step_desc: "Check mechanical positioner feedback arm alignment", compliance_rate: 0.82, workaround_detected: "Often verified visually rather than dial gauge calibration" },
  { id: 3, sop_id: "SOP-2019-047", step_number: 3, step_desc: "Calibrate zero pressure baseline offsets", compliance_rate: 0.34, workaround_detected: "Skipped on warm startup to save 45 minutes; leads to sensor drift risk" },
  { id: 4, sop_id: "SOP-2019-047", step_number: 4, step_desc: "Run two-engineer sign-off interlock check", compliance_rate: 0.17, workaround_detected: "Engineers consistently skip and perform Step 4 before Step 3. Rajan's custom sequence has 100% success rate." },
];

const HALF_LIFE: HalfLifeDoc[] = [
  { id: 1, title: "C-104 Overhaul Manual rev.3", engineer_author: "Amit Patel", age_years: 9, reference_count: 42, contradiction_count: 3, hardware_generation: "Gen 2", freshness_score: 0.31, status: "STALE WARNING" },
  { id: 2, title: "B-101 Burner Tuning Notes", engineer_author: "Rajan Sharma", age_years: 4, reference_count: 18, contradiction_count: 0, hardware_generation: "Gen 1", freshness_score: 0.78, status: "FRESH" },
  { id: 3, title: "V-205 Startup Procedure", engineer_author: "Vikram Sen", age_years: 14, reference_count: 67, contradiction_count: 7, hardware_generation: "Gen 2", freshness_score: 0.12, status: "CRITICAL DANGER" },
  { id: 4, title: "P-302 Seal Selection Guide", engineer_author: "T. Nair", age_years: 6, reference_count: 22, contradiction_count: 1, hardware_generation: "Gen 2", freshness_score: 0.62, status: "FRESH" },
  { id: 5, title: "TURBINE-04 Governor Tuning Notes", engineer_author: "R. Nayar", age_years: 2, reference_count: 14, contradiction_count: 0, hardware_generation: "Gen 2", freshness_score: 0.95, status: "FRESH" },
  { id: 6, title: "BOILER-2 Solenoid Check Report", engineer_author: "R. Nayar", age_years: 1, reference_count: 9, contradiction_count: 1, hardware_generation: "Gen 2", freshness_score: 0.89, status: "FRESH" }
];

const COREF: Coreference[] = [
  { id: 1, standard_name: "B-101 Primary Steam Boiler", alias_name: "B-101", entity_type: "EQUIPMENT", confidence: 0.98 },
  { id: 2, standard_name: "B-101 Primary Steam Boiler", alias_name: "Boiler 101", entity_type: "EQUIPMENT", confidence: 0.95 },
  { id: 3, standard_name: "B-101 Primary Steam Boiler", alias_name: "the main boiler", entity_type: "EQUIPMENT", confidence: 0.88 },
  { id: 4, standard_name: "Rajan Sharma", alias_name: "R. Sharma", entity_type: "PERSON", confidence: 0.95 },
  { id: 5, standard_name: "Rajan Sharma", alias_name: "Rajan S.", entity_type: "PERSON", confidence: 0.99 },
  { id: 6, standard_name: "Feedwater Cavitation", alias_name: "pump surge", entity_type: "PHENOMENON", confidence: 0.82 },
  { id: 7, standard_name: "Feedwater Cavitation", alias_name: "flow instability", entity_type: "PHENOMENON", confidence: 0.85 },
  { id: 8, standard_name: "R. Nayar", alias_name: "Nayar", entity_type: "PERSON", confidence: 0.99 },
  { id: 9, standard_name: "R. Nayar", alias_name: "R. Nayar", entity_type: "PERSON", confidence: 1.00 },
  { id: 10, standard_name: "Senior Instrument Engineer", alias_name: "R. Nayar", entity_type: "PERSON", confidence: 0.90 },
  { id: 11, standard_name: "BOILER-2", alias_name: "Boiler 2", entity_type: "EQUIPMENT", confidence: 0.97 },
  { id: 12, standard_name: "TURBINE-04", alias_name: "Aux Turbine", entity_type: "EQUIPMENT", confidence: 0.94 }
];

const NETWORK: NetworkRow[] = [
  { id: 1, engineer: "Vikram Sen", centrality: 0.89, dependencies: "Rajan Sharma, Amit Patel", domains_affected: 3, resilience_drop: 0.33 },
  { id: 2, engineer: "Rajan Sharma", centrality: 0.72, dependencies: "Vikram Sen", domains_affected: 2, resilience_drop: 0.24 },
  { id: 3, engineer: "Amit Patel", centrality: 0.45, dependencies: "Vikram Sen", domains_affected: 1, resilience_drop: 0.12 },
  { id: 4, engineer: "T. Nair", centrality: 0.65, dependencies: "Rajan Sharma", domains_affected: 2, resilience_drop: 0.20 },
  { id: 5, engineer: "M. Pillai", centrality: 0.82, dependencies: "R. Nayar, Rajan Sharma", domains_affected: 4, resilience_drop: 0.38 },
  { id: 6, engineer: "R. Nayar", centrality: 0.78, dependencies: "Vikram Sen", domains_affected: 3, resilience_drop: 0.30 }
];

const SEM: SemanticPoint[] = Array.from({ length: 24 }, (_, i) => ({
  id: i, equipment_tag: "C-104", year: 2014 + Math.floor(i / 3),
  phrase: ["bearing hum", "lube drift", "whirl onset", "temp creep", "seal weep", "fan slip"][i % 6],
  vector_x: Math.cos(i * 0.4) * 0.6 + (i / 60), vector_y: Math.sin(i * 0.4) * 0.5 + (i / 80),
  severity_index: 0.3 + (i / 50),
}));

const CONSENSUS: ConsensusResponse = {
  consensus: "Pull the suction strainer first, then inspect the impeller eye. R. Nayar and Vikram Sen agree NPSH margin should be verified against the latest test curve, not the nameplate. Pillai dissents on tuning band — recommends a wider window during summer ambient.",
  agreement: "STRONG",
  weights: { "R. Nayar": 0.45, "Vikram Sen": 0.35, "M. Pillai": 0.20 },
  dissent: "Pillai prefers a wider tuning band in summer; both other voices favour the OEM curve. The dissent matters only when ambient exceeds 38°C.",
};

const SHIFT_HIT: ShiftAnalysis = {
  triggered: true,
  details: {
    tag: "P-302",
    expert: "T. Nair",
    alert: "Suction pressure drift + motor amp climb matches the 2020 cavitation signature.",
    guide: "Pull strainer within 24h. Inspect impeller eye for pitting. Verify NPSH against test curve.",
    causal_warning: "Untreated → fractionator reflux upset within 72h → 1.2 Cr/day margin loss.",
  },
};

const SHIFT_MISS: ShiftAnalysis = { triggered: false };

export const mock = {
  engineers: (): Engineer[] => ENGINEERS,
  vulnerabilityMap: (): VulnNode[] => NODES,
  chat: mockChat,
  consensus: (): ConsensusResponse => CONSENSUS,
  causal: (tag: string): CausalLink[] =>
    (CAUSAL[tag] ?? CAUSAL.default).map((c) => ({ ...c, equipment_tag: tag })),
  counterfactuals: (tag: string): Counterfactual[] =>
    (COUNTERFACTUALS[tag] ?? COUNTERFACTUALS.default).map((c) => ({ ...c, equipment_tag: tag })),
  coreference: (): Coreference[] => COREF,
  network: (): NetworkRow[] => NETWORK,
  sopAudit: (): SopRow[] => SOP,
  halfLife: (): HalfLifeDoc[] => HALF_LIFE,
  semanticDrift: (tag: string): SemanticPoint[] => SEM.map((s) => ({ ...s, equipment_tag: tag })),
  analyzeShiftNote: (note: string): ShiftAnalysis => {
    const n = note.toLowerCase();
    if (n.includes("pump") || n.includes("p-302") || n.includes("amp") || n.includes("suction") || n.length > 40) return SHIFT_HIT;
    return SHIFT_MISS;
  },
  upload: (): UploadResponse => ({
    status: "ok",
    data: { id: Math.floor(Math.random() * 10000), title: "Ingested Document", author: "R. Nayar", equipment_tag: "TURBINE-04", failure_code: "GOV-01", confidence: 0.95 },
  }),
  voiceNote: () => ({ status: "ok", message: "Voice note indexed against R. Nayar's corpus." }),
};
