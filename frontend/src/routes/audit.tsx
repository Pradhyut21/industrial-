import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Coins,
  Plus,
  RefreshCw,
  Copy,
  User,
  ShieldAlert,
  FileEdit,
  X,
  UserMinus,
  UserCheck,
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  Activity,
  CheckSquare,
  Square,
  GitPullRequest,
  GitCommit,
  GitMerge,
  GitBranch,
  History,
  Send,
  Check,
  FileCode,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { SpritePortrait } from "@/components/SpritePortrait";
import type { OfficeCharacterName } from "@/scene/office/cast";

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "");

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Project & Operations Hub — DeadMind CollabFlow" },
      { name: "description", content: "Executive project intelligence: 10-phase pipeline, employee succession simulator, employee work profiles, git pull requests, and manager submission workflow." },
    ],
  }),
  component: ProjectOperationsHub,
});

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  avatarChar: OfficeCharacterName;
  pod: string;
  knowledgePreserved: number;
  activeTask: string;
  verifiedSops: number;
  successor: {
    name: string;
    role: string;
    avatarChar: OfficeCharacterName;
    skillOverlap: number;
    readiness: "Immediate" | "1-Day Handover" | "1-Week Shadow";
    transferPlan: string;
  };
}

interface StageInfo {
  phase: string;
  stageNumber: number;
  domain: string;
  domainManager: {
    name: string;
    role: string;
    avatarChar: OfficeCharacterName;
  };
  title: string;
  progress: number;
  status: "Completed" | "In Progress" | "Pending";
  description: string;
  deliverables: Array<{ id: string; name: string; done: boolean }>;
  blockers: string[];
  employees: EmployeeData[];
}

const INITIAL_STAGES: Record<string, StageInfo> = {
  Idea: {
    phase: "Idea",
    stageNumber: 1,
    domain: "Executive Strategy & Roadmapping",
    domainManager: {
      name: "Marcus Vance",
      role: "Principal Plant Strategist",
      avatarChar: "superintendent",
    },
    title: "Conceptualization & Problem Synthesis",
    progress: 100,
    status: "Completed",
    description: "Identify plant cognitive decay risks, retirement schedules, and institutional knowledge preservation scope.",
    deliverables: [
      { id: "d1", name: "Plant Memory Vulnerability Assessment", done: true },
      { id: "d2", name: "CFO Business Impact Model (10.86 Cr)", done: true },
      { id: "d3", name: "Initial Multi-Agent Pod Architecture RFC", done: true },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-1",
        name: "Marcus Vance",
        role: "Principal Plant Strategist",
        avatarChar: "superintendent",
        pod: "Executive Strategy Pod",
        knowledgePreserved: 98,
        activeTask: "Finalized 2026 cognitive continuity vision and plant exposure roadmap.",
        verifiedSops: 34,
        successor: {
          name: "Dev Sen",
          role: "Deputy Operations Lead",
          avatarChar: "dcs_lead",
          skillOverlap: 92,
          readiness: "Immediate",
          transferPlan: "Full cognitive twin model synchronized with zero knowledge gap.",
        },
      },
    ],
  },
  Planning: {
    phase: "Planning",
    stageNumber: 2,
    domain: "Compliance & Statutory Operations",
    domainManager: {
      name: "Ananya Deshmukh",
      role: "Chief Compliance Administrator",
      avatarChar: "compliance_officer",
    },
    title: "Sprint Planning & Resource Allocation",
    progress: 100,
    status: "Completed",
    description: "Map team workstreams across Boiler, Controls, and Testing pods with strict safety governance.",
    deliverables: [
      { id: "p1", name: "14-Sprint High-Velocity Execution Plan", done: true },
      { id: "p2", name: "Plant Hardware & Modbus Interface Specs", done: true },
      { id: "p3", name: "Role-Based Access & Clearance Matrix", done: true },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-3",
        name: "Ananya Deshmukh",
        role: "Chief Compliance Administrator",
        avatarChar: "compliance_officer",
        pod: "Admin & Operations Pod",
        knowledgePreserved: 99,
        activeTask: "Validated all regulatory clearances for industrial sensor network.",
        verifiedSops: 46,
        successor: {
          name: "Omar Farooq",
          role: "Senior Process Analyst",
          avatarChar: "vibration_analyst",
          skillOverlap: 94,
          readiness: "Immediate",
          transferPlan: "Compliance ledger and statutory checksheets fully duplicated.",
        },
      },
    ],
  },
  Design: {
    phase: "Design",
    stageNumber: 3,
    domain: "UX & Digital Twin Architecture",
    domainManager: {
      name: "Priya Nair",
      role: "Plant Operations & UX Specialist",
      avatarChar: "asset_health",
    },
    title: "System Architecture & Digital Twin UI",
    progress: 100,
    status: "Completed",
    description: "Design multi-agent office simulations, 3D floor maps, and real-time telemetry graphs.",
    deliverables: [
      { id: "ds1", name: "Multi-Agent Office Procedural Sprite Sheets", done: true },
      { id: "ds2", name: "Digital Twin Sensor Schema (Modbus TCP)", done: true },
      { id: "ds3", name: "Executive CFO Vulnerability Map Wireframes", done: true },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-5",
        name: "Priya Nair",
        role: "Plant Operations & UX Specialist",
        avatarChar: "asset_health",
        pod: "Executive Strategy Pod",
        knowledgePreserved: 95,
        activeTask: "Designed ergonomic multi-agent office layout and alert hierarchy.",
        verifiedSops: 28,
        successor: {
          name: "Alex Mercer",
          role: "Lead QA Engineer",
          avatarChar: "reliability_spec",
          skillOverlap: 87,
          readiness: "1-Day Handover",
          transferPlan: "Complete Figma design system and SVG telemetry library mirrored.",
        },
      },
    ],
  },
  Building: {
    phase: "Building",
    stageNumber: 4,
    domain: "Boiler & Plant Operations",
    domainManager: {
      name: "Rajan Sharma",
      role: "Senior Boiler Lead Specialist",
      avatarChar: "boiler_lead",
    },
    title: "Core Engineering & Cognitive Vault",
    progress: 88,
    status: "In Progress",
    description: "Develop RAG vectors, SQLite persistence, and real-time multi-agent desk simulations.",
    deliverables: [
      { id: "b1", name: "Deploy Multi-Agent Pod Workspace & Desks", done: true },
      { id: "b2", name: "Build Boiler Emergency Bypass State Engine", done: true },
      { id: "b3", name: "Implement 6.6kV Fast-Transfer Interlock Logic", done: false },
    ],
    blockers: ["Modbus TCP simulation server latency on port 502"],
    employees: [
      {
        id: "emp-7",
        name: "Rajan Sharma",
        role: "Senior Boiler Lead Specialist",
        avatarChar: "boiler_lead",
        pod: "Boiler Operations Pod",
        knowledgePreserved: 97,
        activeTask: "PRJ-OPS-01: Digitizing 28 historical boiler drum emergency runbooks.",
        verifiedSops: 38,
        successor: {
          name: "Alex Mercer",
          role: "Reliability & QA Engineer",
          avatarChar: "reliability_spec",
          skillOverlap: 93,
          readiness: "Immediate",
          transferPlan: "Boiler startup curves & drum level drift models pre-loaded in DeadMind.",
        },
      },
      {
        id: "emp-8",
        name: "K.V. Ramanathan",
        role: "Controls & Switchgear Lead",
        avatarChar: "power_specialist",
        pod: "Electrical Controls Pod",
        knowledgePreserved: 94,
        activeTask: "PRJ-ENG-04: Tuning 80ms fast transfer interlocks on 6.6kV vacuum breakers.",
        verifiedSops: 41,
        successor: {
          name: "Rajan Sharma",
          role: "Senior Electrical Auditor",
          avatarChar: "boiler_lead",
          skillOverlap: 91,
          readiness: "1-Day Handover",
          transferPlan: "Switchgear schematic registers mapped with zero contradiction drift.",
        },
      },
    ],
  },
  Review: {
    phase: "Review",
    stageNumber: 5,
    domain: "Industrial Safety & Standards",
    domainManager: {
      name: "Rajan Sharma",
      role: "Safety & Compliance Officer",
      avatarChar: "boiler_lead",
    },
    title: "Peer Engineering & Safety Review",
    progress: 75,
    status: "In Progress",
    description: "Multi-pod peer reviews verifying safety assertions against NFPA-85 and OISD standards.",
    deliverables: [
      { id: "r1", name: "Boiler Drum Differential Pressure Assertion", done: true },
      { id: "r2", name: "Arc-Flash Safety Barrier Verification", done: true },
      { id: "r3", name: "RAG Semantic Contradiction Elimination", done: false },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-9",
        name: "Rajan Sharma",
        role: "Safety & Compliance Officer",
        avatarChar: "boiler_lead",
        pod: "Industrial Safety Pod",
        knowledgePreserved: 99,
        activeTask: "Conducting automated OISD-118 regression tests against all 58 runbooks.",
        verifiedSops: 49,
        successor: {
          name: "Ananya Deshmukh",
          role: "Safety Auditor",
          avatarChar: "compliance_officer",
          skillOverlap: 95,
          readiness: "Immediate",
          transferPlan: "Compliance matrix fully certified for ISO-55001 compliance.",
        },
      },
    ],
  },
  Testing: {
    phase: "Testing",
    stageNumber: 6,
    domain: "Testing & Reliability QA",
    domainManager: {
      name: "Alex Mercer",
      role: "Lead QA & Reliability Engineer",
      avatarChar: "reliability_spec",
    },
    title: "Automated QA & Fault Injection",
    progress: 60,
    status: "In Progress",
    description: "Continuous PyTest suites asserting zero-span sensor drift and emergency bypass stability.",
    deliverables: [
      { id: "t1", name: "PyTest Suite for B-101 Positioner Calibration", done: true },
      { id: "t2", name: "Thermal Sensor Fault Injection Simulation", done: true },
      { id: "t3", name: "Hardware Rig Assertion in Calibration Lab 4", done: false },
    ],
    blockers: ["Physical calibration rig in Lab 4 awaiting hardware delivery"],
    employees: [
      {
        id: "emp-10",
        name: "Alex Mercer",
        role: "Lead QA & Reliability Engineer",
        avatarChar: "reliability_spec",
        pod: "Testing & QA Pod",
        knowledgePreserved: 92,
        activeTask: "PRJ-TEST-09: Positioner zero-span calibration automated assertions.",
        verifiedSops: 29,
        successor: {
          name: "Rajan Sharma",
          role: "Boiler Operations Lead",
          avatarChar: "boiler_lead",
          skillOverlap: 93,
          readiness: "Immediate",
          transferPlan: "Automated test scripts with 98% PyTest assertion coverage.",
        },
      },
    ],
  },
  Staging: {
    phase: "Staging",
    stageNumber: 7,
    domain: "Operations Staging & Parity",
    domainManager: {
      name: "Dev Sen",
      role: "Plant Operations Co-Lead",
      avatarChar: "dcs_lead",
    },
    title: "Plant Twin Staging Deployment",
    progress: 40,
    status: "In Progress",
    description: "Shadow deployment mirroring live plant SCADA telemetry in isolated environment.",
    deliverables: [
      { id: "s1", name: "Telemetry Mirroring Daemon Setup", done: true },
      { id: "s2", name: "Live Shadow Run on Shift B Workload", done: false },
      { id: "s3", name: "Failover Redundancy Testing", done: false },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-11",
        name: "Dev Sen",
        role: "Plant Operations Co-Lead",
        avatarChar: "dcs_lead",
        pod: "Executive Strategy Pod",
        knowledgePreserved: 93,
        activeTask: "Monitoring telemetry parity between physical PLC and Digital Twin.",
        verifiedSops: 31,
        successor: {
          name: "Marcus Vance",
          role: "Principal Strategist",
          avatarChar: "superintendent",
          skillOverlap: 90,
          readiness: "Immediate",
          transferPlan: "Operations telemetry dashboard fully configured.",
        },
      },
    ],
  },
  "Client OK": {
    phase: "Client OK",
    stageNumber: 8,
    domain: "Executive Strategy & Client Sign-off",
    domainManager: {
      name: "Marcus Vance",
      role: "Principal Plant Strategist",
      avatarChar: "superintendent",
    },
    title: "Client & Plant Head Sign-off",
    progress: 25,
    status: "Pending",
    description: "Demonstrate zero-downtime succession handover and executive ROI to Plant General Manager.",
    deliverables: [
      { id: "c1", name: "Executive Continuity ROI Presentation", done: true },
      { id: "c2", name: "Simulated Offboarding Handover Demo", done: false },
      { id: "c3", name: "Signed Plant Acceptance Certificate", done: false },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-12",
        name: "Marcus Vance",
        role: "Principal Plant Strategist",
        avatarChar: "superintendent",
        pod: "Executive Strategy Pod",
        knowledgePreserved: 98,
        activeTask: "Presenting executive briefing to client leadership.",
        verifiedSops: 34,
        successor: {
          name: "Priya Nair",
          role: "Operations Liaison",
          avatarChar: "asset_health",
          skillOverlap: 89,
          readiness: "Immediate",
          transferPlan: "Client sign-off documentation archived.",
        },
      },
    ],
  },
  "Pre-Prod": {
    phase: "Pre-Prod",
    stageNumber: 9,
    domain: "Infrastructure & Hardening",
    domainManager: {
      name: "Omar Farooq",
      role: "Financial & Infrastructure Analyst",
      avatarChar: "vibration_analyst",
    },
    title: "Pre-Production Hardening",
    progress: 10,
    status: "Pending",
    description: "Final air-gapped security lockdown and backup sync to on-premise vault.",
    deliverables: [
      { id: "pp1", name: "Air-gapped Vector Index Backup", done: true },
      { id: "pp2", name: "Role Clearance Hardening", done: false },
      { id: "pp3", name: "High-Availability Hot Standby Verification", done: false },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-13",
        name: "Omar Farooq",
        role: "Financial & Infrastructure Analyst",
        avatarChar: "vibration_analyst",
        pod: "Admin & Operations Pod",
        knowledgePreserved: 96,
        activeTask: "Executing pre-prod database redundancy verification.",
        verifiedSops: 37,
        successor: {
          name: "Ananya Deshmukh",
          role: "Compliance Administrator",
          avatarChar: "compliance_officer",
          skillOverlap: 92,
          readiness: "Immediate",
          transferPlan: "Air-gapped database snapshot scripts certified.",
        },
      },
    ],
  },
  Done: {
    phase: "Done",
    stageNumber: 10,
    domain: "Continuous Plant Continuity",
    domainManager: {
      name: "Rajan Sharma",
      role: "Senior Boiler Lead Specialist",
      avatarChar: "boiler_lead",
    },
    title: "Active Production Continuity",
    progress: 0,
    status: "Pending",
    description: "Continuous real-time cognitive preservation across all 3 plant pods.",
    deliverables: [
      { id: "dn1", name: "Continuous Autonomous Knowledge Capture", done: false },
      { id: "dn2", name: "24/7 Multi-Agent Digital Twin Operation", done: false },
      { id: "dn3", name: "Zero Unplanned Knowledge Loss SLA", done: false },
    ],
    blockers: [],
    employees: [
      {
        id: "emp-14",
        name: "Rajan Sharma",
        role: "Senior Boiler Lead Specialist",
        avatarChar: "boiler_lead",
        pod: "Boiler Operations Pod",
        knowledgePreserved: 97,
        activeTask: "Continuous operational custody of Boiler unit assets.",
        verifiedSops: 38,
        successor: {
          name: "Alex Mercer",
          role: "Reliability & QA Engineer",
          avatarChar: "reliability_spec",
          skillOverlap: 93,
          readiness: "Immediate",
          transferPlan: "Continuous multi-agent twin active.",
        },
      },
    ],
  },
};

const DETAILED_EMPLOYEES = [
  {
    id: "rajan",
    name: "Rajan Sharma",
    role: "Senior Boiler Lead Specialist",
    pod: "Boiler Operations Pod",
    avatarChar: "boiler_lead" as const,
    knowledgePreserved: 97,
    verifiedSops: 38,
    commitsCount: 142,
    activeWork: {
      title: "PRJ-OPS-01: Secondary Superheater Pressure Bypass Calibration",
      branch: "feature/boiler-bypass-curve",
      targetAsset: "B-101 (Secondary Superheater)",
      status: "In Flight · Sprint 4",
      description: "Tuning differential pressure trip threshold to prevent thermal shock during rapid cold-start bypass.",
      acceptanceCriteria: [
        "1. Calibrate thermocouple response curve under 400°C.",
        "2. Validate against historical thermal incident logs from 2021 turnaround.",
        "3. Preserve step-by-step recovery guide into DeadMind vector store.",
      ],
    },
    inheritedWork: {
      predecessor: "S. Namboodiri (Former Senior Boiler Chief · Retired 2024)",
      handoverDate: "November 2024",
      inheritedAssets: [
        "14 Baseline Boiler Startup Curves",
        "Emergency Steam Drum Trip SOP v1.0",
        "Historical Burner Igniter Differential Records",
      ],
      handoverNotes:
        "S. Namboodiri logged that valve V-204 required a 4.05mA zero-span setting during monsoon cold-starts to counter back-pressure. Successfully preserved in DeadMind with 100% memory retention.",
      status: "Zero-Loss Handover Verified",
    },
  },
  {
    id: "ramanathan",
    name: "K.V. Ramanathan",
    role: "Controls & Switchgear Lead",
    pod: "Electrical Controls Pod",
    avatarChar: "power_specialist" as const,
    knowledgePreserved: 94,
    verifiedSops: 41,
    commitsCount: 128,
    activeWork: {
      title: "PRJ-ENG-04: 6.6kV Vacuum Breaker Fast-Transfer Interlock Tuning",
      branch: "feature/6.6kv-bus-transfer",
      targetAsset: "K-301 (6.6kV Bus-Tie Substation)",
      status: "In Review · Sprint 4",
      description: "Aligning vacuum circuit breaker bus transfer delay to under 80ms to eliminate arc-flash hazards.",
      acceptanceCriteria: [
        "1. Fast-transfer timing verified via oscilloscope telemetry.",
        "2. Interlock assertions tested across Bus-A and Bus-B fault states.",
        "3. SCADA Modbus register mappings verified with 0 contradiction drift.",
      ],
    },
    inheritedWork: {
      predecessor: "V. Swaminathan (Lead Electrical Specialist · Retired 2025)",
      handoverDate: "March 2025",
      inheritedAssets: [
        "6.6kV Switchgear Protective Relay Schemes",
        "Transformer Oil Dielectric Breakdown Test Runs",
        "Emergency Diesel Generator Auto-Sync Sequence",
      ],
      handoverNotes:
        "Transferred complete substation relay coordination curves. Critical note on vacuum bottle wear indicators verified without any operational blind spot.",
      status: "Zero-Loss Handover Verified",
    },
  },
  {
    id: "alex",
    name: "Alex Mercer",
    role: "Lead QA & Reliability Engineer",
    pod: "Testing & QA Pod",
    avatarChar: "reliability_spec" as const,
    knowledgePreserved: 92,
    verifiedSops: 29,
    commitsCount: 165,
    activeWork: {
      title: "PRJ-TEST-09: Automated Zero-Span Positioner PyTest Regression",
      branch: "test/positioner-zero-span",
      targetAsset: "B-101 (Valve Positioner Rig)",
      status: "Active Testing · Sprint 4",
      description: "Automated regression tests asserting zero-drift tolerances on 4-20mA mechanical positioners.",
      acceptanceCriteria: [
        "1. 500-cycle stress test asserting ±0.05% deadband repeatability.",
        "2. PyTest assertions for OISD-118 Section 4.2 compliance.",
        "3. Automated CI/CD execution pipeline passing with zero errors.",
      ],
    },
    inheritedWork: {
      predecessor: "David Wallace (Senior QA Principal · Reassigned 2025)",
      handoverDate: "January 2025",
      inheritedAssets: [
        "Plant Hardware Fault Injection Testbeds",
        "Pressure Transmitter Calibration Harnesses",
        "Legacy PyTest Automation Scripts",
      ],
      handoverNotes:
        "Inherited complete sensor calibration testbeds. Upgraded legacy manual checksheets into continuous automated assertions.",
      status: "Zero-Loss Handover Verified",
    },
  },
  {
    id: "michael",
    name: "Marcus Vance",
    role: "Principal Plant Operations Strategist",
    pod: "Executive Strategy Pod",
    avatarChar: "superintendent" as const,
    knowledgePreserved: 98,
    verifiedSops: 34,
    commitsCount: 190,
    activeWork: {
      title: "PRJ-EXEC-01: Multi-Agent Pod Cognitive Retention Model",
      branch: "main/executive-roadmap",
      targetAsset: "Plant-Wide Cognitive Infrastructure",
      status: "Completed & Sealed",
      description: "Executive strategic framework safeguarding 10.86 Cr in plant downtime risk through AI pod twins.",
      acceptanceCriteria: [
        "1. Quantify CFO financial risk reduction across all 5 plant units.",
        "2. Establish 10-phase milestone verification criteria.",
        "3. Executive brief automation active with 1-click refresh.",
      ],
    },
    inheritedWork: {
      predecessor: "Foundational Operations Committee (2020-2024)",
      handoverDate: "August 2024",
      inheritedAssets: [
        "Historical Plant Downtime Loss Reports",
        "Retirement Schedule Projections (2026-2036)",
        "Executive Strategy Mandates",
      ],
      handoverNotes:
        "Transformed static annual reports into a live interactive multi-agent digital twin ecosystem.",
      status: "Zero-Loss Handover Verified",
    },
  },
];

const DOMAIN_MANAGERS = [
  {
    id: "rajan",
    name: "Rajan Sharma",
    role: "Senior Boiler Lead Specialist",
    avatarChar: "boiler_lead" as const,
    domain: "Boiler & Plant Operations",
    pod: "Boiler Operations Pod",
  },
  {
    id: "michael",
    name: "Marcus Vance",
    role: "Principal Plant Strategist",
    avatarChar: "superintendent" as const,
    domain: "Executive Strategy & Roadmapping / Client Sign-off",
    pod: "Executive Strategy Pod",
  },
  {
    id: "angela",
    name: "Ananya Deshmukh",
    role: "Chief Compliance Administrator",
    avatarChar: "compliance_officer" as const,
    domain: "Compliance & Statutory Operations",
    pod: "Admin & Operations Pod",
  },
  {
    id: "pam",
    name: "Priya Nair",
    role: "Plant Operations & UX Specialist",
    avatarChar: "asset_health" as const,
    domain: "UX & Digital Twin Architecture",
    pod: "Executive Strategy Pod",
  },
  {
    id: "dwight",
    name: "Rajan Sharma",
    role: "Safety & Compliance Officer",
    avatarChar: "boiler_lead" as const,
    domain: "Industrial Safety & Standards",
    pod: "Industrial Safety Pod",
  },
  {
    id: "alex",
    name: "Alex Mercer",
    role: "Lead QA & Reliability Engineer",
    avatarChar: "reliability_spec" as const,
    domain: "Testing & QA Reliability",
    pod: "Testing & QA Pod",
  },
  {
    id: "jim",
    name: "Dev Sen",
    role: "Plant Operations Co-Lead",
    avatarChar: "dcs_lead" as const,
    domain: "Operations Staging & Parity",
    pod: "Executive Strategy Pod",
  },
  {
    id: "oscar",
    name: "Omar Farooq",
    role: "Financial & Infrastructure Analyst",
    avatarChar: "vibration_analyst" as const,
    domain: "Infrastructure & Hardening",
    pod: "Admin & Operations Pod",
  },
  {
    id: "viewer",
    name: "General Plant Operator",
    role: "Field Instrumentation Technician (Read-Only)",
    avatarChar: "instrumentation" as const,
    domain: "General Viewer Clearance",
    pod: "Operations Floor",
  },
];

function ProjectOperationsHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pipeline" | "profiles">("pipeline");

  // Stage state
  const [stages, setStages] = useState<Record<string, StageInfo>>(INITIAL_STAGES);
  const [selectedPhase, setSelectedPhase] = useState<string>("Building");
  const [departingEmployee, setDepartingEmployee] = useState<EmployeeData | null>(null);

  // Active Signed-In Domain Manager state (default: Rajan Sharma)
  const [currentManager, setCurrentManager] = useState(DOMAIN_MANAGERS[0]);
  const [showManagerAuthModal, setShowManagerAuthModal] = useState<boolean>(false);

  // Selected Profile state
  const [selectedProfile, setSelectedProfile] = useState(DETAILED_EMPLOYEES[0]);

  // Submission / Pull Request modal state
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [newPrTitle, setNewPrTitle] = useState<string>("");
  const [newPrDesc, setNewPrDesc] = useState<string>("");
  const [newPrAsset, setNewPrAsset] = useState<string>("B-101");
  const [newPrType, setNewPrType] = useState<string>("SOP Update");
  const [newPrCredits, setNewPrCredits] = useState<number>(50);

  // Change Request modal state
  const [showCRModal, setShowCRModal] = useState<boolean>(false);
  const [crTitle, setCrTitle] = useState<string>("");
  const [crDesc, setCrDesc] = useState<string>("");
  const [crPriority, setCrPriority] = useState<string>("Medium");

  // Brief state
  const [briefBullets, setBriefBullets] = useState<string[]>([
    "Plant Operations (PRJ-OPS-01) is 94% complete with 28 institutional boiler runbooks digitized.",
    "Testing & QA Pod (PRJ-TEST-09) active on automated OISD-118 regression assertions.",
    "Core Engineering & Controls (PRJ-ENG-04) verifying 6.6kV bus-tie fast transfer timing.",
    "Active Blocker: Lab 4 calibration rig requires hardware verification before Friday handoff.",
    "Recommended Next Action: Seal verified boiler runbooks into the Continuity Vault.",
  ]);
  const [isBriefLoading, setIsBriefLoading] = useState<boolean>(false);

  // Fetch Submissions / Pull Requests from backend
  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Change Requests from backend
  const { data: changeRequests = [] } = useQuery({
    queryKey: ["change-requests"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/cr/list`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const currentStage = stages[selectedPhase] || stages.Building;
  const isAuthorizedManager = currentManager.name === currentStage.domainManager.name;

  const handleToggleDeliverable = (delivId: string) => {
    if (!isAuthorizedManager) {
      toast.error(
        `ðŸ”’ Permission Denied: Only Domain Manager "${currentStage.domainManager.name}" can edit or complete deliverables in the "${currentStage.domain}" domain.`
      );
      return;
    }

    setStages((prev) => {
      const stage = prev[selectedPhase];
      if (!stage) return prev;
      const updatedDelivs = stage.deliverables.map((d) =>
        d.id === delivId ? { ...d, done: !d.done } : d
      );
      const doneCount = updatedDelivs.filter((d) => d.done).length;
      const newProgress = Math.round((doneCount / updatedDelivs.length) * 100);
      const newStatus =
        newProgress === 100
          ? "Completed"
          : newProgress > 0
          ? "In Progress"
          : "Pending";

      if (newStatus === "Completed" && stage.status !== "Completed") {
        toast.success(
          `ðŸŽ‰ Phase "${stage.title}" marked as COMPLETED by Domain Manager ${currentManager.name}!`
        );
      }

      return {
        ...prev,
        [selectedPhase]: {
          ...stage,
          deliverables: updatedDelivs,
          progress: newProgress,
          status: newStatus,
        },
      };
    });
  };

  const handleExecuteHandover = (employee: EmployeeData) => {
    setStages((prev) => {
      const stage = prev[selectedPhase];
      if (!stage) return prev;
      const updatedEmployees = stage.employees.map((emp) => {
        if (emp.id === employee.id) {
          return {
            ...emp,
            id: `emp-successor-${Date.now()}`,
            name: emp.successor.name,
            role: emp.successor.role,
            avatarChar: emp.successor.avatarChar,
            knowledgePreserved: 100,
            activeTask: `[Handover Complete] Continuing: "${emp.activeTask}" with 0 downtime.`,
          };
        }
        return emp;
      });

      return {
        ...prev,
        [selectedPhase]: {
          ...stage,
          employees: updatedEmployees,
        },
      };
    });

    toast.success(
      `âš¡ Zero-Downtime Handover Complete: ${employee.successor.name} replaced ${employee.name} with 100% memory retention!`
    );
    setDepartingEmployee(null);
  };

  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrTitle.trim() || !newPrDesc.trim()) {
      toast.error("Please provide a task title and description!");
      return;
    }

    try {
      const res = await fetch(`${API}/api/submissions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: selectedProfile.name,
          task_title: newPrTitle,
          work_description: newPrDesc,
          file_name: `${newPrTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.py`,
          branch: `feat/${newPrType.toLowerCase().replace(/\s+/g, "-")}`,
          target_equipment: newPrAsset,
          credits_requested: newPrCredits,
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        toast.success(
          `ðŸš€ Work Submitted: PR "${newPrTitle}" submitted to Plant Manager for review!`
        );
        setShowSubmitModal(false);
        setNewPrTitle("");
        setNewPrDesc("");
      }
    } catch {
      toast.error("Failed to submit work to backend");
    }
  };

  const handleApproveSubmission = async (subId: number) => {
    try {
      const res = await fetch(`${API}/api/submissions/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subId,
          status: "Approved & Merged into Vault",
          bonus: 25,
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        toast.success(
          "âœ… Pull Request Approved: Merged into Plant Vault & +25 bonus credits awarded!"
        );
      }
    } catch {
      toast.error("Failed to approve submission");
    }
  };

  const handleGenerateBrief = async () => {
    setIsBriefLoading(true);
    try {
      const res = await fetch(`${API}/api/brief`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefBullets(data.bullets);
        toast.success("AI Executive Daily Briefing refreshed!");
      }
    } catch {
      toast.error("Failed to generate brief");
    } finally {
      setIsBriefLoading(false);
    }
  };

  const handleCopyBrief = () => {
    const text = briefBullets.map((b, i) => `${i + 1}. ${b}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied 5-bullet executive brief to clipboard!");
  };

  const handleCreateCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim() || !crDesc.trim()) return;

    try {
      const res = await fetch(`${API}/api/cr/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: crTitle,
          description: crDesc,
          priority: crPriority,
          requester: "Plant Operations Supervisor",
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["change-requests"] });
        toast.success("Change Request submitted to CollabFlow queue!");
        setShowCRModal(false);
        setCrTitle("");
        setCrDesc("");
      }
    } catch {
      toast.error("Failed to submit Change Request");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-foreground">
      {/* â”€â”€ Header Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/40 uppercase">
              CollabFlow × DeadMind
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Project & Operations Intelligence Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-wide uppercase text-foreground mt-1">
            Operations Pipeline & Employee Work Hub
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl mt-0.5">
            Real-time 10-phase milestone tracking, employee work profiles with predecessor handovers, and manager review workflow.
          </p>
        </div>

        {/* Top Sub-Nav Switcher & Active Manager Session */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-1.5 bg-card border border-border font-mono text-xs shadow-sm">
            <div className="w-6 h-7 bg-[#18161d] border border-primary flex items-end justify-center overflow-hidden shrink-0">
              <SpritePortrait character={currentManager.avatarChar as OfficeCharacterName} scale={0.7} />
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground block leading-none">Domain Session:</span>
              <strong className="text-foreground text-[11px]">{currentManager.name}</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowManagerAuthModal(true)}
              className="ml-2 px-2 py-1 bg-muted hover:bg-accent border border-border text-foreground text-[10px] font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <User className="w-3 h-3 text-primary" />
              <span>Switch Manager</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-card border border-border font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("pipeline")}
              className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "pipeline"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>10-Phase Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profiles")}
              className={`px-3 py-1.5 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "profiles"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Employee Profiles & PRs</span>
            </button>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB 1: 10-PHASE PIPELINE & SUCCESSION SIMULATOR                       */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "pipeline" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 10-Phase Interactive Stepper */}
          <div className="p-4 bg-card border border-border space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-border pb-2">
              <span className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" /> 10-Phase Milestone Stepper
              </span>
              <span className="text-muted-foreground text-[10px]">
                Click any stage to view domain details, assigned engineers & progress
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {Object.keys(stages).map((phaseKey, idx) => {
                const s = stages[phaseKey];
                const isSelected = phaseKey === selectedPhase;
                return (
                  <button
                    key={phaseKey}
                    type="button"
                    onClick={() => setSelectedPhase(phaseKey)}
                    className={`p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary shadow-sm"
                        : s.status === "Completed"
                        ? "bg-[#162e21]/40 border-[#5ca97a]/60 text-foreground hover:bg-[#162e21]/70"
                        : s.status === "In Progress"
                        ? "bg-muted/40 border-border text-foreground hover:bg-muted/80"
                        : "bg-muted/20 border-border/50 text-muted-foreground opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {s.status === "Completed" ? (
                        <CheckCircle2 className="w-3 h-3 text-[#5ca97a]" />
                      ) : s.status === "In Progress" ? (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate">{phaseKey}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">{s.progress}% Done</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Stage Detail & Roster Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
            {/* Left: Stage Overview, Domain Clearance & Checklist */}
            <div className="lg:col-span-5 p-4 bg-card border border-border flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div>
                    <span className="text-[10px] text-primary uppercase font-bold">
                      Stage {currentStage.stageNumber} of 10
                    </span>
                    <h2 className="text-base font-bold text-foreground uppercase tracking-wide">
                      {currentStage.title}
                    </h2>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 border font-bold uppercase ${
                      currentStage.status === "Completed"
                        ? "bg-[#162e21] text-[#5ca97a] border-[#5ca97a]"
                        : currentStage.status === "In Progress"
                        ? "bg-primary/20 text-primary border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {currentStage.status}
                  </span>
                </div>

                {/* ðŸ”’ DOMAIN CLEARANCE & ACCESS CONTROL BOX */}
                <div
                  className={`p-3 border text-xs space-y-1.5 ${
                    isAuthorizedManager
                      ? "bg-[#162e21]/50 border-[#5ca97a] text-foreground"
                      : "bg-[#3b2b1d]/40 border-[#d99b62]/60 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Domain: {currentStage.domain}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 border font-bold uppercase ${
                        isAuthorizedManager
                          ? "bg-[#5ca97a]/20 text-[#5ca97a] border-[#5ca97a]/40"
                          : "bg-[#d99b62]/20 text-[#d99b62] border-[#d99b62]/40"
                      }`}
                    >
                      {isAuthorizedManager ? "ðŸŸ¢ Manager Authorized" : "ðŸ”’ Read-Only Mode"}
                    </span>
                  </div>

                  <div className="text-[11px] flex items-center justify-between gap-2">
                    <span>
                      Domain Manager: <strong className="text-primary">{currentStage.domainManager.name}</strong>
                    </span>
                    {!isAuthorizedManager && (
                      <button
                        type="button"
                        onClick={() => {
                          const mgr = DOMAIN_MANAGERS.find((m) => m.name === currentStage.domainManager.name);
                          if (mgr) {
                            setCurrentManager(mgr);
                            toast.success(`Authenticated as Domain Manager: ${mgr.name}`);
                          }
                        }}
                        className="text-[10px] text-primary hover:underline font-bold cursor-pointer shrink-0"
                      >
                        [Sign In as {currentStage.domainManager.name.split(" ")[0]}]
                      </button>
                    )}
                  </div>

                  {!isAuthorizedManager ? (
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1 border-t border-border/40">
                      All details are visible to everyone, but only <strong>{currentStage.domainManager.name}</strong> can check off deliverables and mark this domain Completed.
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#5ca97a] leading-tight pt-1 border-t border-[#5ca97a]/40">
                      âœ“ You are the authorized Domain Manager. You have full clearance to toggle deliverables and seal completion.
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {currentStage.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase">Stage Completion</span>
                    <span className="text-primary font-bold">{currentStage.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted overflow-hidden border border-border">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${currentStage.progress}%` }}
                    />
                  </div>
                </div>

                {/* Deliverables Checklist */}
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">
                    Deliverables & Verification Criteria ({currentStage.deliverables.filter((d) => d.done).length}/
                    {currentStage.deliverables.length})
                  </span>
                  <div className="space-y-1.5">
                    {currentStage.deliverables.map((deliv) => (
                      <button
                        key={deliv.id}
                        type="button"
                        onClick={() => handleToggleDeliverable(deliv.id)}
                        className={`w-full flex items-start gap-2 p-2 border text-left transition-all ${
                          isAuthorizedManager
                            ? "bg-muted/40 hover:bg-muted/70 border-border cursor-pointer"
                            : "bg-muted/20 border-border/50 opacity-80 cursor-not-allowed"
                        }`}
                        title={
                          isAuthorizedManager
                            ? "Click to toggle deliverable completion"
                            : `Locked: Only Domain Manager ${currentStage.domainManager.name} can toggle`
                        }
                      >
                        {deliv.done ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#5ca97a] shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`text-[11px] block ${
                              deliv.done ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {deliv.name}
                          </span>
                        </div>
                        {!isAuthorizedManager && (
                          <span className="text-[9px] text-muted-foreground shrink-0 font-mono">ðŸ”’</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Blockers */}
                {currentStage.blockers.length > 0 && (
                  <div className="p-2.5 bg-[#3b1d24]/30 border border-[#d96a62]/60 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[#d96a62] font-bold text-[10px] uppercase">
                      <AlertTriangle className="w-3.5 h-3.5" /> Active Stage Blocker
                    </div>
                    {currentStage.blockers.map((b, bIdx) => (
                      <div key={bIdx} className="text-[#f3d3cd] text-[11px]">
                        {b}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Domain Clearance Protocol</span>
                <span className="text-[#5ca97a] font-bold">Role-Gated Zero Drift</span>
              </div>
            </div>

            {/* Right: Assigned Personnel & Departure Succession Simulator */}
            <div className="lg:col-span-7 p-4 bg-card border border-border space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Assigned Employees & Departure Succession Simulator
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {currentStage.employees.length} Engineer(s) on Stage
                </span>
              </div>

              <div className="space-y-3">
                {currentStage.employees.map((emp) => (
                  <div key={emp.id} className="p-3.5 bg-muted/40 border border-border space-y-2.5">
                    {/* Employee Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-11 bg-[#18161d] border border-primary flex items-end justify-center overflow-hidden shrink-0">
                          <SpritePortrait character={emp.avatarChar} scale={1} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-2">
                            <span>{emp.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/40 font-mono">
                              {emp.pod}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {emp.role} Â· Preserved: <strong className="text-[#5ca97a]">{emp.knowledgePreserved}% Memory</strong> ({emp.verifiedSops} SOPs)
                          </div>
                        </div>
                      </div>

                      {/* Simulate Departure Button */}
                      <button
                        type="button"
                        onClick={() => setDepartingEmployee(emp)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#3b1d24]/80 hover:bg-[#d96a62] text-[#f3d3cd] hover:text-white border border-[#d96a62] text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm shrink-0"
                        title="Simulate Employee Departure & Handover Plan"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>If Employee Leaves?</span>
                      </button>
                    </div>

                    {/* Active Workstream */}
                    <div className="text-[11px] bg-background/80 p-2 border border-border/80 text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Active Workstream: </strong>
                      {emp.activeTask}
                    </div>

                    {/* Direct Successor Preview Strip */}
                    <div className="flex items-center justify-between p-2 bg-[#162e21]/40 border border-[#5ca97a]/40 text-[10px]">
                      <div className="flex items-center gap-1.5 text-[#5ca97a]">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          Best-Fit Successor: <strong>{emp.successor.name}</strong> ({emp.successor.skillOverlap}% Overlap)
                        </span>
                      </div>
                      <span className="text-muted-foreground">Readiness: {emp.successor.readiness}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB 2: EMPLOYEE WORK PROFILES & GIT PULL REQUESTS HUB                 */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "profiles" && (
        <div className="space-y-6 font-mono animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 Cols: Employee Directory */}
            <div className="lg:col-span-4 p-4 bg-card border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Employee Directory
                </span>
                <span className="text-[10px] text-muted-foreground">Select Engineer</span>
              </div>

              <div className="space-y-2">
                {DETAILED_EMPLOYEES.map((emp) => {
                  const isSelected = emp.id === selectedProfile.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedProfile(emp)}
                      className={`w-full p-3 border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary shadow-sm"
                          : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-8 h-10 bg-[#18161d] border border-primary flex items-end justify-center overflow-hidden shrink-0 mt-0.5">
                        <SpritePortrait character={emp.avatarChar as OfficeCharacterName} scale={1} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-foreground">{emp.name}</strong>
                          <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/40">
                            {emp.knowledgePreserved}%
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{emp.role}</span>
                        <div className="flex items-center gap-2 text-[9px] text-primary mt-1">
                          <span>{emp.verifiedSops} Verified SOPs</span>
                          <span>Â·</span>
                          <span>{emp.commitsCount} Commits</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Comprehensive Work Profile, Handover & PRs */}
            <div className="lg:col-span-8 space-y-5">
              {/* Profile Card Header */}
              <div className="p-4 bg-card border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-[#18161d] border border-primary flex items-end justify-center overflow-hidden shrink-0">
                      <SpritePortrait character={selectedProfile.avatarChar as OfficeCharacterName} scale={1.2} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">{selectedProfile.name}</h2>
                      <span className="text-xs text-muted-foreground block">{selectedProfile.role}</span>
                      <span className="text-[10px] px-2 py-0.2 bg-primary/20 text-primary border border-primary/40 mt-1 inline-block">
                        {selectedProfile.pod}
                      </span>
                    </div>
                  </div>

                  {/* Submit to Manager Button */}
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-4 py-2 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Work to Manager
                  </button>
                </div>

                {/* 2-Column Split: Active Current Work vs. Predecessor's Inherited Handover */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Active Current Work */}
                  <div className="p-3.5 bg-muted/40 border border-border space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground uppercase flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-primary" /> Active Current Workstream
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/40">
                          {selectedProfile.activeWork.status}
                        </span>
                      </div>
                      <strong className="text-xs text-foreground block">
                        {selectedProfile.activeWork.title}
                      </strong>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {selectedProfile.activeWork.description}
                      </p>
                      <div className="space-y-1 pt-1 border-t border-border/40">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Acceptance Criteria:</span>
                        {selectedProfile.activeWork.acceptanceCriteria.map((ac, acIdx) => (
                          <div key={acIdx} className="text-[10px] text-foreground/90 flex items-start gap-1">
                            <span className="text-primary font-bold">â–¸</span>
                            <span>{ac}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Branch: <strong className="text-foreground">{selectedProfile.activeWork.branch}</strong></span>
                      <span>Asset: <strong className="text-primary">{selectedProfile.activeWork.targetAsset}</strong></span>
                    </div>
                  </div>

                  {/* Right: Inherited Work From Predecessor (Handover Footprint) */}
                  <div className="p-3.5 bg-[#162e21]/40 border border-[#5ca97a]/60 space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#5ca97a] uppercase flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-[#5ca97a]" /> Inherited Predecessor Work
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40">
                          {selectedProfile.inheritedWork.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-foreground">
                        Predecessor: <strong className="text-[#5ca97a]">{selectedProfile.inheritedWork.predecessor}</strong>
                      </div>
                      <p className="text-[10px] text-foreground/90 leading-relaxed bg-black/30 p-2 border border-[#5ca97a]/30">
                        "{selectedProfile.inheritedWork.handoverNotes}"
                      </p>
                      <div className="space-y-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Inherited Assets & SOPs:</span>
                        {selectedProfile.inheritedWork.inheritedAssets.map((asset, aIdx) => (
                          <div key={aIdx} className="text-[10px] text-foreground/90 flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#5ca97a]" />
                            <span>{asset}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#5ca97a]/40 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Handover Date: <strong className="text-foreground">{selectedProfile.inheritedWork.handoverDate}</strong></span>
                      <span className="text-[#5ca97a] font-bold">0% Knowledge Lost</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Git Pull Requests & Manager Review Queue */}
              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase text-foreground">
                      Work Submissions & Pull Request Manager Review Queue ({submissions.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Live Synchronization</span>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {submissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-foreground">{sub.task_title}</strong>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 border uppercase ${
                              sub.status.includes("Approved")
                                ? "bg-[#162e21] text-[#5ca97a] border-[#5ca97a]"
                                : "bg-primary/20 text-primary border-primary/40"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                          <span>Author: <strong className="text-foreground">{sub.user_name}</strong></span>
                          <span>Â·</span>
                          <span>Branch: <strong className="text-primary">{sub.branch || "main"}</strong></span>
                          <span>Â·</span>
                          <span>{sub.submitted_at}</span>
                        </div>
                        {sub.work_description && (
                          <p className="text-[11px] text-foreground/80 mt-1">{sub.work_description}</p>
                        )}
                      </div>

                      {/* Review Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-primary block">+{sub.credits_awarded} Credits</span>
                          <span className="text-[9px] text-muted-foreground">Reward</span>
                        </div>
                        {!sub.status.includes("Approved") && (
                          <button
                            type="button"
                            onClick={() => handleApproveSubmission(sub.id)}
                            className="px-3 py-1.5 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                          >
                            <Check className="w-3 h-3" /> Approve & Merge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: SUBMIT WORK / PULL REQUEST TO MANAGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl p-6 space-y-4 font-mono animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground uppercase">
                  Submit Work / Pull Request to Plant Manager
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmission} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                  Author / Employee
                </label>
                <input
                  type="text"
                  value={selectedProfile.name}
                  disabled
                  className="w-full bg-muted border border-border px-3 py-2 text-foreground font-mono text-xs opacity-80"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                  Task / Workstream Title
                </label>
                <input
                  type="text"
                  value={newPrTitle}
                  onChange={(e) => setNewPrTitle(e.target.value)}
                  placeholder="e.g. PRJ-OPS-03: Secondary Superheater Trip Threshold Calibration"
                  required
                  className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Work Type
                  </label>
                  <select
                    value={newPrType}
                    onChange={(e) => setNewPrType(e.target.value)}
                    className="w-full bg-background border border-border px-2.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="SOP Update">SOP Update</option>
                    <option value="Hotfix Runbook">Hotfix Runbook</option>
                    <option value="Regression Assertion">Regression Assertion</option>
                    <option value="Emergency Bypass">Emergency Bypass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Target Asset
                  </label>
                  <select
                    value={newPrAsset}
                    onChange={(e) => setNewPrAsset(e.target.value)}
                    className="w-full bg-background border border-border px-2.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="B-101">B-101 (Boiler Steam Drum)</option>
                    <option value="K-301">K-301 (6.6kV Switchgear)</option>
                    <option value="V-204">V-204 (Positioner Valve)</option>
                    <option value="T-900">T-900 (Turbine Governor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                  Workstream Changes & Verification Summary
                </label>
                <textarea
                  value={newPrDesc}
                  onChange={(e) => setNewPrDesc(e.target.value)}
                  placeholder="Explain calibration adjustments, OISD-118 compliance assertions, and zero-contradiction drift testing..."
                  rows={4}
                  required
                  className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/40">
                <span className="text-[10px] text-muted-foreground">Credits Requested Upon Approval:</span>
                <span className="text-sm font-bold text-primary">+{newPrCredits} Credits</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-border hover:bg-muted text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-xs uppercase cursor-pointer shadow-md"
                >
                  Submit Pull Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: SIMULATE EMPLOYEE DEPARTURE & SUCCESSION HANDOVER â”€â”€â”€â”€â”€â”€â”€ */}
      {departingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border shadow-2xl p-6 space-y-5 font-mono animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-foreground uppercase">
                    AI Cognitive Departure & Succession Simulator
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    DeadMind Institutional Continuity Protocol
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepartingEmployee(null)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Offboarding Scenario Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#3b1d24]/40 border border-[#d96a62]/60 space-y-1">
                <div className="text-[#d96a62] font-bold text-[11px] uppercase flex items-center gap-1.5">
                  <UserMinus className="w-4 h-4" /> Scenario: {departingEmployee.name} Leaves The Company
                </div>
                <p className="text-[#f3d3cd] text-[11px] leading-relaxed">
                  In a traditional plant, losing {departingEmployee.name} would create a 3-month operational blind spot on:{" "}
                  <strong>"{departingEmployee.activeTask}"</strong>.
                </p>
              </div>

              {/* DeadMind Cognitive Preservation Shield */}
              <div className="p-3 bg-[#162e21] border border-[#5ca97a] space-y-2">
                <div className="flex items-center justify-between text-[#5ca97a] font-bold text-[11px] uppercase">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Preserved Institutional Memory Shield
                  </span>
                  <span>{departingEmployee.knowledgePreserved}% Preserved</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-foreground/90">
                  <div className="p-2 bg-black/40 border border-[#5ca97a]/40">
                    <span className="text-muted-foreground block">Verified SOPs & Runbooks:</span>
                    <strong className="text-primary text-sm">{departingEmployee.verifiedSops} Guides</strong>
                  </div>
                  <div className="p-2 bg-black/40 border border-[#5ca97a]/40">
                    <span className="text-muted-foreground block">Contradiction Drift:</span>
                    <strong className="text-[#5ca97a] text-sm">0 Contradictions</strong>
                  </div>
                </div>
              </div>

              {/* Best-Fit Successor Matching */}
              <div className="p-3.5 bg-muted/40 border border-border space-y-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  AI Best-Fit Successor Match:
                </span>
                <div className="flex items-start gap-3 p-3 bg-background border border-border">
                  <div className="w-10 h-12 bg-[#18161d] border border-[#5ca97a] flex items-end justify-center overflow-hidden shrink-0">
                    <SpritePortrait character={departingEmployee.successor.avatarChar} scale={1} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-foreground">
                        {departingEmployee.successor.name}
                      </strong>
                      <span className="text-[9px] px-2 py-0.5 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold">
                        {departingEmployee.successor.skillOverlap}% Skill Match
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {departingEmployee.successor.role}
                    </span>
                    <p className="text-[11px] text-foreground/90 mt-1 leading-snug">
                      {departingEmployee.successor.transferPlan}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Handover Execution CTA */}
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDepartingEmployee(null)}
                className="px-4 py-2 border border-border hover:bg-muted text-xs cursor-pointer"
              >
                Close Simulator
              </button>
              <button
                type="button"
                onClick={() => handleExecuteHandover(departingEmployee)}
                className="px-5 py-2 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <span>Execute Instant Zero-Downtime Handover</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: DOMAIN MANAGER AUTHENTICATION & ROLE SWITCHER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showManagerAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl p-6 space-y-4 font-mono animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground uppercase">
                  Authenticate Domain Manager Clearance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManagerAuthModal(false)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Select an authorized Domain Manager to test editing and completing deliverables within their domain, or choose Read-Only Viewer:
            </p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {DOMAIN_MANAGERS.map((mgr) => {
                const isSelected = mgr.name === currentManager.name;
                return (
                  <button
                    key={mgr.id}
                    type="button"
                    onClick={() => {
                      setCurrentManager(mgr);
                      setShowManagerAuthModal(false);
                      toast.success(`Active Domain Session: Authenticated as ${mgr.name} (${mgr.role})`);
                    }}
                    className={`w-full p-3 border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary shadow-sm"
                        : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-8 h-10 bg-[#18161d] border border-primary flex items-end justify-center overflow-hidden shrink-0 mt-0.5">
                      <SpritePortrait character={mgr.avatarChar as OfficeCharacterName} scale={1} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-foreground">{mgr.name}</strong>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold">
                            Active Session
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{mgr.role}</span>
                      <span className="text-[9px] text-primary block mt-0.5 font-bold">
                        Domain: {mgr.domain}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
