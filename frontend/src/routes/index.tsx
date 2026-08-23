import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type VulnNode, type CausalLink, type Counterfactual } from "@/lib/api";
import { useYear, colorForNode } from "@/lib/year-context";
import { PageHeader, ForgePanel, EquipmentTag, ErrorBlock, LoadingBlock, Tag } from "@/components/forge";
import {
  GitBranch,
  Repeat,
  X,
  User,
  GitPullRequest,
  GitCommit,
  History,
  Send,
  Check,
  Plus,
  ShieldCheck,
  Award,
  Sparkles,
  Calendar,
  Clock,
  Video,
  Play,
  HeartPulse,
  ShieldAlert,
  GraduationCap,
  Home,
  Coins,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { SpritePortrait } from "@/components/SpritePortrait";
import type { OfficeCharacterName } from "@/scene/office/cast";

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "");

type IndexSearch = { node?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): IndexSearch => ({
    node: typeof s.node === "string" ? s.node : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Plant Knowledge Map & Employee Work Feed — DeadMind" },
      { name: "description", content: "Interactive equipment schematic, meeting schedules, manager tasks, training videos, employee benefits, and predecessor handover continuity." },
    ],
  }),
  component: PlantMap,
});

function colorFill(c: "green" | "yellow" | "red") {
  if (c === "green") return "oklch(0.90 0.16 180)";
  if (c === "yellow") return "oklch(0.80 0.14 85)";
  return "oklch(0.65 0.24 28)";
}

function buildEdges(nodes: VulnNode[]) {
  const edges: { a: VulnNode; b: VulnNode }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((n, j) => ({ n, j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { n } of dists) {
      if (!edges.some((e) => (e.a.tag === n.tag && e.b.tag === nodes[i].tag) || (e.a.tag === nodes[i].tag && e.b.tag === n.tag))) {
        edges.push({ a: nodes[i], b: n });
      }
    }
  }
  return edges;
}

const PLANT_EMPLOYEES = [
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
    meetings: [
      {
        id: "m1",
        time: "09:00 AM – 09:30 AM",
        title: "Boiler Pod Daily Standup & Telemetry Sync",
        room: "Control Pod A · Screen 2",
        agenda: "Differential pressure curve checks on Steam Drum B-101 and monsoon temperature baseline tuning.",
        status: "Upcoming",
      },
      {
        id: "m2",
        time: "02:30 PM – 03:15 PM",
        title: "Shift B Thermal Drift Review & Lab Sign-off",
        room: "Calibration Lab 2",
        agenda: "Reviewing 4-20mA positioner loop tolerances with QA Engineer Alex Mercer.",
        status: "Scheduled",
      },
      {
        id: "m3",
        time: "05:00 PM – 05:30 PM",
        title: "Evening Shift Handover & Safety Briefing",
        room: "Unit Operations Deck",
        agenda: "Zero-loss handover sign-off and night-shift thermal monitor delegation.",
        status: "Scheduled",
      },
    ],
    managerTasks: [
      {
        id: "task-1",
        title: "PRJ-MGR-01: Tune Monsoon Zero-Span Calibration on Valve V-204",
        assignedBy: "Marcus Vance (Principal Operations Strategist)",
        priority: "Urgent",
        asset: "V-204",
        dueDate: "Today, 18:00 IST",
        credits: 75,
        done: false,
        notes: "Apply predecessor S. Namboodiri's 4.05mA offset to prevent back-pressure stall.",
      },
      {
        id: "task-2",
        title: "PRJ-MGR-02: Run PyTest OISD-118 Section 4.2 Differential Sweep",
        assignedBy: "Alex Mercer (Lead QA Engineer)",
        priority: "High",
        asset: "B-101",
        dueDate: "Tomorrow, 12:00 IST",
        credits: 50,
        done: false,
        notes: "Automated regression assertion on thermocouple response under 400°C.",
      },
      {
        id: "task-3",
        title: "PRJ-MGR-03: Vectorize Burner Igniter Differential Runbook v2.4",
        assignedBy: "Ananya Deshmukh (Compliance Administrator)",
        priority: "Normal",
        asset: "B-101",
        dueDate: "Friday, 17:00 IST",
        credits: 40,
        done: true,
        notes: "Sealed into DeadMind Vector DB with 0 contradiction drift.",
      },
    ],
    trainingVideos: [
      {
        id: "v1",
        title: "Boiler Steam Drum Emergency Cold-Start Walkthrough",
        duration: "14:20 min",
        instructor: "S. Namboodiri (Former Boiler Chief)",
        sopCode: "SOP-BLR-01",
        description: "Step-by-step valve timing, drum level differential monitoring, and thermal shock avoidance.",
        transcriptPreview: "Step 1: Verify valve V-204 is at 4.05mA. Step 2: Open secondary bypass valve at 15% rate until differential drops below 1.2 bar...",
      },
      {
        id: "v2",
        title: "Thermocouple Zero-Drift & Sensor Loop PyTest Assertions",
        duration: "11:45 min",
        instructor: "Alex Mercer (QA Lead)",
        sopCode: "SOP-TST-04",
        description: "Automating 500-cycle stress testing on industrial 4-20mA mechanical valve positioners.",
        transcriptPreview: "Execute pytest tests/test_positioner.py with live Modbus simulator to assert ±0.05% deadband repeatability...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater, 450+ cashless hospitals, zero co-pay, all medicine bills reimbursed).",
      hazardousDuty: "₹1,50,00,000 High-Voltage & Thermal Duty Life Shield (24/7 active on-site coverage).",
      upskilling: "₹1,20,000 Annual Master Class Stipend (IEEE, TÜV, OISD, and NFPA certified programs).",
      housing: "3BHK Free Township Quarters + 100% Subsidized Electricity, Water & Fiber Optic Internet.",
      knowledgeBounty: "₹42,500 Earned This Quarter (Preserved 38 SOPs with zero contradiction drift).",
    },
    predecessorContinuity: {
      predecessorName: "S. Namboodiri",
      predecessorRole: "Former Senior Boiler Chief (Retired November 2024 · 34 Yrs Exp)",
      handoverDate: "November 2024",
      completedAssets: [
        "14 Baseline Boiler Startup & Cold-Start Curves",
        "Emergency Steam Drum Trip SOP v1.0 (Sealed)",
        "Historical Burner Igniter Differential Records (2018-2024)",
      ],
      openBranch: "predecessor/s-namboodiri-v204-calibration",
      handoverNotes:
        "S. Namboodiri logged that valve V-204 required a 4.05mA zero-span setting during monsoon cold-starts to counter back-pressure. Successfully preserved in DeadMind with 100% memory retention.",
      continuityPlaybook: [
        "1. Check out open branch 'predecessor/s-namboodiri-v204-calibration' to inherit uncommitted sensor curves.",
        "2. Apply S. Namboodiri's 4.05mA offset parameter to the 4-20mA positioner loop.",
        "3. Execute PyTest thermal regression assertion to verify zero drift under 400°C.",
        "4. Click 'Submit Work to Plant Manager' to push PR and claim +50 Credit Bounty!",
      ],
      parameters: [
        { param: "Valve V-204 Zero-Span Setting", value: "4.05 mA (Monsoon Back-Pressure Compensated)" },
        { param: "Max Permissible Steam Dump Delta", value: "±12.4 bar/min (Thermal Shock Limit)" },
        { param: "Fast-Transfer Trip Interlock Delay", value: "< 45 ms (OISD-118 Section 4.2)" },
      ],
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
    meetings: [
      {
        id: "m4",
        time: "10:00 AM – 10:45 AM",
        title: "6.6kV Substation Arc-Flash Safety Audit",
        room: "Substation Control Room K-3",
        agenda: "Reviewing fast-transfer relay trip timing with Safety Officer Rajan Sharma.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-4",
        title: "PRJ-MGR-04: Transformer Oil Dielectric Breakdown Assertion",
        assignedBy: "Ananya Deshmukh (Chief Compliance Administrator)",
        priority: "High",
        asset: "K-301",
        dueDate: "Tomorrow, 16:00 IST",
        credits: 60,
        done: false,
        notes: "Test dielectric breakdown voltage (>60kV) under IEEE-C57.104 standard.",
      },
    ],
    trainingVideos: [
      {
        id: "v3",
        title: "6.6kV Switchgear Arc-Flash Protective Isolation Protocol",
        duration: "18:45 min",
        instructor: "V. Swaminathan (Lead Electrical Specialist)",
        sopCode: "SOP-ELE-04",
        description: "Bus-tie transfer interlock testing and vacuum breaker extraction safety procedure.",
        transcriptPreview: "Step 1: Isolate bus tie. Step 2: Verify zero residual voltage with calibrated hot stick. Step 3: Insert mechanical interlock key...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater, 450+ cashless hospitals, zero co-pay).",
      hazardousDuty: "₹1,50,00,000 High-Voltage Switchgear Duty Life Shield.",
      upskilling: "₹1,20,000 Annual IEEE & Power Engineering Master Class Allowance.",
      housing: "3BHK Free Township Accommodation + 100% Subsidized Utilities.",
      knowledgeBounty: "₹38,000 Earned This Quarter (Preserved 41 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "V. Swaminathan",
      predecessorRole: "Lead Electrical Specialist (Retired March 2025 · 32 Yrs Exp)",
      handoverDate: "March 2025",
      completedAssets: [
        "6.6kV Switchgear Protective Relay Coordination Schemes",
        "Transformer Oil Dielectric Breakdown Test Runs",
        "Emergency Diesel Generator Auto-Sync Sequence",
      ],
      openBranch: "predecessor/swaminathan-bus-tie-interlock",
      handoverNotes:
        "Transferred complete substation relay coordination curves. Critical note on vacuum bottle wear indicators verified without any operational blind spot.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/swaminathan-bus-tie-interlock'.",
        "2. Verify bus-transfer delay register remains below 80ms.",
        "3. Push PR for automated +60 credit reward.",
      ],
      parameters: [
        { param: "Bus-Transfer Delay Threshold", value: "< 80 ms (Arc Flash Prevention)" },
        { param: "Dielectric Breakdown Voltage", value: "> 60 kV (IEEE-C57.104)" },
      ],
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
    meetings: [
      {
        id: "m5",
        time: "11:30 AM – 12:15 PM",
        title: "Automated QA & CI/CD Regression Sweep",
        room: "Reliability Engineering Lab 4",
        agenda: "Hardware fault injection harness verification.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-5",
        title: "PRJ-MGR-05: Stress-Test Thermal Sensor Injection Harness",
        assignedBy: "Marcus Vance (Principal Operations Strategist)",
        priority: "High",
        asset: "B-101",
        dueDate: "Today, 19:00 IST",
        credits: 50,
        done: false,
        notes: "Inject 500-cycle thermal spike simulation into Digital Twin.",
      },
    ],
    trainingVideos: [
      {
        id: "v4",
        title: "Automated Hardware Fault Injection PyTest Harness",
        duration: "15:30 min",
        instructor: "David Wallace (Senior QA Principal)",
        sopCode: "SOP-QA-02",
        description: "Building automated continuous assertions for industrial sensor hardware.",
        transcriptPreview: "Set up the hardware-in-the-loop fixture and run pytest tests/test_fault_injection.py...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater).",
      hazardousDuty: "₹1,50,00,000 Plant Reliability & Testing Life Shield.",
      upskilling: "₹1,20,000 Annual PyTest, CI/CD, and Reliability Engineering Allowance.",
      housing: "3BHK Free Township Accommodation + 100% Subsidized Utilities.",
      knowledgeBounty: "₹34,000 Earned This Quarter (Preserved 29 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "David Wallace",
      predecessorRole: "Senior QA Principal (Reassigned January 2025)",
      handoverDate: "January 2025",
      completedAssets: [
        "Plant Hardware Fault Injection Testbeds",
        "Pressure Transmitter Calibration Harnesses",
        "Legacy PyTest Automation Scripts",
      ],
      openBranch: "predecessor/wallace-fault-injection",
      handoverNotes:
        "Inherited complete sensor calibration testbeds. Upgraded legacy manual checksheets into continuous automated assertions.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/wallace-fault-injection'.",
        "2. Run automated regression test suite.",
        "3. Merge into Vault with +50 credit release.",
      ],
      parameters: [
        { param: "Deadband Tolerance", value: "±0.05% Repeatability" },
        { param: "Stress Cycles", value: "500 Cycles Continuous" },
      ],
    },
  },
  {
    id: "vikram",
    name: "Vikram Sen",
    role: "Boiler Steam Drum Field Engineer",
    pod: "Boiler Operations Pod",
    avatarChar: "boiler_lead" as const,
    knowledgePreserved: 95,
    verifiedSops: 31,
    commitsCount: 115,
    activeWork: {
      title: "PRJ-OPS-03: Secondary Boiler Drum Level Thermal Differential Sweep",
      branch: "feature/drum-level-sweep",
      targetAsset: "B-101 (Boiler Steam Drum)",
      status: "In Flight · Sprint 4",
      description: "Asserting water-column level transmitter calibration under variable 250 bar pressure.",
      acceptanceCriteria: [
        "1. Verify differential pressure transmitter zero-drift under 400°C.",
        "2. Ensure water column blowdown sequence conforms to NFPA-85 standards.",
        "3. Synchronize live transmitter readings with DeadMind Digital Twin telemetry.",
      ],
    },
    meetings: [
      {
        id: "m-vik-1",
        time: "09:00 AM – 09:30 AM",
        title: "Boiler Pod Daily Standup & Telemetry Sync",
        room: "Control Pod A · Screen 2",
        agenda: "Differential pressure curve checks on Steam Drum B-101 with Rajan Sharma.",
        status: "Upcoming",
      },
      {
        id: "m-vik-2",
        time: "03:00 PM – 03:45 PM",
        title: "Steam Drum Transducer Calibration Walkthrough",
        room: "Thermal Lab 3",
        agenda: "Field verification of differential sensor deadband.",
        status: "Scheduled",
      },
    ],
    managerTasks: [
      {
        id: "task-vik-1",
        title: "PRJ-MGR-07: Verify Steam Drum Water-Column Differential Drift",
        assignedBy: "Rajan Sharma (Senior Boiler Lead)",
        priority: "Urgent",
        asset: "B-101",
        dueDate: "Today, 17:30 IST",
        credits: 65,
        done: false,
        notes: "Calibrate transmitter span under 250 bar back-pressure.",
      },
    ],
    trainingVideos: [
      {
        id: "v-vik-1",
        title: "Steam Drum Level Transmitter Blowdown & Calibration",
        duration: "12:30 min",
        instructor: "Rajan Sharma (Boiler Lead)",
        sopCode: "SOP-BLR-03",
        description: "Standard operating procedure for sensor isolation and blowdown flushing.",
        transcriptPreview: "Step 1: Isolate high and low pressure sensing lines. Step 2: Open equalizing valve slowly...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater, 450+ cashless hospitals).",
      hazardousDuty: "₹1,50,00,000 High-Pressure Boiler Field Duty Life Cover.",
      upskilling: "₹1,20,000 Annual Thermal Instrumentation & Boiler Specialist Allowance.",
      housing: "3BHK Free Township Accommodation + 100% Subsidized Utilities.",
      knowledgeBounty: "₹36,000 Earned This Quarter (Preserved 31 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "K. Narayanan (Former Steam Drum Specialist · Retired 2024)",
      predecessorRole: "Senior Steam Drum Specialist (29 Yrs Exp)",
      handoverDate: "October 2024",
      completedAssets: [
        "Differential Water Column Calibration Protocols",
        "Emergency Steam Drum Blowdown Checksheets",
        "High-Pressure Float Chamber Historical Logs",
      ],
      openBranch: "predecessor/narayanan-drum-level",
      handoverNotes:
        "Float chamber seals require silicon greasing prior to cold startup. Inherited with 100% vector retention.",
      continuityPlaybook: [
        "1. Check out open branch 'predecessor/narayanan-drum-level'.",
        "2. Validate transmitter differential offset against cold baseline.",
        "3. Submit Pull Request for +65 Credit release.",
      ],
      parameters: [
        { param: "Transmitter Span Offset", value: "±0.15% FS Limit" },
        { param: "Max Permissible Level Surge", value: "±50 mm Delta" },
      ],
    },
  },
  {
    id: "stanley",
    name: "Sanjay Patel",
    role: "Substation Protection Relay Lead",
    pod: "Electrical Controls Pod",
    avatarChar: "combustion_lead" as const,
    knowledgePreserved: 96,
    verifiedSops: 44,
    commitsCount: 150,
    activeWork: {
      title: "PRJ-ENG-06: 6.6kV Bus-Tie Differential Protective Relay Coordination",
      branch: "feature/bus-tie-protection",
      targetAsset: "K-301 (6.6kV Substation)",
      status: "In Flight · Sprint 4",
      description: "Configuring numerical relay trip curves for instantaneous overcurrent fault clearing under 40ms.",
      acceptanceCriteria: [
        "1. Numerical relay time-current characteristic curves verified.",
        "2. CT saturation calculations validated for 40kA prospective fault.",
        "3. Zero contradiction drift across SCADA telemetry registers.",
      ],
    },
    meetings: [
      {
        id: "m-st-1",
        time: "10:00 AM – 10:45 AM",
        title: "6.6kV Substation Arc-Flash Safety Audit",
        room: "Substation Control Room K-3",
        agenda: "Reviewing numerical relay trip timing with K.V. Ramanathan.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-st-1",
        title: "PRJ-MGR-08: Calibrate Numerical Overcurrent Relay Trip Timing",
        assignedBy: "K.V. Ramanathan (Controls & Switchgear Lead)",
        priority: "Urgent",
        asset: "K-301",
        dueDate: "Today, 18:30 IST",
        credits: 70,
        done: false,
        notes: "Assert trip delay is strictly below 40ms to eliminate arc flash hazards.",
      },
    ],
    trainingVideos: [
      {
        id: "v-st-1",
        title: "Numerical Protective Relay Testing & Secondary Injection",
        duration: "16:15 min",
        instructor: "K.V. Ramanathan (Controls Lead)",
        sopCode: "SOP-ELE-06",
        description: "Secondary current injection testing on microprocessor-based feeder relays.",
        transcriptPreview: "Connect Omicron secondary injection set to relay test blocks. Inject 5x rated current...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater).",
      hazardousDuty: "₹1,50,00,000 High-Voltage Substation Duty Life Shield.",
      upskilling: "₹1,20,000 Annual IEEE Power Systems Certification Stipend.",
      housing: "3BHK Free Township Quarters + 100% Subsidized Utilities.",
      knowledgeBounty: "₹45,000 Earned This Quarter (Preserved 44 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "V. Swaminathan (Lead Electrical Specialist · Retired 2025)",
      predecessorRole: "Lead Electrical Specialist (32 Yrs Exp)",
      handoverDate: "March 2025",
      completedAssets: [
        "Numerical Relay Coordination Curves (6.6kV Feeder 1-8)",
        "CT Ratio & Knee-Point Voltage Verification Files",
      ],
      openBranch: "predecessor/swaminathan-relay-coordination",
      handoverNotes:
        "Ensure feeder 4 instantaneous trip is delayed by 30ms to maintain downstream coordination with motor protection.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/swaminathan-relay-coordination'.",
        "2. Assert instantaneous trip curve timing.",
        "3. Push PR for +70 credit reward.",
      ],
      parameters: [
        { param: "Trip Delay Interlock", value: "< 40 ms (Arc Flash Prevention)" },
        { param: "CT Secondary Rating", value: "1A / 5A Matched" },
      ],
    },
  },
  {
    id: "jim",
    name: "Dev Sen",
    role: "Automated CI/CD & Sensor Rig Lead",
    pod: "Testing & QA Pod",
    avatarChar: "dcs_lead" as const,
    knowledgePreserved: 93,
    verifiedSops: 33,
    commitsCount: 172,
    activeWork: {
      title: "PRJ-TEST-12: SCADA Modbus Port 502 Automated Regression Daemon",
      branch: "feature/modbus-ci-daemon",
      targetAsset: "B-101 (Valve Positioner Rig)",
      status: "In Flight · Sprint 4",
      description: "Continuous background daemon asserting 0-latency register polling across all 14 equipment nodes.",
      acceptanceCriteria: [
        "1. Sub-10ms Modbus polling response rate asserted across all registers.",
        "2. Automated pytest failure alarms piped directly into Plant Map.",
        "3. Zero memory leak under 72-hour continuous test harness.",
      ],
    },
    meetings: [
      {
        id: "m-jim-1",
        time: "11:30 AM – 12:15 PM",
        title: "Automated QA & CI/CD Regression Sweep",
        room: "Reliability Lab 4",
        agenda: "Deploying automated Modbus test daemon with Alex Mercer.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-jim-1",
        title: "PRJ-MGR-09: Automated Modbus Latency Regression Assertion",
        assignedBy: "Alex Mercer (Lead QA Engineer)",
        priority: "High",
        asset: "B-101",
        dueDate: "Tomorrow, 14:00 IST",
        credits: 55,
        done: false,
        notes: "Assert sub-10ms polling latency on Modbus port 502.",
      },
    ],
    trainingVideos: [
      {
        id: "v-jim-1",
        title: "Industrial Modbus TCP Automation & PyTest Integration",
        duration: "13:40 min",
        instructor: "Dev Sen (QA Automation Lead)",
        sopCode: "SOP-QA-05",
        description: "How to construct high-throughput automated test fixtures for PLC registers.",
        transcriptPreview: "Initialize pymodbus client on port 502 with async timeout assertions...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater).",
      hazardousDuty: "₹1,50,00,000 Industrial QA Testing Life Shield.",
      upskilling: "₹1,20,000 Annual CI/CD & Python Automation Allowance.",
      housing: "3BHK Free Township Accommodation + 100% Subsidized Utilities.",
      knowledgeBounty: "₹35,000 Earned This Quarter (Preserved 33 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "David Wallace (Senior QA Principal · Reassigned 2025)",
      predecessorRole: "Senior QA Principal",
      handoverDate: "January 2025",
      completedAssets: [
        "SCADA Modbus Register Mappings",
        "Continuous PyTest Regression Pipeline Scripts",
      ],
      openBranch: "predecessor/wallace-modbus-daemon",
      handoverNotes:
        "Transferred complete PLC test fixture automation scripts. Zero contradiction drift.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/wallace-modbus-daemon'.",
        "2. Run automated test daemon.",
        "3. Submit PR for +55 credits.",
      ],
      parameters: [
        { param: "Modbus Polling Latency", value: "< 10 ms Target" },
        { param: "Port Isolation", value: "TCP Port 502 Secured" },
      ],
    },
  },
  {
    id: "angela",
    name: "Ananya Deshmukh",
    role: "Chief Compliance & Statutory Administrator",
    pod: "Compliance & Safety Pod",
    avatarChar: "compliance_officer" as const,
    knowledgePreserved: 99,
    verifiedSops: 48,
    commitsCount: 185,
    activeWork: {
      title: "PRJ-COMP-01: OISD-118 & NFPA-85 Regulatory Clearance Verification",
      branch: "main/statutory-compliance",
      targetAsset: "Plant-Wide Statutory Architecture",
      status: "In Review · Sprint 4",
      description: "Ensuring 100% statutory compliance across all 58 plant runbooks and safety interlocks.",
      acceptanceCriteria: [
        "1. OISD-118 Section 4.2 emergency trip standards certified.",
        "2. ISO-55001 asset management ledger verified with zero compliance gaps.",
        "3. Cryptographic seal applied to all preserved runbooks in Vault.",
      ],
    },
    meetings: [
      {
        id: "m-ang-1",
        time: "02:00 PM – 02:45 PM",
        title: "Statutory Compliance & Audit Review",
        room: "Compliance Boardroom A",
        agenda: "Reviewing OISD-118 compliance ledger with Safety Officer Rajan Sharma.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-ang-1",
        title: "PRJ-MGR-10: Statutory Audit Sign-off on Boiler Runbooks",
        assignedBy: "Marcus Vance (Principal Operations Strategist)",
        priority: "Urgent",
        asset: "Plant-Wide",
        dueDate: "Friday, 16:00 IST",
        credits: 80,
        done: false,
        notes: "Audit all 38 verified boiler runbooks for ISO-55001 compliance.",
      },
    ],
    trainingVideos: [
      {
        id: "v-ang-1",
        title: "OISD-118 & Industrial Plant Safety Compliance Master Class",
        duration: "22:10 min",
        instructor: "Ananya Deshmukh (Chief Compliance Administrator)",
        sopCode: "SOP-COMP-01",
        description: "Statutory requirements for oil, gas, and power plant safety protocols.",
        transcriptPreview: "Under Section 4.2, all emergency bypass lines must maintain dual redundant trip solenoids...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater).",
      hazardousDuty: "₹1,50,00,000 Plant Compliance & Safety Shield.",
      upskilling: "₹1,20,000 Annual Statutory Auditing & ISO-55001 Certification Stipend.",
      housing: "3BHK Free Township Accommodation + 100% Subsidized Utilities.",
      knowledgeBounty: "₹48,000 Earned This Quarter (Preserved 48 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "Foundational Compliance Committee",
      predecessorRole: "Statutory Affairs (2020-2024)",
      handoverDate: "August 2024",
      completedAssets: [
        "OISD-118 Plant Compliance Matrix",
        "ISO-55001 Asset Management Framework",
        "Environmental Clearance Certificates (2020-2024)",
      ],
      openBranch: "predecessor/statutory-clearance-ledger",
      handoverNotes:
        "All statutory compliance checksheets fully duplicated with zero audit blind spots.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/statutory-clearance-ledger'.",
        "2. Verify ISO-55001 audit criteria.",
        "3. Seal into Vault with +80 credits.",
      ],
      parameters: [
        { param: "Statutory Compliance Score", value: "100% Fully Certified" },
        { param: "Audit Contradiction Drift", value: "0 Contradictions" },
      ],
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
    meetings: [
      {
        id: "m6",
        time: "04:00 PM – 04:45 PM",
        title: "Executive Plant Board & CFO ROI Briefing",
        room: "Boardroom 1 · Executive Twin Console",
        agenda: "Presentation on zero knowledge loss SLA and 10.86 Cr downtime mitigation.",
        status: "Upcoming",
      },
    ],
    managerTasks: [
      {
        id: "task-6",
        title: "PRJ-MGR-06: Publish Quarterly Cognitive Preservation Brief",
        assignedBy: "Board of Directors",
        priority: "Urgent",
        asset: "Plant Infrastructure",
        dueDate: "Today, 17:00 IST",
        credits: 100,
        done: false,
        notes: "Generate 5-bullet executive summary and dispatch to Plant Leadership.",
      },
    ],
    trainingVideos: [
      {
        id: "v5",
        title: "Executive Digital Twin Continuity & CFO Risk Architecture",
        duration: "20:00 min",
        instructor: "Marcus Vance (Principal Strategist)",
        sopCode: "SOP-EXEC-01",
        description: "Strategic ROI framework quantifying downtime risk reduction.",
        transcriptPreview: "By digitizing tacit operator instincts into continuous vector embeddings, we safeguard 10.86 Cr...",
      },
    ],
    benefits: {
      medical: "100% Free Family Hospitalization & OPD Bills (₹15,00,000 floater).",
      hazardousDuty: "₹1,50,00,000 Executive Plant Safety Shield.",
      upskilling: "₹1,20,000 Annual Executive Leadership Stipend.",
      housing: "Executive Township Villa + 100% Subsidized Utilities.",
      knowledgeBounty: "₹50,000 Earned This Quarter (Preserved 34 SOPs).",
    },
    predecessorContinuity: {
      predecessorName: "Foundational Operations Committee",
      predecessorRole: "Operations Leadership (2020-2024)",
      handoverDate: "August 2024",
      completedAssets: [
        "Historical Plant Downtime Loss Reports",
        "Retirement Schedule Projections (2026-2036)",
        "Executive Strategy Mandates",
      ],
      openBranch: "predecessor/executive-retention-model",
      handoverNotes:
        "Transformed static annual reports into a live interactive multi-agent digital twin ecosystem.",
      continuityPlaybook: [
        "1. Check out branch 'predecessor/executive-retention-model'.",
        "2. Run 1-click executive brief automation.",
        "3. Seal milestone into Vault.",
      ],
      parameters: [
        { param: "Preserved Value", value: "₹10.86 Cr Downtime Protected" },
        { param: "Contradiction Drift", value: "0% Strict Assertion" },
      ],
    },
  },
];

function PlantMap() {
  const queryClient = useQueryClient();
  const { year } = useYear();
  const { node: selectedTag } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [selectedProfile, setSelectedProfile] = useState(PLANT_EMPLOYEES[0]);
  const [employeeSubTab, setEmployeeSubTab] = useState<
    "workstream" | "meetings" | "managerTasks" | "videos" | "benefits" | "predecessor" | "prs"
  >("workstream");

  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

  // Submission / Pull Request modal state
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [newPrTitle, setNewPrTitle] = useState<string>("");
  const [newPrDesc, setNewPrDesc] = useState<string>("");
  const [newPrAsset, setNewPrAsset] = useState<string>("B-101");
  const [newPrType, setNewPrType] = useState<string>("SOP Update");
  const [newPrCredits, setNewPrCredits] = useState<number>(50);

  // Manager Assign Task Modal state
  const [showAssignTaskModal, setShowAssignTaskModal] = useState<boolean>(false);
  const [assignedTaskTitle, setAssignedTaskTitle] = useState<string>("");
  const [assignedTaskAsset, setAssignedTaskAsset] = useState<string>("B-101");
  const [assignedTaskPriority, setAssignedTaskPriority] = useState<string>("Urgent");
  const [assignedTaskDue, setAssignedTaskDue] = useState<string>("Tomorrow, 17:00 IST");
  const [assignedTaskCredits, setAssignedTaskCredits] = useState<number>(60);
  const [assignedTaskNotes, setAssignedTaskNotes] = useState<string>("");

  // Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  // Dynamic state for manager tasks so employee can check them off
  const [employeeTasks, setEmployeeTasks] = useState<Record<string, any[]>>({
    rajan: PLANT_EMPLOYEES[0].managerTasks,
    vikram: PLANT_EMPLOYEES[1].managerTasks,
    ramanathan: PLANT_EMPLOYEES[2].managerTasks,
    stanley: PLANT_EMPLOYEES[3].managerTasks,
    alex: PLANT_EMPLOYEES[4].managerTasks,
    jim: PLANT_EMPLOYEES[5].managerTasks,
    angela: PLANT_EMPLOYEES[6].managerTasks,
    michael: PLANT_EMPLOYEES[7].managerTasks,
  });

  const engineersQ = useQuery({ queryKey: ["engineers"], queryFn: api.engineers });
  const mapQ = useQuery({ queryKey: ["vulnerability-map"], queryFn: api.vulnerabilityMap });

  // Fetch Submissions / Pull Requests from backend
  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const nodes = mapQ.data ?? [];
  const edges = useMemo(() => buildEdges(nodes), [nodes]);

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

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTaskTitle.trim()) {
      toast.error("Please enter a task title!");
      return;
    }

    const newTask = {
      id: `task-new-${Date.now()}`,
      title: assignedTaskTitle,
      assignedBy: "Plant Operations Management",
      priority: assignedTaskPriority,
      asset: assignedTaskAsset,
      dueDate: assignedTaskDue,
      credits: assignedTaskCredits,
      done: false,
      notes: assignedTaskNotes || "Verify parameters and adhere to OISD-118 compliance guidelines.",
    };

    setEmployeeTasks((prev) => ({
      ...prev,
      [selectedProfile.id]: [newTask, ...(prev[selectedProfile.id] || [])],
    }));

    toast.success(
      `ðŸ“‹ Task Assigned: "${assignedTaskTitle}" assigned to ${selectedProfile.name} (+${assignedTaskCredits} Credits)!`
    );
    setShowAssignTaskModal(false);
    setAssignedTaskTitle("");
    setAssignedTaskNotes("");
  };

  const handleToggleTaskDone = (taskId: string) => {
    setEmployeeTasks((prev) => {
      const currentList = prev[selectedProfile.id] || [];
      const updated = currentList.map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t
      );
      const targetTask = currentList.find((t) => t.id === taskId);
      if (targetTask && !targetTask.done) {
        toast.success(
          `ðŸŽ‰ Task Completed: "${targetTask.title}" marked as complete (+${targetTask.credits} Credits added to employee wallet)!`
        );
      }
      return { ...prev, [selectedProfile.id]: updated };
    });
  };

  const handleAdoptPredecessorBranch = () => {
    toast.success(
      `âš¡ Predecessor Work Adopted: Checked out '${selectedProfile.predecessorContinuity.openBranch}'. Ready to calibrate and push PR!`
    );
  };

  if (mapQ.isError) return <ErrorBlock error={mapQ.error} />;
  if (mapQ.isLoading || engineersQ.isLoading) {
    return (
      <div className="p-6">
        <LoadingBlock label="Synching Plant cognitive schematic & risk projections..." />
      </div>
    );
  }

  const selectNode = (tag: string | undefined) =>
    navigate({ search: tag ? { node: tag } : {} });

  const selected = selectedTag ? nodes.find((n) => n.tag === selectedTag) : undefined;
  const W = 1000, H = 600;

  const currentTasks = employeeTasks[selectedProfile.id] || selectedProfile.managerTasks;

  return (
    <div className="space-y-6 font-mono">
      <PageHeader
        eyebrow="Executive Plant Twin"
        title="Plant Knowledge & Equipment Topology"
        description="Interactive equipment schematic, custodian coverage, meeting schedule, manager tasks, technical videos, employee benefits, and predecessor handover continuity."
      />

      {/* Equipment Schematic SVG Grid */}
      <div className="px-6 pb-6">
        <ForgePanel className="p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display uppercase tracking-wider text-lg">Equipment Schematic Topology</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: colorFill("green") }} /> â‰¥3 Custodians</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: colorFill("yellow") }} /> 1â€“2 Custodians</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: colorFill("red") }} /> 0 Custodians (Unprotected)</span>
            </div>
          </div>
          {mapQ.isLoading ? (
            <LoadingBlock />
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[800px]">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Equipment Schematic Map" role="img">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.22 0.012 275 / 0.5)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width={W} height={H} fill="url(#grid)" />
                  {edges.map((e, i) => (
                    <line
                      key={i}
                      x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
                      stroke="oklch(0.80 0.14 85 / 0.45)"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  ))}
                  {nodes.map((n) => {
                    const activeCount = (n.active_engineers ?? []).filter((e) => e.retirement_year >= year).length;
                    const c = colorForNode(activeCount);
                    const fill = colorFill(c);
                    const r = n.criticality === "High" ? 22 : 18;
                    const isSel = selectedTag === n.tag;
                    return (
                      <g
                        key={n.tag}
                        transform={`translate(${n.x},${n.y})`}
                        className={`cursor-pointer focus:outline-none ${c === "red" ? "node-danger" : ""}`}
                        onClick={() => selectNode(n.tag === selectedTag ? undefined : n.tag)}
                        aria-label={`Equipment node ${n.tag}: ${n.name}, risk status: ${c === "red" ? "Critical" : c === "yellow" ? "Warning" : "Safe"}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectNode(n.tag === selectedTag ? undefined : n.tag);
                          }
                        }}
                      >
                        {isSel && <circle r={r + 14} fill="none" stroke="oklch(0.92 0.012 80)" strokeWidth={1.5} strokeDasharray="3 3" />}
                        <circle r={r + 8} fill={fill} fillOpacity={0.15} />
                        <circle r={r} fill={fill} fillOpacity={0.4} stroke={fill} strokeWidth={2} />
                        <text y={5} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={11} fill="oklch(0.92 0.012 80)" fontWeight={600}>
                          {n.tag}
                        </text>
                        <text y={-r - 5} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize={8} fontWeight={700} fill={fill}>
                          {c === "red" ? "[CRIT]" : c === "yellow" ? "[WARN]" : "[SAFE]"}
                        </text>
                        <text y={r + 18} textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontSize={11} letterSpacing={1} fill="oklch(0.59 0.025 80)">
                          {n.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </ForgePanel>
      </div>

      {selected && (
        <div className="px-6 pb-6 animate-fade-in">
          <NodeDetailDrawer node={selected} year={year} onClose={() => selectNode(undefined)} />
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* ðŸŒŸ COMPREHENSIVE AUTHENTICATED EMPLOYEE WORKSTREAM & OPERATIONS HUB  */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="px-6 pb-10 space-y-5">
        {/* Header with Signed-in details & Switcher */}
        <div className="p-5 bg-card border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-18 bg-[#18161d] border-2 border-primary flex items-end justify-center overflow-hidden shrink-0 shadow-lg">
                <SpritePortrait character={selectedProfile.avatarChar as OfficeCharacterName} scale={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{selectedProfile.name}</h3>
                  <span className="text-[9px] px-2 py-0.5 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold uppercase">
                    Active Signed-In
                  </span>
                </div>
                <span className="text-xs text-muted-foreground block mt-0.5">{selectedProfile.role}</span>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40">
                    {selectedProfile.pod}
                  </span>
                  <span className="px-2 py-0.5 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold">
                    {selectedProfile.knowledgePreserved}% Memory Preserved
                  </span>
                  <span className="text-muted-foreground">
                    {selectedProfile.verifiedSops} Verified SOPs Â· {selectedProfile.commitsCount} Commits
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAssignTaskModal(true)}
                className="px-3.5 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Task (Manager)
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" /> Submit PR to Manager
              </button>
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                className="px-3 py-2 bg-muted hover:bg-accent border border-border text-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-primary" /> Switch Employee
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-border/60 pb-3 text-xs">
            <button
              type="button"
              onClick={() => setEmployeeSubTab("workstream")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "workstream"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Active Workstream</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("meetings")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "meetings"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Meeting Schedule ({selectedProfile.meetings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("managerTasks")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "managerTasks"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Manager Tasks ({currentTasks.filter((t) => !t.done).length} Pending)</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("videos")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "videos"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Technical SOP Videos ({selectedProfile.trainingVideos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("benefits")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "benefits"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-red-400" />
              <span>Medical & Benefits Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("predecessor")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "predecessor"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#5ca97a]" />
              <span>Predecessor Continuity Playbook</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeSubTab("prs")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeSubTab === "prs"
                  ? "bg-primary text-primary-foreground font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Git PRs ({submissions.length})</span>
            </button>
          </div>

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 1: ACTIVE CURRENT WORKSTREAM                                  */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "workstream" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs animate-in fade-in duration-150">
              {/* Current Active Sprint */}
              <div className="p-4 bg-muted/40 border border-border space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase flex items-center gap-1.5 text-xs">
                      <GitCommit className="w-4 h-4 text-primary" /> Active Sprint Task
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 font-bold">
                      {selectedProfile.activeWork.status}
                    </span>
                  </div>
                  <strong className="text-xs text-foreground block">
                    {selectedProfile.activeWork.title}
                  </strong>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedProfile.activeWork.description}
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Sprint Acceptance Criteria:
                    </span>
                    {selectedProfile.activeWork.acceptanceCriteria.map((ac, acIdx) => (
                      <div key={acIdx} className="text-[11px] text-foreground/90 flex items-start gap-1.5">
                        <span className="text-primary font-bold">â–¸</span>
                        <span>{ac}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Branch: <strong className="text-foreground">{selectedProfile.activeWork.branch}</strong></span>
                  <span>Asset: <strong className="text-primary">{selectedProfile.activeWork.targetAsset}</strong></span>
                </div>
              </div>

              {/* Predecessor Snapshot Strip */}
              <div className="p-4 bg-[#162e21]/40 border border-[#5ca97a]/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#5ca97a] uppercase flex items-center gap-1.5 text-xs">
                      <History className="w-4 h-4 text-[#5ca97a]" /> Inherited Predecessor Footprint
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold">
                      Zero-Loss Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground">
                    Previous Predecessor: <strong className="text-[#5ca97a]">{selectedProfile.predecessorContinuity.predecessorName}</strong>
                  </div>
                  <p className="text-[11px] text-foreground/90 leading-relaxed bg-black/40 p-2.5 border border-[#5ca97a]/40 font-mono">
                    "{selectedProfile.predecessorContinuity.handoverNotes}"
                  </p>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Inherited Assets:</span>
                    {selectedProfile.predecessorContinuity.completedAssets.map((asset, aIdx) => (
                      <div key={aIdx} className="text-[10px] text-foreground/90 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#5ca97a]" />
                        <span>{asset}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#5ca97a]/40 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Handover: <strong>{selectedProfile.predecessorContinuity.handoverDate}</strong></span>
                  <button
                    type="button"
                    onClick={() => setEmployeeSubTab("predecessor")}
                    className="text-[#5ca97a] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Continuity Playbook</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 2: SHIFT MEETING SCHEDULE                                     */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "meetings" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" /> Daily Shift & Standup Schedule
                </span>
                <span className="text-[10px] text-muted-foreground">Plant Time Zone: IST (UTC+5:30)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedProfile.meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-muted/40 border border-border space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {meeting.time}
                        </span>
                        <span className="text-muted-foreground uppercase">{meeting.status}</span>
                      </div>
                      <strong className="text-xs text-foreground block">{meeting.title}</strong>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{meeting.agenda}</p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Location: <strong className="text-foreground">{meeting.room}</strong></span>
                      <button
                        type="button"
                        onClick={() => toast.success(`Joined ${meeting.title} session!`)}
                        className="px-2.5 py-1 bg-primary text-primary-foreground font-bold uppercase text-[9px] cursor-pointer"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 3: MANAGER-ASSIGNED TASKS & LIVE QUEUE                        */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "managerTasks" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-foreground">
                    Manager Assigned Task Queue ({currentTasks.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(true)}
                  className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-[10px] font-bold uppercase cursor-pointer"
                >
                  + Assign New Task
                </button>
              </div>

              <div className="space-y-2.5">
                {currentTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      t.done
                        ? "bg-[#162e21]/30 border-[#5ca97a]/40 opacity-80"
                        : "bg-muted/40 border-border"
                    }`}
                  >
                    <div className="space-y-1.5 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskDone(t.id)}
                        className="mt-0.5 cursor-pointer text-muted-foreground hover:text-primary"
                        title="Toggle task completion"
                      >
                        {t.done ? (
                          <CheckSquare className="w-4 h-4 text-[#5ca97a]" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className={`text-xs ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {t.title}
                          </strong>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 border uppercase ${
                              t.priority === "Urgent"
                                ? "bg-[#3b1d24] text-[#d96a62] border-[#d96a62]"
                                : t.priority === "High"
                                ? "bg-amber-950/40 text-amber-400 border-amber-500/40"
                                : "bg-primary/20 text-primary border-primary/40"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{t.notes}</p>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                          <span>Assigned by: <strong className="text-foreground">{t.assignedBy}</strong></span>
                          <span>Â·</span>
                          <span>Due: <strong className="text-primary">{t.dueDate}</strong></span>
                          <span>Â·</span>
                          <span>Asset: <strong className="text-foreground">{t.asset}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-primary block">+{t.credits} Credits</span>
                      <span className="text-[9px] text-muted-foreground">Reward</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 4: TECHNICAL TRAINING & SOP VIDEO GUIDES                      */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "videos" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-primary" /> Operational Runbook Videos & Master Walkthroughs
                </span>
                <span className="text-[10px] text-muted-foreground">Verified SOP Library</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProfile.trainingVideos.map((video) => (
                  <div
                    key={video.id}
                    className="p-4 bg-muted/40 border border-border space-y-3 flex flex-col justify-between hover:border-primary transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-video bg-[#110f17] border border-border flex items-center justify-center overflow-hidden group cursor-pointer"
                        onClick={() => setActiveVideo(video)}
                      >
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[9px] font-mono text-white">
                          {video.duration}
                        </span>
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/90 text-[9px] font-mono text-black font-bold">
                          {video.sopCode}
                        </span>
                      </div>

                      <strong className="text-xs text-foreground block">{video.title}</strong>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{video.description}</p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Instructor: <strong className="text-foreground">{video.instructor}</strong></span>
                      <button
                        type="button"
                        onClick={() => setActiveVideo(video)}
                        className="px-3 py-1 bg-primary text-primary-foreground font-bold uppercase text-[9px] flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" /> Watch SOP Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 5: EMPLOYEE WELFARE & BENEFITS PORTAL                         */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "benefits" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-red-400" /> Employee Welfare & Comprehensive Benefits Portal
                </span>
                <span className="text-[10px] text-[#5ca97a] font-bold">100% Employer-Covered Policy</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* 1. Free Medical & Hospital Bills */}
                <div className="p-4 bg-[#162e21]/40 border border-[#5ca97a] space-y-2">
                  <div className="flex items-center gap-2 text-[#5ca97a] font-bold text-xs uppercase">
                    <HeartPulse className="w-4 h-4 text-red-400" /> 100% Free Medical & Hospital Bills
                  </div>
                  <p className="text-[11px] text-foreground/90 leading-relaxed">
                    {selectedProfile.benefits.medical}
                  </p>
                  <div className="pt-2 border-t border-[#5ca97a]/40 text-[10px] text-muted-foreground flex justify-between">
                    <span>Zero Co-Pay</span>
                    <strong className="text-[#5ca97a]">Active Coverage</strong>
                  </div>
                </div>

                {/* 2. Hazardous Duty Life Shield */}
                <div className="p-4 bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                    <ShieldAlert className="w-4 h-4" /> Hazardous Duty Life Insurance
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedProfile.benefits.hazardousDuty}
                  </p>
                  <div className="pt-2 border-t border-border text-[10px] text-muted-foreground flex justify-between">
                    <span>Coverage Value:</span>
                    <strong className="text-foreground">₹1.50 Crore Policy</strong>
                  </div>
                </div>

                {/* 3. Upskilling & Certification Stipend */}
                <div className="p-4 bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                    <GraduationCap className="w-4 h-4" /> Master Class & Upskilling Stipend
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedProfile.benefits.upskilling}
                  </p>
                  <div className="pt-2 border-t border-border text-[10px] text-muted-foreground flex justify-between">
                    <span>Annual Budget:</span>
                    <strong className="text-primary">₹1,20,000 / Year</strong>
                  </div>
                </div>

                {/* 4. Township Housing & Utilities */}
                <div className="p-4 bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                    <Home className="w-4 h-4" /> Township Housing & Free Utilities
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedProfile.benefits.housing}
                  </p>
                  <div className="pt-2 border-t border-border text-[10px] text-muted-foreground flex justify-between">
                    <span>Housing Status:</span>
                    <strong className="text-foreground">Allocated & Subsidized</strong>
                  </div>
                </div>

                {/* 5. Knowledge Bounty Rewards */}
                <div className="p-4 bg-[#2b2413]/40 border border-amber-500/60 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                    <Coins className="w-4 h-4" /> Knowledge Preservation Bounty
                  </div>
                  <p className="text-[11px] text-foreground/90 leading-relaxed">
                    Preserve SOPs with 0 contradiction drift to earn quarterly payroll bonuses:{" "}
                    <strong className="text-amber-400">{selectedProfile.benefits.knowledgeBounty}</strong>.
                  </p>
                  <div className="pt-2 border-t border-amber-500/40 text-[10px] text-muted-foreground flex justify-between">
                    <span>Quarterly Bonus:</span>
                    <strong className="text-amber-400">Disbursing This Month</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 6: PREDECESSOR CONTINUITY PLAYBOOK & HOW TO CONTINUE WORK     */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "predecessor" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
                <div>
                  <span className="text-xs font-bold uppercase text-[#5ca97a] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#5ca97a]" /> Predecessor Work & Continuity Action Playbook
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Zero-Downtime Knowledge Transfer from {selectedProfile.predecessorContinuity.predecessorName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAdoptPredecessorBranch}
                  className="px-4 py-2 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <GitBranch className="w-3.5 h-3.5" /> Adopt & Resume Predecessor Branch
                </button>
              </div>

              {/* Predecessor Overview & Completed Work */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Completed Runbooks */}
                <div className="p-4 bg-muted/40 border border-border space-y-3">
                  <strong className="text-xs text-foreground uppercase block">
                    Completed Assets & Runbooks by Predecessor:
                  </strong>
                  <div className="space-y-1.5">
                    {selectedProfile.predecessorContinuity.completedAssets.map((asset, aIdx) => (
                      <div key={aIdx} className="p-2 bg-background border border-border flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#5ca97a] shrink-0" />
                        <span className="text-[11px] text-foreground">{asset}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-black/40 border border-[#5ca97a]/40 font-mono text-[10px] text-foreground/90">
                    "{selectedProfile.predecessorContinuity.handoverNotes}"
                  </div>
                </div>

                {/* Handover Critical Parameters */}
                <div className="p-4 bg-muted/40 border border-border space-y-3">
                  <strong className="text-xs text-foreground uppercase block">
                    Predecessor Baseline Calibration Curves:
                  </strong>
                  <div className="space-y-2">
                    {selectedProfile.predecessorContinuity.parameters.map((param, pIdx) => (
                      <div key={pIdx} className="p-2.5 bg-background border border-border flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{param.param}:</span>
                        <strong className="text-[11px] text-primary">{param.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-muted-foreground">
                    Active Open Branch: <strong className="text-[#5ca97a]">{selectedProfile.predecessorContinuity.openBranch}</strong>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Continuity Instructions */}
              <div className="p-4 bg-[#162e21]/40 border border-[#5ca97a] space-y-3 text-xs">
                <strong className="text-xs text-[#5ca97a] uppercase block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> How to Continue Their Work (Step-by-Step Protocol):
                </strong>

                <div className="space-y-2">
                  {selectedProfile.predecessorContinuity.continuityPlaybook.map((step, sIdx) => (
                    <div key={sIdx} className="p-2.5 bg-black/40 border border-[#5ca97a]/30 text-[11px] text-foreground/90 flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-[#5ca97a] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {/* TAB 7: GIT PULL REQUESTS & MANAGER REVIEW QUEUE                   */}
          {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {employeeSubTab === "prs" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-foreground">
                    Work Submissions & Pull Request Manager Review Queue ({submissions.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-3 py-1 bg-[#5ca97a] hover:bg-[#72be8f] text-[#1a1320] font-bold text-[10px] uppercase cursor-pointer"
                >
                  + Submit New PR
                </button>
              </div>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {submissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-3.5 bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
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
          )}
        </div>
      </div>

      {/* â”€â”€ MODAL: ASSIGN TASK (MANAGER) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl p-6 space-y-4 font-mono animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground uppercase">
                  Assign New Task to {selectedProfile.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignTaskModal(false)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                  Task Title
                </label>
                <input
                  type="text"
                  value={assignedTaskTitle}
                  onChange={(e) => setAssignedTaskTitle(e.target.value)}
                  placeholder="e.g. PRJ-MGR-08: Calibrate Emergency Steam Drum Bypass Rate"
                  required
                  className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Target Equipment Asset
                  </label>
                  <select
                    value={assignedTaskAsset}
                    onChange={(e) => setAssignedTaskAsset(e.target.value)}
                    className="w-full bg-background border border-border px-2.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="B-101">B-101 (Secondary Superheater)</option>
                    <option value="K-301">K-301 (6.6kV Bus-Tie Switchgear)</option>
                    <option value="V-204">V-204 (Monsoon Positioner Valve)</option>
                    <option value="T-900">T-900 (Turbine Governor Rig)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Priority Level
                  </label>
                  <select
                    value={assignedTaskPriority}
                    onChange={(e) => setAssignedTaskPriority(e.target.value)}
                    className="w-full bg-background border border-border px-2.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Urgent">Urgent (Immediate Shift Action)</option>
                    <option value="High">High (Within 24 Hours)</option>
                    <option value="Normal">Normal (Sprint Backlog)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Due Date & Time
                  </label>
                  <input
                    type="text"
                    value={assignedTaskDue}
                    onChange={(e) => setAssignedTaskDue(e.target.value)}
                    placeholder="e.g. Tomorrow, 17:00 IST"
                    className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                    Credit Reward Upon Completion
                  </label>
                  <input
                    type="number"
                    value={assignedTaskCredits}
                    onChange={(e) => setAssignedTaskCredits(Number(e.target.value))}
                    min={10}
                    max={200}
                    className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                  Work Guidelines & Acceptance Criteria
                </label>
                <textarea
                  value={assignedTaskNotes}
                  onChange={(e) => setAssignedTaskNotes(e.target.value)}
                  placeholder="Specify calibration parameters, OISD compliance guidelines, and zero-drift verification instructions..."
                  rows={3}
                  className="w-full bg-background border border-border px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(false)}
                  className="px-4 py-2 border border-border hover:bg-muted text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs uppercase cursor-pointer shadow-md"
                >
                  Dispatch Task to Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: TECHNICAL VIDEO GUIDE PLAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border shadow-2xl p-6 space-y-4 font-mono animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground uppercase truncate">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated High-Tech Video Player Screen */}
            <div className="aspect-video bg-black border-2 border-primary/60 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
              <div className="flex items-center justify-between text-[10px] text-primary/80 font-mono">
                <span className="px-2 py-0.5 bg-primary/20 border border-primary/40">
                  {activeVideo.sopCode} Â· 1080p HD
                </span>
                <span className="animate-pulse flex items-center gap-1 text-[#5ca97a]">
                  <span className="w-2 h-2 rounded-full bg-[#5ca97a]" /> Live SOP Player
                </span>
              </div>

              {/* Central Visual Animation */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary mx-auto flex items-center justify-center animate-pulse">
                  <Play className="w-8 h-8 text-primary fill-current ml-1" />
                </div>
                <div className="font-display text-sm uppercase tracking-wider text-foreground font-bold">
                  {activeVideo.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  Master Instruction by: <strong className="text-primary">{activeVideo.instructor}</strong>
                </div>
              </div>

              {/* Player Controls Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-2/3 animate-pulse" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>08:42 / {activeVideo.duration}</span>
                  <span className="text-primary font-bold">Verified Zero Contradictions</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step SOP Transcript */}
            <div className="p-3.5 bg-muted/40 border border-border space-y-2 text-xs">
              <strong className="text-[11px] text-foreground uppercase block font-bold">
                Step-by-Step Technical SOP Transcript:
              </strong>
              <p className="text-[11px] text-foreground/90 font-mono leading-relaxed bg-black/40 p-2.5 border border-border">
                {activeVideo.transcriptPreview}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="px-5 py-2 bg-primary text-primary-foreground font-bold uppercase cursor-pointer"
              >
                Close Player
              </button>
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

      {/* â”€â”€ MODAL: SIGN IN / SWITCH EMPLOYEE PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl p-6 space-y-4 font-mono animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground uppercase">
                  Sign In As Plant Employee ({PLANT_EMPLOYEES.length} Custodians)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignInModal(false)}
                className="p-1 hover:bg-accent border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select an employee or domain manager to authenticate into their active workstream, meetings schedule, manager tasks, benefits, and predecessor handover history:
            </p>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {PLANT_EMPLOYEES.map((emp) => {
                const isSelected = emp.id === selectedProfile.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfile(emp);
                      setShowSignInModal(false);
                      toast.success(`Signed in as ${emp.name} (${emp.role})`);
                    }}
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
                        {isSelected ? (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[#5ca97a]/20 text-[#5ca97a] border border-[#5ca97a]/40 font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#5ca97a] font-bold">
                            {emp.knowledgePreserved}% Preserved
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{emp.role}</span>
                      <div className="flex items-center justify-between mt-1 text-[9px]">
                        <span className="text-primary font-bold">{emp.pod}</span>
                        <span className="text-muted-foreground">{emp.verifiedSops} Verified SOPs</span>
                      </div>
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

function NodeDetailDrawer({ node, year, onClose }: { node: VulnNode; year: number; onClose: () => void }) {
  const causalQ = useQuery({ queryKey: ["causal", node.tag], queryFn: () => api.causal(node.tag) });
  const cfQ = useQuery({ queryKey: ["cf", node.tag], queryFn: () => api.counterfactuals(node.tag) });

  const active = (node.active_engineers ?? []).filter((e) => e.retirement_year >= year);
  const retired = (node.retired_engineers ?? []).concat(
    (node.active_engineers ?? []).filter((e) => e.retirement_year < year),
  );

  return (
    <ForgePanel className="relative font-mono">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
        aria-label="Close detail"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="grid gap-px bg-border lg:grid-cols-3">
        {/* Meta */}
        <div className="bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <EquipmentTag tag={node.tag} />
            <span className="font-display text-lg">{node.name}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-3">{node.process_area}</div>
          <div className="flex items-center gap-2 mb-4">
            <Tag tone={node.criticality === "High" ? "fire" : "gold"}>{node.criticality}</Tag>
            <span className="rupee-counter text-xl">₹{(node.downtime_cost / 1e7).toFixed(2)} Cr</span>
          </div>
          <div className="section-label">Active custodians at {year}</div>
          {active.length === 0 ? (
            <div className="text-destructive text-xs mt-1 font-mono uppercase tracking-wider">None — knowledge lost</div>
          ) : (
            <ul className="text-xs mt-1 space-y-0.5">
              {active.map((a) => (
                <li key={a.name}>
                  {a.name} <span className="text-muted-foreground">Â· retires {a.retirement_year}</span>
                </li>
              ))}
            </ul>
          )}
          {retired.length > 0 && (
            <>
              <div className="section-label mt-4">Retired</div>
              <ul className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                {retired.map((a) => (
                  <li key={a.name}>{a.name} Â· {a.retirement_year}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Causal Timeline */}
        <div className="bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="font-display uppercase tracking-wider text-sm">Causal Timeline Trace</h3>
          </div>
          {causalQ.isLoading ? (
            <div className="text-xs text-muted-foreground">Loadingâ€¦</div>
          ) : (causalQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No causal chains recorded.</p>
          ) : (
            <ol className="relative border-l border-border ml-1 space-y-3">
              {(causalQ.data ?? []).map((c: CausalLink) => (
                <li key={c.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="font-display">{c.parent_event}</span>
                    <span className="text-muted-foreground">â†’</span>
                    <span className="font-display text-primary">{c.child_event}</span>
                    {c.is_prediction ? (
                      <span className="text-[0.6rem] uppercase border border-accent text-accent px-1">prediction</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Counterfactuals */}
        <div className="bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-4 w-4 text-accent" />
            <h3 className="font-display uppercase tracking-wider text-sm">Counterfactual Simulator</h3>
          </div>
          {cfQ.isLoading ? (
            <div className="text-xs text-muted-foreground">Loadingâ€¦</div>
          ) : (cfQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No counterfactuals on file.</p>
          ) : (
            <div className="space-y-3">
              {(cfQ.data ?? []).map((cf: Counterfactual) => (
                <div key={cf.id} className="border border-border p-3 animate-scale-in">
                  <div className="font-display text-sm tracking-wide">{cf.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{cf.intervention}</p>
                  <ul className="mt-2 space-y-0.5">
                    {cf.consequences.split(";").map((c, i) => (
                      <li key={i} className="text-[0.7rem] flex gap-1">
                        <span className="text-destructive">â–¸</span>
                        <span>{c.trim()}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-right">
                    <span className="font-counter text-2xl text-primary tabular-nums gold-glow">
                      ₹{cf.cost_avoided_crore.toFixed(2)} Cr
                    </span>
                    <div className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">saved</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ForgePanel>
  );
}
