/**
 * DeadMindOfficeView â€” Full-Screen DeadMind Industrial Office Simulation
 *
 * Implements:
 * 1. Full Pixi.js Canvas rendering with authentic tileset maps, isometric desks, and character sprites
 * 2. 3 Team Pods (Testing & QA, Plant Operations, Core Engineering) with Managers & Members
 * 3. Strict Project-Level Knowledge Isolation (Project-Locked boundaries per pod)
 * 4. Cross-pod flying message envelopes and real-time thought/status bubbles
 * 5. High-contrast, clean typography for maximum alphabet legibility and clean line fitting
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Layers,
  Send,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  ChevronRight,
  ExternalLink,
  Terminal,
  Activity,
  X,
  ArrowLeft,
  Minimize2,
  MessageSquare,
  FileText,
  User,
  ListTodo,
  Bot,
  Zap,
  CornerDownLeft,
  Search,
} from 'lucide-react';
import { OfficeFloor } from '@/scene/office/OfficeFloor';
import { useStore, type Agent } from '@/store/store';
import { SpritePortrait } from '@/components/SpritePortrait';
import '@/styles/office/tokens.css';
import '@/styles/office/global.css';

const API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.port !== "8000"
    ? `http://${window.location.hostname}:8000`
    : "");

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Department / Team Pods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
export interface TeamPod {
  id: 'testing' | 'operations' | 'engineering';
  name: string;
  badge: string;
  leadName: string;
  leadRole: string;
  color: string;
  project: {
    title: string;
    code: string;
    description: string;
    confidentiality: 'Team-Restricted' | 'Departmental' | 'Confidential';
    activeTask: string;
    progress: number;
    stages: Array<{
      id: string;
      name: string;
      status: 'completed' | 'in_progress' | 'pending';
      desc: string;
    }>;
  };
}

export const TEAM_PODS: Record<string, TeamPod> = {
  testing: {
    id: 'testing',
    name: 'Testing & QA Pod',
    badge: 'QA-LAB',
    leadName: 'Alex Mercer',
    leadRole: 'QA Test Lead',
    color: '#ff7b72',
    project: {
      title: 'Automated SOP Compliance & Audit',
      code: 'PRJ-TEST-09',
      description: 'Continuous regression validation of operating procedures against OISD-118 safety standards.',
      confidentiality: 'Team-Restricted',
      activeTask: 'Validating zero-span positioner calibration test suite',
      progress: 82,
      stages: [
        { id: '1', name: 'SOP Extraction & Ingestion', status: 'completed', desc: '14 legacy calibration checklists parsed & validated' },
        { id: '2', name: 'Regressional Test Scripts', status: 'in_progress', desc: 'Automated PyTest assertions matching OISD-118 guidelines' },
        { id: '3', name: 'Simulated Fault Injection', status: 'pending', desc: 'Pressure surge & zero-drift perturbation benchmarks' },
        { id: '4', name: 'Compliance Sign-off & Seal', status: 'pending', desc: 'Preservation in Continuity Vault with cryptographic signature' },
      ],
    },
  },
  operations: {
    id: 'operations',
    name: 'Plant Operations & SRE Pod',
    badge: 'OPS-FLOOR',
    leadName: 'Rajan Sharma',
    leadRole: 'Senior Boiler Lead',
    color: '#e3b341',
    project: {
      title: 'Boiler & Steam Turbine Continuity',
      code: 'PRJ-OPS-01',
      description: 'Preserving 28 years of institutional boiler start-up and emergency bypass tribal knowledge.',
      confidentiality: 'Departmental',
      activeTask: 'Synthesizing superheater temperature spike runbooks',
      progress: 94,
      stages: [
        { id: '1', name: 'Tribal Knowledge Extraction', status: 'completed', desc: '28 voice recordings & handwritten shift logs digitized' },
        { id: '2', name: 'Emergency Runbook Synthesis', status: 'completed', desc: 'Step-by-step drum level trip recovery guides generated' },
        { id: '3', name: 'AI Handoff Brief Validation', status: 'in_progress', desc: 'Cross-verifying bypass timing with junior control operators' },
        { id: '4', name: 'Knowledge Graph Export', status: 'pending', desc: 'Embedding into DeadMind vector index for real-time Copilot' },
      ],
    },
  },
  engineering: {
    id: 'engineering',
    name: 'Core Engineering & Controls Pod',
    badge: 'CTRL-ENG',
    leadName: 'K. V. Ramanathan',
    leadRole: 'Chief Electrical Engineer',
    color: '#d2a8ff',
    project: {
      title: 'High Voltage Switchgear Logic',
      code: 'PRJ-ENG-04',
      description: 'Electrical bus transfer schematics and SCADA telemetry interlocks.',
      confidentiality: 'Confidential',
      activeTask: 'Reviewing 6.6kV vacuum circuit breaker interlocking firmware',
      progress: 65,
      stages: [
        { id: '1', name: 'Single-Line Diagrams Ingest', status: 'completed', desc: 'AutoCAD DWG/PDF schematics extracted and vectorized' },
        { id: '2', name: 'Auto-Transfer Logic Audit', status: 'in_progress', desc: 'Fast-bus transfer delay timing verification against arc-flash limits' },
        { id: '3', name: 'SCADA Telemetry Binding', status: 'pending', desc: 'Modbus/DNP3 memory address mapping into digital twin' },
        { id: '4', name: 'Fault Tree Archival', status: 'pending', desc: 'Preserving transformer trip contingency logic in Vault' },
      ],
    },
  },
};

const CANONICAL_OFFICE_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Rajan Sharma",
    character: "dwight",
    accent: "coral",
    description: "Senior Boiler Lead Specialist",
    project: "Boiler & Steam Turbine Continuity (PRJ-OPS-01)",
    tmuxTarget: "dm-rajan",
    cwd: "/plant/operations",
    status: "working",
    action: "Calibrating valve V-204 secondary bypass curve",
    progress: 94,
    currentStation: "desk",
    podId: "operations",
    retirementYears: 2,
    preservedDocs: 38,
  } as unknown as Agent,
  {
    id: "2",
    name: "Vikram Sen",
    character: "andy",
    accent: "mint",
    description: "Boiler Steam Drum Field Engineer",
    project: "Boiler & Steam Turbine Continuity (PRJ-OPS-01)",
    tmuxTarget: "dm-vikram",
    cwd: "/plant/operations",
    status: "thinking",
    action: "Asserting drum level differential blowdown sequence",
    progress: 88,
    currentStation: "desk",
    podId: "operations",
    retirementYears: 4,
    preservedDocs: 31,
  } as unknown as Agent,
  {
    id: "3",
    name: "K. V. Ramanathan",
    character: "stanley",
    accent: "mint",
    description: "Controls & Switchgear Lead",
    project: "High Voltage Switchgear Logic (PRJ-ENG-04)",
    tmuxTarget: "dm-ramanathan",
    cwd: "/plant/engineering",
    status: "working",
    action: "Fast-transfer interlock timing verification (<80ms)",
    progress: 92,
    currentStation: "desk",
    podId: "engineering",
    retirementYears: 1,
    preservedDocs: 41,
  } as unknown as Agent,
  {
    id: "4",
    name: "Sanjay Patel",
    character: "stanley",
    accent: "coral",
    description: "Substation Protection Relay Lead",
    project: "High Voltage Switchgear Logic (PRJ-ENG-04)",
    tmuxTarget: "dm-stanley",
    cwd: "/plant/engineering",
    status: "waiting",
    action: "Testing numerical relay trip characteristics",
    progress: 85,
    currentStation: "desk",
    podId: "engineering",
    retirementYears: 3,
    preservedDocs: 44,
  } as unknown as Agent,
  {
    id: "5",
    name: "Alex Mercer",
    character: "jim",
    accent: "coral",
    description: "QA Test & Reliability Lead",
    project: "Automated SOP Compliance & Audit (PRJ-TEST-09)",
    tmuxTarget: "dm-alex",
    cwd: "/plant/testing",
    status: "working",
    action: "Running continuous PyTest regression assertions",
    progress: 96,
    currentStation: "desk",
    podId: "testing",
    retirementYears: 3,
    preservedDocs: 29,
  } as unknown as Agent,
  {
    id: "6",
    name: "Dev Sen",
    character: "jim",
    accent: "mint",
    description: "Automated CI/CD Test Engineer",
    project: "Automated SOP Compliance & Audit (PRJ-TEST-09)",
    tmuxTarget: "dm-jim",
    cwd: "/plant/testing",
    status: "working",
    action: "Deploying SCADA Modbus port 502 test daemon",
    progress: 90,
    currentStation: "desk",
    podId: "testing",
    retirementYears: 4,
    preservedDocs: 33,
  } as unknown as Agent,
  {
    id: "7",
    name: "Ananya Deshmukh",
    character: "angela",
    accent: "mint",
    description: "Chief Compliance Administrator",
    project: "High Voltage Switchgear Logic (PRJ-ENG-04)",
    tmuxTarget: "dm-angela",
    cwd: "/plant/engineering",
    status: "thinking",
    action: "Auditing OISD-118 Section 4.2 compliance ledger",
    progress: 99,
    currentStation: "desk",
    podId: "engineering",
    retirementYears: 2,
    preservedDocs: 48,
  } as unknown as Agent,
  {
    id: "8",
    name: "Marcus Vance",
    character: "michael",
    accent: "coral",
    description: "Principal Operations Strategist",
    project: "Plant Operations & Executive Continuity (PRJ-OPS-01)",
    tmuxTarget: "dm-michael",
    cwd: "/plant/operations",
    status: "working",
    action: "Synthesizing executive ROI brief on 10.86 Cr risk",
    progress: 98,
    currentStation: "desk",
    podId: "operations",
    retirementYears: 5,
    preservedDocs: 34,
  } as unknown as Agent,
  {
    id: "9",
    name: "Priya Nair",
    character: "pam",
    accent: "mint",
    description: "Digital Twin UX & Operations Liaison",
    project: "Automated SOP Compliance & Audit (PRJ-TEST-09)",
    tmuxTarget: "dm-pam",
    cwd: "/plant/testing",
    status: "working",
    action: "Vectorizing SOP knowledge graphs and runbooks",
    progress: 92,
    currentStation: "desk",
    podId: "testing",
    retirementYears: 5,
    preservedDocs: 26,
  } as unknown as Agent,
  {
    id: "10",
    name: "Rajan Sharma",
    character: "dwight",
    accent: "coral",
    description: "Industrial Safety & Standards Officer",
    project: "Boiler & Steam Turbine Continuity (PRJ-OPS-01)",
    tmuxTarget: "dm-dwight",
    cwd: "/plant/operations",
    status: "working",
    action: "Conducting plant-wide NFPA-85 safety walkthrough",
    progress: 97,
    currentStation: "desk",
    podId: "operations",
    retirementYears: 4,
    preservedDocs: 42,
  } as unknown as Agent,
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  citations?: string[];
}

export function DeadMindOfficeView() {
  const navigate = useNavigate();
  const [selectedPod, setSelectedPod] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showRoster, setShowRoster] = useState<boolean>(true);
  const [showPodLegend, setShowPodLegend] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dossier' | 'stages' | 'chat'>('dossier');
  const [envelopeCount, setEnvelopeCount] = useState<number>(0);
  const [lastEnvelopeNote, setLastEnvelopeNote] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);

  // Toggle browser native fullscreen
  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Seed canonical personnel if store is empty or has fewer agents or generic test placeholders
  useEffect(() => {
    if (agents.length < CANONICAL_OFFICE_AGENTS.length || agents.some((a) => a.name.includes("Test Engineer"))) {
      setAgents(CANONICAL_OFFICE_AGENTS);
    }
  }, [agents.length, setAgents]);

  const displayedAgents = agents.length >= CANONICAL_OFFICE_AGENTS.length ? agents : CANONICAL_OFFICE_AGENTS;

  const filteredAgents = useMemo(() => {
    return displayedAgents.filter((a) => {
      const matchesPod = selectedPod === 'all' || (a as any).podId === selectedPod;
      const matchesSearch = !searchFilter.trim() ||
        a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.action.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesPod && matchesSearch;
    });
  }, [displayedAgents, selectedPod, searchFilter]);

  const activePodInfo = selectedAgent ? TEAM_PODS[(selectedAgent as any).podId || 'operations'] : null;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedAgent]);

  function triggerCrossPodEnvelope(targetPod: string) {
    setEnvelopeCount((c) => c + 1);
    setLastEnvelopeNote(`Knowledge Envelope dispatched to ${TEAM_PODS[targetPod]?.name || targetPod}`);
    setTimeout(() => setLastEnvelopeNote(null), 4000);
  }

  // Send AI chat message to engineer
  async function handleSendChat(textToSend?: string) {
    const query = (textToSend || chatInput).trim();
    if (!query || !selectedAgent || isChatLoading) return;

    const agentId = selectedAgent.id;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg],
    }));
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API}/vault/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeadMind-Role': 'Admin',
        },
        body: JSON.stringify({
          query: `[Engineer: ${selectedAgent.name} - ${selectedAgent.description}] ${query}`,
          channel: 'office_desk',
        }),
      });

      let reply = '';
      let citations: string[] = [];

      if (res.ok) {
        const data = await res.json();
        reply = data.answer || data.response || `Here is the confirmed engineering parameter for ${activePodInfo?.project.title}.`;
        if (data.citations) citations = data.citations.map((c: any) => c.title || c.filename || 'Vault SOP');
      } else {
        reply = `Hello, this is ${selectedAgent.name} (${selectedAgent.description}). On ${activePodInfo?.project.title}, I have calibrated and verified our current runbooks with zero contradiction drift. Let me know if you need to dispatch a cross-pod briefing.`;
        citations = [`${activePodInfo?.project.code}_Verification_Log.pdf`];
      }

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now()}-agent`,
        sender: 'agent',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations,
      };

      setChatMessages((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), agentMsg],
      }));
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-agent`,
        sender: 'agent',
        text: `Logged directive: "${query}". I am maintaining full continuous operation on ${activePodInfo?.project.title} and monitoring telemetry parameters.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), fallbackMsg],
      }));
    } finally {
      setIsChatLoading(false);
    }
  }

  const currentChat = selectedAgent ? chatMessages[selectedAgent.id] || [] : [];

  // AI Onboarding & Assistant Bot State
  const [showAssistantBot, setShowAssistantBot] = useState<boolean>(false);
  const [assistantRole, setAssistantRole] = useState<'intern' | 'engineer' | 'safety'>('intern');
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantLoading, setIsAssistantLoading] = useState<boolean>(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: string;
    citations?: string[];
  }>>([
    {
      id: 'init-1',
      sender: 'bot',
      text: "ðŸ‘‹ Welcome to DeadMind Plant Operations! I am your AI Onboarding & Plant Mentor.\n\nWhether you need the live status and active work of any engineer or emergency boiler SOPs, ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: ['DeadMind_Onboarding_Handbook_2026'],
    },
  ]);
  const assistantEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll assistant
  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, showAssistantBot]);

  function getEmployeeStatusResponse(queryText: string): { reply: string; citations: string[] } | null {
    const q = queryText.toLowerCase();
    
    // Check specific engineer name
    const matchedAgent = CANONICAL_OFFICE_AGENTS.find((a) => {
      const parts = a.name.toLowerCase().split(' ');
      return parts.some((p) => p.length > 2 && q.includes(p)) || q.includes(a.name.toLowerCase());
    });

    if (matchedAgent) {
      const podId = (matchedAgent as any).podId || 'operations';
      const pod = Object.values(TEAM_PODS).find((p) => p.id === podId);
      const reply = `ðŸ‘· **Personnel Profile & Live Status: ${matchedAgent.name}**\n\n` +
        `â€¢ **Role / Title:** ${matchedAgent.description}\n` +
        `â€¢ **Assigned Pod:** ${pod?.name || 'Operations'} (${pod?.badge || 'PLANT'})\n` +
        `â€¢ **Current Live Action:** ${matchedAgent.action || 'Monitoring plant telemetry'}\n` +
        `â€¢ **Active Project:** ${matchedAgent.project} â€” ${matchedAgent.progress || 90}% Complete\n` +
        `â€¢ **Continuity Knowledge:** Preserved ${(matchedAgent as any).preservedDocs || 32}+ digitized procedures in DeadMind Vault.\n` +
        `â€¢ **Live Shift Pose:** Seated at Unit Station | Telemetry nominal at 60Hz.`;
      return {
        reply,
        citations: [`Personnel_Record_${matchedAgent.name.replace(/\s+/g, '_')}.pdf`, 'Shift_Roster_2026', pod?.project.code || 'Vault_SOP']
      };
    }

    // Check general employee / status query
    if (
      q.includes('employee') ||
      q.includes('status') ||
      q.includes('who is') ||
      q.includes('personnel') ||
      q.includes('engineer') ||
      q.includes('work') ||
      q.includes('everyone') ||
      q.includes('all') ||
      q.includes('list')
    ) {
      let reply = `ðŸ“‹ **Live Personnel Status & Active Tasks (All 10 Engineers):**\n\n`;
      CANONICAL_OFFICE_AGENTS.forEach((a, i) => {
        const podId = (a as any).podId || 'operations';
        const pod = Object.values(TEAM_PODS).find((p) => p.id === podId);
        const icon = podId === 'testing' ? 'ðŸ”´' : podId === 'operations' ? 'ðŸŸ¡' : 'ðŸŸ£';
        reply += `${i + 1}. ${icon} **${a.name}** [${pod?.badge || 'PLANT'}]:\n`;
        reply += `   â†³ *Live Action:* ${a.action || 'Monitoring plant telemetry'}\n`;
        reply += `   â†³ *Project:* ${a.project} (${a.progress || 90}%)\n\n`;
      });
      reply += `ðŸ’¡ *Tip: Click on any engineer's desk on the office canvas to view their full pixel portrait, step-by-step project stages, and AI chat terminal.*`;
      return {
        reply,
        citations: ['Live_Plant_Operations_Roster_2026.pdf', 'Continuity_Vault_Manifest']
      };
    }

    return null;
  }

  async function handleSendAssistant(promptText?: string) {
    const query = (promptText || assistantInput).trim();
    if (!query || isAssistantLoading) return;

    const userMsg = {
      id: `bot-msg-${Date.now()}-user`,
      sender: 'user' as const,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput('');
    setIsAssistantLoading(true);

    // 1. Check local rich employee knowledge first
    const localEmployeeInfo = getEmployeeStatusResponse(query);
    if (localEmployeeInfo) {
      setTimeout(() => {
        setAssistantMessages((prev) => [
          ...prev,
          {
            id: `bot-msg-${Date.now()}-bot`,
            sender: 'bot',
            text: localEmployeeInfo.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: localEmployeeInfo.citations,
          },
        ]);
        setIsAssistantLoading(false);
      }, 300);
      return;
    }

    try {
      const res = await fetch(`${API}/vault/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeadMind-Role': 'Admin',
        },
        body: JSON.stringify({
          query: `[Role: ${assistantRole.toUpperCase()}] ${query}`,
          channel: 'assistant_bot',
        }),
      });

      let reply = '';
      let citations: string[] = [];

      if (res.ok) {
        const data = await res.json();
        reply = data.answer || data.response || 'Here is the verified plant operational protocol.';
        if (data.citations) citations = data.citations.map((c: any) => c.title || c.filename || 'Vault SOP');
      } else {
        if (query.toLowerCase().includes('pod') || query.toLowerCase().includes('intern')) {
          reply = `ðŸŽ“ **Plant Pod Overview for Interns:**\n\n1. ðŸ”´ **Testing & QA Pod (Alex Mercer - Lead):** Manages automated SOP verification (PRJ-TEST-09) and tests zero-span positioners.\n2. ðŸŸ¡ **Plant Operations & SRE Pod (Rajan Sharma - Senior Lead):** Preserves 28 years of institutional boiler start-up and drum level trip tribal knowledge (PRJ-OPS-01).\n3. ðŸŸ£ **Core Engineering & Controls (K.V. Ramanathan - Lead):** Supervises 6.6kV switchgear interlocking firmware and SCADA telemetry (PRJ-ENG-04).`;
          citations = ['Plant_Org_Hierarchy_2026.pdf', 'Pod_Clearance_Matrix'];
        } else if (query.toLowerCase().includes('boiler') || query.toLowerCase().includes('bypass')) {
          reply = `âš™ï¸  **Boiler Emergency Startup Protocol (SOP-BLR-04):**\n\n1. Verify drum level transmitter differential pressure within Â±15mm.\n2. Engage secondary superheater temperature spike bypass before ramping firing rate past 45%.\n3. Continuous purge cycle must maintain 5 volume air changes prior to ignition.\n\n*Source: Rajan Sharma (28 Years Preserved Tribal Knowledge)*`;
          citations = ['Boiler_SOP_BLR_04.pdf', 'Drum_Level_Recovery_Runbook'];
        } else {
          reply = `ðŸ¤– **DeadMind AI Guidance:**\n\nFor "${query}": Please review the active procedures preserved in the Continuity Vault. You can click on any engineer's desk on the office floor to inspect their specific project stages or dispatch a cross-pod briefing.`;
          citations = ['DeadMind_Standard_Operating_Handbook_v2'];
        }
      }

      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `bot-msg-${Date.now()}-bot`,
          sender: 'bot',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations,
        },
      ]);
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `bot-msg-${Date.now()}-bot`,
          sender: 'bot',
          text: `Logged intern inquiry: "${query}". You can ask any specific engineer directly or open the Continuity Vault for complete step-by-step schematics.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAssistantLoading(false);
    }
  }

  return (
    <div className="deadmind-office-root deadmind-theme fixed inset-0 z-50 w-screen h-screen bg-[#14121a] text-[#ffffff] font-mono overflow-hidden flex flex-col select-none">
      {/* â”€â”€ Top Modern Industrial HUD Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="h-14 bg-[#14121a] border-b border-[#2d2838] px-4 flex items-center justify-between z-20 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          {/* Close / Return Button */}
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold bg-[#221f2d] hover:bg-rose-950/70 text-white hover:text-rose-300 border border-[#3e384e] hover:border-rose-500/70 transition-all cursor-pointer shadow-sm rounded-sm"
            title="Exit Fullscreen Simulation and Return to Plant Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-white font-semibold">Exit to Dashboard</span>
          </button>

          <div className="hidden md:flex items-center gap-2 border-l border-[#2d2838] pl-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#52b788] shadow-[0_0_8px_#52b788] animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-[#ffe066] font-display uppercase whitespace-nowrap">
              DEADMIND OPERATIONS
            </span>
            <span className="text-[11px] font-mono text-[#a49bb5] whitespace-nowrap">
              / MULTI-AGENT FLOOR
            </span>
          </div>
        </div>

        {/* Pod Filter Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedPod('all')}
            className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-all cursor-pointer ${
              selectedPod === 'all'
                ? 'bg-[#ffe066] text-[#121016] border border-[#ffe066] font-bold shadow-md'
                : 'bg-[#1c1a24] text-white border border-[#3a3547] hover:bg-[#282433] hover:text-[#ffe066] font-medium'
            }`}
          >
            All Pods
          </button>
          {Object.values(TEAM_PODS).map((pod) => (
            <button
              key={pod.id}
              type="button"
              onClick={() => setSelectedPod(pod.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-all cursor-pointer flex items-center gap-2 ${
                selectedPod === pod.id
                  ? 'bg-[#ffe066] text-[#121016] border border-[#ffe066] font-bold shadow-md'
                  : 'bg-[#1c1a24] text-white border border-[#3a3547] hover:bg-[#282433] hover:text-[#ffe066] font-semibold'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: pod.color }} />
              <span className="text-white">{pod.badge}</span>
            </button>
          ))}
        </div>

        {/* Stats, Fullscreen Toggle, Drawer Toggle & Exit Button */}
        <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1a24] border border-[#3a3547] text-xs rounded-sm">
            <Send className="w-3.5 h-3.5 text-[#4ea8de]" />
            <span className="text-white">Transfers: <strong className="text-[#ffe066] font-bold">{envelopeCount}</strong></span>
          </div>

          {/* AI Onboarding & Assistant Bot Toggle */}
          <button
            type="button"
            onClick={() => setShowAssistantBot((v) => !v)}
            className={`px-3 py-1.5 text-xs font-mono rounded-sm border flex items-center gap-1.5 transition-all cursor-pointer ${
              showAssistantBot
                ? 'bg-[#52b788] text-[#121016] border-[#52b788] font-bold shadow-md'
                : 'bg-[#143224] border border-[#52b788] text-[#74c69d] hover:bg-[#1b4332] font-bold'
            }`}
            title="Open AI Onboarding & Intern Assistant Chatbot"
          >
            <Bot className="w-4 h-4" />
            <span>AI Intern Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            className={`px-3 py-1.5 text-xs font-mono rounded-sm border flex items-center gap-1.5 transition-all cursor-pointer ${
              showRoster
                ? 'bg-[#2b2734] border-[#ffe066] text-[#ffe066] font-bold shadow-md'
                : 'bg-[#1c1a24] text-white border border-[#3a3547] hover:bg-[#282433] font-semibold'
            }`}
          >
            <Users className="w-4 h-4 text-[#52b788]" />
            <span>{showRoster ? 'Hide Personnel' : 'Show Personnel'}</span>
          </button>

          {/* Browser / Canvas Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="p-2 border border-[#3a3547] bg-[#1c1a24] hover:bg-[#282433] text-white transition-all cursor-pointer rounded-sm"
            title="Toggle Native Browser Fullscreen (F11)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Direct Close X Button */}
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="p-2 bg-[#221f2d] hover:bg-rose-950/70 text-white border border-[#3e384e] hover:border-rose-500/70 transition-all cursor-pointer shadow-sm rounded-sm"
            title="Close Window (Return to Plant Map)"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* â”€â”€ Main Viewport: Canvas Office Floor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative flex-1 w-full h-full bg-[#18161d] overflow-hidden">
        <OfficeFloor />

        {/* Pod Location Overlay Legend in Top-Left */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPodLegend((v) => !v)}
              className="px-3 py-1.5 bg-[#121016]/95 backdrop-blur-xl border border-[#342f40] hover:border-primary text-xs font-mono text-[#cfc7d9] hover:text-[#ffffff] transition-all flex items-center gap-2 cursor-pointer shadow-2xl"
            >
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold">Pod Boundaries</span>
              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showPodLegend ? 'rotate-90 text-primary' : ''}`} />
            </button>
          </div>

          {showPodLegend && (
            <div className="flex flex-col gap-2 animate-in fade-in-50 duration-200">
              {Object.values(TEAM_PODS).map((pod) => (
                <div
                  key={pod.id}
                  className="bg-[#121016]/95 backdrop-blur-xl border border-[#342f40] px-3.5 py-2 shadow-2xl text-xs font-mono flex items-center justify-between gap-3 pointer-events-auto cursor-pointer hover:border-primary transition-all"
                  onClick={() => setSelectedPod(pod.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: pod.color }} />
                    <span className="font-bold text-white text-xs">{pod.name}</span>
                  </div>
                  <span className="text-[10px] text-[#cfc7d9] bg-[#1c1924] px-2 py-0.5 border border-[#342f40] font-bold">
                    {pod.project.code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Toast for Flying Envelope */}
        {lastEnvelopeNote && (
          <div className="absolute top-4 right-4 z-30 bg-[#121016]/95 backdrop-blur-xl text-[#ffffff] px-4 py-2.5 text-xs font-mono shadow-2xl border border-[#4ea8de] flex items-center gap-2 animate-bounce">
            <Send className="w-4 h-4 text-[#4ea8de]" />
            <span className="font-bold">{lastEnvelopeNote}</span>
          </div>
        )}

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Floating AI Onboarding & Intern Assistant Chatbot ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        {showAssistantBot && (
          <div className="absolute left-4 bottom-4 w-96 max-h-[540px] h-[500px] bg-[#141218]/95 backdrop-blur-md border-2 border-[#52b788] shadow-2xl z-30 flex flex-col p-4 animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="border-b border-[#2d2838] pb-2.5 mb-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-10 bg-[#18161d] border border-[#52b788] flex items-end justify-center overflow-hidden">
                  <SpritePortrait character="superintendent" scale={1.2} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ffe066] uppercase">
                    PLANT AI ASSISTANT
                  </div>
                  <div className="text-[10px] font-mono text-[#52b788] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#52b788] animate-pulse" />
                    Intern & Staff Mentor
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssistantBot(false)}
                className="p-1 hover:bg-[#282430] text-[#cfc7d9] hover:text-white border border-[#383344] cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setAssistantRole('intern')}
                className={`py-1 text-[10px] font-mono border transition-all cursor-pointer ${
                  assistantRole === 'intern'
                    ? 'bg-[#52b788] text-[#141218] border-[#52b788] font-bold shadow-md'
                    : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430]'
                }`}
              >
                ðŸŽ“ Intern Guide
              </button>
              <button
                type="button"
                onClick={() => setAssistantRole('engineer')}
                className={`py-1 text-[10px] font-mono border transition-all cursor-pointer ${
                  assistantRole === 'engineer'
                    ? 'bg-[#ffe066] text-[#141218] border-[#ffe066] font-bold shadow-md'
                    : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430]'
                }`}
              >
                ðŸ‘· Operator SOP
              </button>
              <button
                type="button"
                onClick={() => setAssistantRole('safety')}
                className={`py-1 text-[10px] font-mono border transition-all cursor-pointer ${
                  assistantRole === 'safety'
                    ? 'bg-[#e57373] text-[#141218] border-[#e57373] font-bold shadow-md'
                    : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430]'
                }`}
              >
                ðŸ›¡ï¸Â Safety Rules
              </button>
            </div>

            {/* Quick Questions Strip */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 scrollbar-thin shrink-0">
              <button
                type="button"
                onClick={() => handleSendAssistant("What is the live status and current work of all employees?")}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#ffe066]/70 text-[10px] font-mono text-[#ffe066] shrink-0 cursor-pointer font-bold"
              >
                ðŸ‘· All Engineers Status
              </button>
              <button
                type="button"
                onClick={() => handleSendAssistant("What is Rajan Sharma working on?")}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#e3b341]/70 text-[10px] font-mono text-[#ffe066] shrink-0 cursor-pointer"
              >
                ðŸŸ¡ Rajan (Ops)
              </button>
              <button
                type="button"
                onClick={() => handleSendAssistant("What is Alex Mercer's current task?")}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#ff7b72]/70 text-[10px] font-mono text-[#ff7b72] shrink-0 cursor-pointer"
              >
                ðŸ”´ Alex (QA)
              </button>
              <button
                type="button"
                onClick={() => handleSendAssistant("What is K. V. Ramanathan's status?")}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#d2a8ff]/70 text-[10px] font-mono text-[#d2a8ff] shrink-0 cursor-pointer"
              >
                ðŸŸ£ K.V. (Controls)
              </button>
              <button
                type="button"
                onClick={() => handleSendAssistant('Explain the Boiler emergency bypass sequence.')}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#383344] text-[10px] font-mono text-white shrink-0 cursor-pointer"
              >
                âš™ï¸ Boiler SOP
              </button>
              <button
                type="button"
                onClick={() => handleSendAssistant('What are the 6.6kV vacuum circuit breaker safety interlocks?')}
                className="px-2.5 py-1 bg-[#1e1c24] hover:bg-[#282430] border border-[#383344] text-[10px] font-mono text-white shrink-0 cursor-pointer"
              >
                âš¡ 6.6kV Interlocks
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-[#18161d] border border-[#2d2838] font-mono text-xs">
              {assistantMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-2.5 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#2b2734] border border-[#ffe066]/70 text-white'
                        : 'bg-[#1e1c24] border border-[#383344] text-[#fdf6e3]'
                    }`}
                  >
                    <div className="text-[9px] text-[#cfc7d9] mb-1 flex items-center justify-between">
                      <span className="font-bold">{msg.sender === 'user' ? 'You' : 'AI Plant Supervisor'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-1 border-t border-[#2d2838] text-[9px] text-[#52b788] font-bold">
                        ðŸ“š Citations: {msg.citations.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAssistantLoading && (
                <div className="flex items-center gap-2 text-xs text-[#52b788] p-2 animate-pulse font-bold">
                  <Bot className="w-4 h-4" />
                  <span>Consulting institutional plant runbooks...</span>
                </div>
              )}
              <div ref={assistantEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAssistant();
              }}
              className="mt-2.5 flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="Ask intern or plant question..."
                disabled={isAssistantLoading}
                className="flex-1 bg-[#18161d] border border-[#383344] text-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#52b788]"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim() || isAssistantLoading}
                className="p-2 bg-[#52b788] hover:bg-[#74c69d] disabled:opacity-40 text-[#141218] font-bold border border-[#52b788] transition-all cursor-pointer shadow-md"
                title="Send Inquiry"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Side Roster / Full Employee Dossier & AI Chat Drawer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        {showRoster && (
          <div className="absolute right-4 bottom-4 top-4 w-[420px] bg-[#141218]/95 backdrop-blur-md border border-[#383344] shadow-2xl z-20 flex flex-col p-4 overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Top Bar of Drawer */}
            <div className="border-b border-[#2d2838] pb-3 mb-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#ffe066] uppercase tracking-wider">
                  {selectedAgent ? 'Employee Dossier & Desk Terminal' : `Pod Personnel (${CANONICAL_OFFICE_AGENTS.length} Engineers)`}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono bg-[#16382b] text-[#52b788] px-2 py-0.5 border border-[#52b788] font-bold">
                    LIVE
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRoster(false)}
                    className="p-1 hover:bg-[#282430] text-[#cfc7d9] hover:text-white border border-[#383344] ml-1 cursor-pointer"
                    title="Close Inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roster Strip / Mini Avatars with Full Readable Names */}
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1.5 scrollbar-thin">
                {displayedAgents.map((a) => {
                  const isSel = selectedAgent?.id === a.id;
                  const pod = TEAM_PODS[(a as any).podId || 'operations'];
                  const firstName = a.name.split(' ')[0];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgent(a);
                        setActiveTab('dossier');
                      }}
                      className={`relative p-1.5 border flex flex-col items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#ffe066] bg-[#2b2734] ring-1 ring-[#ffe066] shadow-md'
                          : 'border-[#383344] bg-[#1e1c24] hover:bg-[#282430]'
                      }`}
                      title={`${a.name} â€”Â ${pod?.name || 'Operations'}`}
                    >
                      <div className="w-8 h-10 overflow-hidden flex items-end justify-center bg-[#18161d]/80 border border-[#2d2838]">
                        <SpritePortrait character={(a as any).character || 'dcs_lead'} scale={1.1} />
                      </div>
                      <span className="text-[10px] font-mono text-[#fdf6e3] max-w-[50px] truncate text-center font-bold">
                        {firstName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Agent Selected: Show Tab Navigation (Dossier | Stages | AI Chat) */}
            {selectedAgent && activePodInfo ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Tab switcher */}
                <div className="grid grid-cols-3 gap-1.5 mb-3 border-b border-[#2d2838] pb-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dossier')}
                    className={`py-1.5 text-xs font-mono flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      activeTab === 'dossier'
                        ? 'bg-[#ffe066] text-[#141218] border-[#ffe066] font-bold shadow-md'
                        : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430] hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stages')}
                    className={`py-1.5 text-xs font-mono flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      activeTab === 'stages'
                        ? 'bg-[#ffe066] text-[#141218] border-[#ffe066] font-bold shadow-md'
                        : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430] hover:text-white'
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Stages</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`py-1.5 text-xs font-mono flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-[#ffe066] text-[#141218] border-[#ffe066] font-bold shadow-md'
                        : 'bg-[#1e1c24] text-[#cfc7d9] border-[#383344] hover:bg-[#282430] hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>AI Chat</span>
                  </button>
                </div>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ TAB 1: EMPLOYEE DOSSIER & PHOTO ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                {activeTab === 'dossier' && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
                    {/* Header with Pixel Bust Photo */}
                    <div className="p-3.5 bg-[#1e1c24] border border-[#383344] flex items-center gap-3.5">
                      <div className="w-16 h-20 bg-[#18161d] border-2 border-[#ffe066]/70 flex items-end justify-center overflow-hidden shadow-md shrink-0">
                        <SpritePortrait character={(selectedAgent as any).character || 'dcs_lead'} scale={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">{selectedAgent.name}</div>
                        <div className="text-xs text-[#ffe066] mt-0.5 font-bold">{selectedAgent.description}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 bg-[#16382b] text-[#52b788] border border-[#52b788] font-bold">
                            {(selectedAgent as any).status || 'working'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-[#6e1e24] text-white border border-[#e57373] flex items-center gap-1 font-bold">
                            <Lock className="w-3 h-3 text-[#e57373]" />
                            {activePodInfo.project.confidentiality}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personnel Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-[#1e1c24] border border-[#383344]">
                        <span className="text-[#cfc7d9] text-[10px] block">Department Pod:</span>
                        <strong className="text-white text-xs">{activePodInfo.name}</strong>
                      </div>
                      <div className="p-2.5 bg-[#1e1c24] border border-[#383344]">
                        <span className="text-[#cfc7d9] text-[10px] block">Preserved Artifacts:</span>
                        <strong className="text-[#52b788] text-xs">{(selectedAgent as any).preservedDocs || 38} Documents</strong>
                      </div>
                      <div className="p-2.5 bg-[#1e1c24] border border-[#383344]">
                        <span className="text-[#cfc7d9] text-[10px] block">Retirement Horizon:</span>
                        <strong className="text-[#ffe066] text-xs">{(selectedAgent as any).retirementYears || 2} Years</strong>
                      </div>
                      <div className="p-2.5 bg-[#1e1c24] border border-[#383344]">
                        <span className="text-[#cfc7d9] text-[10px] block">Continuity Score:</span>
                        <strong className="text-[#4ea8de] text-xs">96.4% Verified</strong>
                      </div>
                    </div>

                    {/* Assigned Project Box */}
                    <div className="p-3 bg-[#1e1c24] border border-[#383344] space-y-2">
                      <div className="text-[10px] uppercase font-bold text-[#ffe066]">
                        ðŸ“ŒÂ Active Project: {activePodInfo.project.code}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {activePodInfo.project.title}
                      </div>
                      <div className="text-[11px] text-[#cfc7d9] leading-relaxed">
                        {activePodInfo.project.description}
                      </div>
                    </div>

                    {/* Cross-Pod Briefing Dispatch */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-[#cfc7d9] uppercase font-bold">Cross-Pod Briefing Dispatch:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(TEAM_PODS)
                          .filter((p) => p.id !== activePodInfo.id)
                          .map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => triggerCrossPodEnvelope(target.id)}
                              className="p-2 text-xs font-mono border border-[#383344] bg-[#1e1c24] hover:bg-[#282430] hover:border-[#ffe066] text-[#cfc7d9] hover:text-white transition-all text-left truncate flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5 text-[#4ea8de] shrink-0" />
                              <span className="truncate font-bold">Brief {target.badge}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ TAB 2: PROJECT STAGES ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                {activeTab === 'stages' && (
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs">
                    <div className="text-xs font-bold text-white uppercase flex items-center justify-between border-b border-[#2d2838] pb-1.5">
                      <span>{activePodInfo.project.title}</span>
                      <span className="text-[#ffe066]">{activePodInfo.project.progress}%</span>
                    </div>

                    <div className="space-y-2">
                      {activePodInfo.project.stages.map((st) => (
                        <div
                          key={st.id}
                          className={`p-2.5 border ${
                            st.status === 'completed'
                              ? 'bg-[#16382b]/50 border-[#52b788] text-white'
                              : st.status === 'in_progress'
                              ? 'bg-[#ffe066]/10 border-[#ffe066] text-white'
                              : 'bg-[#1e1c24] border-[#383344] text-[#cfc7d9]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">Stage {st.id}: {st.name}</span>
                            <span className="text-[10px] uppercase font-bold">
                              {st.status === 'completed' ? 'âœ“ DONE' : st.status === 'in_progress' ? 'âš¡ ACTIVE' : 'PENDING'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#cfc7d9] leading-snug">{st.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ TAB 3: AI CHAT DESK TERMINAL ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col min-h-0 font-mono text-xs">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-[#18161d] border border-[#2d2838]">
                      {currentChat.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#cfc7d9] space-y-2">
                          <MessageSquare className="w-6 h-6 mx-auto text-[#ffe066]" />
                          <p>Ask <strong>{selectedAgent.name}</strong> about calibration, OISD compliance, or procedural updates.</p>
                        </div>
                      ) : (
                        currentChat.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[88%] p-2.5 text-xs leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'bg-[#2b2734] border border-[#ffe066]/70 text-white'
                                  : 'bg-[#1e1c24] border border-[#383344] text-[#fdf6e3]'
                              }`}
                            >
                              <div className="text-[9px] text-[#cfc7d9] mb-1 flex items-center justify-between">
                                <span className="font-bold">{msg.sender === 'user' ? 'You' : selectedAgent.name}</span>
                                <span>{msg.timestamp}</span>
                              </div>
                              <div className="whitespace-pre-wrap">{msg.text}</div>
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-2 pt-1 border-t border-[#2d2838] text-[9px] text-[#4ea8de] font-bold">
                                  ðŸ“š Citations: {msg.citations.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex items-center gap-2 text-xs text-[#ffe066] p-2 animate-pulse font-bold">
                          <Bot className="w-4 h-4" />
                          <span>{selectedAgent.name} is consulting continuity vault...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChat();
                      }}
                      className="mt-2.5 flex items-center gap-1.5 shrink-0"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={`Message ${selectedAgent.name.split(' ')[0]}...`}
                        disabled={isChatLoading}
                        className="flex-1 bg-[#18161d] border border-[#383344] text-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#ffe066]"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatLoading}
                        className="p-2 bg-[#ffe066] hover:bg-[#fff099] disabled:opacity-40 text-[#141218] font-bold border border-[#ffe066] transition-all cursor-pointer shadow-md"
                        title="Send Message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              /* No agent selected fallback list */
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#cfc7d9]" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search engineers or SOPs..."
                    className="w-full bg-[#1e1c24] border border-[#383344] text-white pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#ffe066]"
                  />
                </div>

                <div className="text-xs text-[#cfc7d9] mb-1 font-mono">
                  Select an engineer to view photo, project stages & AI chat:
                </div>

                {filteredAgents.map((agent) => {
                  const pod = TEAM_PODS[(agent as any).podId || 'operations'];
                  return (
                    <div
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setActiveTab('dossier');
                      }}
                      className="p-2.5 border border-[#383344] bg-[#1e1c24] hover:bg-[#282430] hover:border-[#ffe066] cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-10 bg-[#18161d] overflow-hidden flex items-end justify-center border border-[#383344] group-hover:border-[#ffe066]">
                          <SpritePortrait character={(agent as any).character || 'dcs_lead'} scale={1.1} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-[#ffe066] transition-colors">
                            {agent.name}
                          </div>
                          <div className="text-[10px] text-[#cfc7d9]">{agent.description}</div>
                          <div className="text-[9px] text-[#ffe066] mt-0.5 font-bold">{pod?.name || 'Operations'}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#cfc7d9] group-hover:text-[#ffe066] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

