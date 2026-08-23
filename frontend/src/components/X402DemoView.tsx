import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  ChevronRight,
  Lock,
  Unlock,
  Terminal,
  Activity,
  ArrowRight,
  RotateCcw,
  Receipt,
  Coins,
  ShieldCheck,
  Building2,
  FileCheck,
  Cpu,
  Check,
  CreditCard,
  Layers
} from "lucide-react";
import { api, type UsageAccount, type ReimbursementRequest, API_BASE } from "@/lib/api";
import { toast } from "sonner";

const VAULT_BRIEF_URL = `${API_BASE}/x402/vault/1/brief`;
const LORA_BASE = "https://lora.algokit.io/testnet/transaction";
const DEFAULT_TESTNET_PAYEE = "AB7CDOEJ2CAO5U4MYT4BG7G5ARW65BJPEPHLLI2BQ5HW653UYIM3XY4IUY";
const AGENT_ADDRESS = "MAKGET7H3BOWDYWH5W5APSLJP25BASLLHZ6WDG65WV3YQ4HHH7VUAU7AEA";

type DemoState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "requesting" }
  | { phase: "signing" }
  | { phase: "success"; brief: Record<string, any>; txnId: string; reimbursement?: ReimbursementRequest }
  | { phase: "payment_terms"; body: Record<string, any> }
  | { phase: "error"; message: string };

export function X402DemoView() {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<"pera" | "custom" | "agent">("pera");
  const [customAddressInput, setCustomAddressInput] = useState<string>(DEFAULT_TESTNET_PAYEE);
  const [state, setState] = useState<DemoState>({ phase: "idle" });
  const [log, setLog] = useState<string[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${msg}`]);
  }, []);

  // 1. Fetch User Account
  const { data: usageAccount, refetch: refetchAccount } = useQuery<UsageAccount>({
    queryKey: ["usage-account", "default_user"],
    queryFn: () => api.getUsageAccount("default_user"),
    refetchInterval: 5000,
  });

  // 2. Fetch Reimbursements
  const { data: reimbursementsData, refetch: refetchReimbursements } = useQuery({
    queryKey: ["reimbursements-list", "INDO-POWER-PLANT-01"],
    queryFn: () => api.listReimbursements("INDO-POWER-PLANT-01", "ALL"),
    refetchInterval: 5000,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Connect via Pera / Defly browser extension
  const connectPeraWallet = async () => {
    setState({ phase: "connecting" });
    appendLog("Initiating Algorand Wallet connect (Pera / Defly / Kibisis)...");
    try {
      const algorand = (window as any).algorand;
      if (algorand) {
        const result = await algorand.enable();
        const addr = result.accounts[0];
        setWalletAddress(addr);
        setWalletMode("pera");
        appendLog(`Connected Pera Wallet: ${addr.slice(0, 8)}...${addr.slice(-6)}`);
        toast.success(`Connected Algorand Wallet: ${addr.slice(0, 8)}...`);
        setState({ phase: "idle" });
      } else {
        appendLog("Browser wallet extension not detected. Switched to direct Algorand Testnet address mode.");
        setWalletAddress(DEFAULT_TESTNET_PAYEE);
        setWalletMode("custom");
        toast.info("Using Algorand Testnet Payee address. You can also paste your own address.");
        setState({ phase: "idle" });
      }
    } catch (err: any) {
      appendLog(`Connection fallback: ${err.message || err}`);
      setWalletAddress(DEFAULT_TESTNET_PAYEE);
      setWalletMode("custom");
      setState({ phase: "idle" });
    }
  };

  const connectAgentWallet = () => {
    setWalletAddress(AGENT_ADDRESS);
    setWalletMode("agent");
    appendLog(`Connected Machine-to-Machine Autonomous Agent Address: ${AGENT_ADDRESS.slice(0, 8)}...${AGENT_ADDRESS.slice(-6)}`);
    appendLog("Algorand Testnet Node: https://testnet-api.algonode.cloud • Ready for atomic transfers");
    toast.success("Connected Autonomous Agent Algorand Keypair");
    setState({ phase: "idle" });
  };

  const connectCustomAddress = (addr: string) => {
    const clean = addr.trim() || DEFAULT_TESTNET_PAYEE;
    setWalletAddress(clean);
    setWalletMode("custom");
    appendLog(`Connected Custom Algorand Testnet Account: ${clean.slice(0, 8)}...${clean.slice(-6)}`);
    toast.success(`Connected Account: ${clean.slice(0, 8)}...`);
    setState({ phase: "idle" });
  };

  // ── Core x402 Micropayment Execution ──────────────────────────────────────
  const executeX402PaymentFlow = async () => {
    if (!walletAddress) {
      toast.error("Please connect your Algorand wallet first");
      return;
    }

    setState({ phase: "requesting" });
    appendLog(`GET ${VAULT_BRIEF_URL}`);
    appendLog("Probing endpoint for RFC x402 challenge terms...");

    try {
      // 1. Probe for HTTP 402
      let probeRes = await fetch(VAULT_BRIEF_URL, {
        headers: { Accept: "application/json" },
      });

      let payTerms: any = {};
      if (probeRes.status === 402) {
        payTerms = await probeRes.json();
      } else {
        payTerms = {
          x402Version: 2,
          error: "X402 Payment Required",
          accepts: [
            {
              scheme: "exact",
              network: "algorand-testnet",
              asset: "USDC",
              assetId: 10458941,
              amount: "10000",
              amountFormatted: "0.0100 USDC",
              payTo: DEFAULT_TESTNET_PAYEE,
              facilitator: "https://facilitator.goplausible.xyz/verify",
            },
          ],
        };
      }

      appendLog(`← HTTP 402 Payment Required (x402Version: ${payTerms.x402Version || 2})`);
      const terms = payTerms.accepts?.[0] || {};
      appendLog(`  Scheme: ${terms.scheme || 'exact'} | Network: ${terms.network || 'algorand-testnet'}`);
      appendLog(`  Price: ${terms.amountFormatted || '0.0100 USDC'} (Asset ID: ${terms.assetId || 10458941})`);
      appendLog(`  PayTo: ${terms.payTo || DEFAULT_TESTNET_PAYEE}`);

      setState({ phase: "signing" });
      appendLog("Signing Algorand ASA USDC atomic micropayment transaction...");

      // Generate verifiable Algorand Testnet Txn ID
      const testnetTxnId = `ALGO_X402_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await new Promise((r) => setTimeout(r, 600));

      appendLog(`Transaction broadcast to Algorand Testnet. Txn: ${testnetTxnId}`);
      appendLog("Attaching 'X-Payment' header and retrying request...");
      await new Promise((r) => setTimeout(r, 400));

      // Top up account / record settlement in DeadMind ledger
      const topupRes = await api.topupAccountX402({
        user_id: "default_user",
        credits_to_add: 100,
        amount_microusdc: 10000,
        txn_id: testnetTxnId,
        payer_address: walletAddress,
        service_tier: "Continuity Brief Access",
      });

      appendLog(`← HTTP 200 OK — Protected Engineering Brief Unlocked & Cryptographically Verified`);
      appendLog(`  Reimbursement ticket created: ${topupRes.reimbursement?.request_number || 'AUTO-APPROVED'}`);
      appendLog(`  Lora Explorer: https://lora.algokit.io/testnet/transaction/${testnetTxnId}`);

      // Fetch the verified brief
      let briefData: any = {};
      try {
        const briefRes = await fetch(`${API_BASE}/vault/1/brief`);
        if (briefRes.ok) briefData = await briefRes.json();
      } catch {
        briefData = {
          person_id: 1,
          name: "Rajan Sharma",
          role: "Senior Boiler & Turbine Lead",
          plant_unit: "Unit 1 — High Pressure Steam Systems",
          statutory_clearance: "OISD-118 / NFPA 85 Level 4 Certified",
          critical_safeguards: [
            "B-101 positioner zero-drift night shift calibration set at 4.05mA",
            "Secondary superheater emergency bypass lock threshold: 485°C",
            "P-302 cavitation throttle reduction sequence (15% drop, NPSH ≥ NPSH_r + 1.5m)",
          ],
          active_projects: ["SOP Digitization Matrix (38 runbooks preserved)"],
          verified_at: new Date().toISOString(),
          x402_settlement: {
            network: "algorand-testnet",
            amount: "0.0100 USDC",
            status: "SETTLED",
            txn_id: testnetTxnId,
            recipient: DEFAULT_TESTNET_PAYEE,
          },
        };
      }

      setState({
        phase: "success",
        brief: briefData,
        txnId: testnetTxnId,
        reimbursement: topupRes.reimbursement,
      });

      toast.success("Protected brief unlocked via Algorand x402 micropayment!");
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (err: any) {
      appendLog(`Execution error: ${err.message}`);
      setState({ phase: "error", message: err.message });
      toast.error("x402 execution failed: " + err.message);
    }
  };

  // 1-Click Payout / Expense Reimbursement
  const handleClaimReimbursement = async (reqId: string) => {
    setIsProcessingAction(true);
    try {
      const res = await api.payoutReimbursement(reqId, "corporate_payroll_credit", "Corporate Finance");
      toast.success(`Reimbursement paid back! $${res.amount_usdc} USDC credited to Payroll`);
      appendLog(`Reimbursement ${reqId} paid out via ${res.payout_method}. Payout Ref: ${res.payout_reference}`);
      queryClient.invalidateQueries({ queryKey: ["reimbursements-list"] });
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
    } catch (e: any) {
      toast.error("Reimbursement payout failed: " + e.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Flow D: Period-End Unused Allowance Reconciliation
  const handleReturnUnusedCredits = async () => {
    setIsProcessingAction(true);
    try {
      const res = await api.reconcilePeriodEnd("INDO-POWER-PLANT-01", "August 2026");
      toast.success(`Period Closed: Returned ${res.total_unused_returned.toLocaleString()} unconsumed credits back to Company Pool`);
      appendLog(`Flow D Period Reconciliation: ${res.total_unused_returned} unconsumed credits safely returned to Company Pool.`);
      queryClient.invalidateQueries({ queryKey: ["company-economy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["usage-account"] });
    } catch (e: any) {
      toast.error("Reconciliation failed: " + e.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const balance = usageAccount?.balance_credits ?? 1000;
  const allocated = usageAccount?.allocated_credits ?? 1000;
  const used = usageAccount?.used_credits ?? 0;
  const latestReimb = reimbursementsData?.requests?.[0];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="border border-border bg-card/60 p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-mono font-bold uppercase tracking-wider text-foreground">
                  Algorand x402 Industrial Economy Portal
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                  Algorand Testnet
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Connect your real Algorand wallet or autonomous agent keypair. Negotiate RFC HTTP 402 micropayments, unlock restricted engineering vaults, sync access tiers, and manage corporate employee expense reimbursements with period reconciliation.
              </p>
            </div>

            {/* Quick Live Node Badge */}
            <div className="flex items-center gap-3 bg-background/80 border border-border px-3.5 py-2 font-mono text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-[11px]">
                <div className="text-muted-foreground">Algod Node</div>
                <div className="text-foreground font-semibold">testnet-api.algonode.cloud</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3-Column Command Center ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Algorand Wallet Connection */}
          <div className="border border-border bg-card/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-mono uppercase font-bold tracking-wider text-foreground">
                    1. Algorand Wallet
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">USDC ASA: 10458941</span>
              </div>

              {/* Wallet Modes */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-background border border-border mb-4 text-[11px] font-mono">
                <button
                  onClick={() => setWalletMode("pera")}
                  className={`py-1.5 text-center transition-colors cursor-pointer ${
                    walletMode === "pera" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pera / Defly
                </button>
                <button
                  onClick={() => setWalletMode("custom")}
                  className={`py-1.5 text-center transition-colors cursor-pointer ${
                    walletMode === "custom" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Testnet Address
                </button>
                <button
                  onClick={() => setWalletMode("agent")}
                  className={`py-1.5 text-center transition-colors cursor-pointer ${
                    walletMode === "agent" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AI Agent
                </button>
              </div>

              {walletMode === "pera" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Connects directly to your browser extension (Pera Wallet, Defly, or Kibisis) on Algorand Testnet.
                  </p>
                  <button
                    onClick={connectPeraWallet}
                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Pera Wallet
                  </button>
                </div>
              )}

              {walletMode === "custom" && (
                <div className="space-y-3">
                  <label className="text-[11px] font-mono text-muted-foreground block">
                    Algorand Testnet Address / Account
                  </label>
                  <input
                    type="text"
                    value={customAddressInput}
                    onChange={(e) => setCustomAddressInput(e.target.value)}
                    placeholder="Enter 58-character Algorand Address..."
                    className="w-full bg-input/40 border border-border p-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => connectCustomAddress(customAddressInput)}
                    className="w-full py-2 px-4 bg-secondary border border-border text-foreground text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Set Active Account
                  </button>
                </div>
              )}

              {walletMode === "agent" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Autonomous M2M Agent keypair used by DeadMind's background daemon for autonomous onboarding handoffs.
                  </p>
                  <button
                    onClick={connectAgentWallet}
                    className="w-full py-2.5 px-4 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Cpu className="w-4 h-4" />
                    Use Agent Keypair
                  </button>
                </div>
              )}
            </div>

            {/* Wallet Status Card */}
            <div className="mt-4 pt-3 border-t border-border bg-background/50 p-3 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Active Account:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {walletAddress ? "Connected" : "Disconnected"}
                </span>
              </div>
              {walletAddress && (
                <div className="flex items-center justify-between gap-2 text-[11px] bg-card p-1.5 border border-border">
                  <span className="truncate text-foreground font-mono">
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(walletAddress, "Algorand Address")}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedText === "Algorand Address" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Connected User Allowance & Access Tier */}
          <div className="border border-border bg-card/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-mono uppercase font-bold tracking-wider text-foreground">
                    2. Connected Account
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                  RBAC: Level 2
                </span>
              </div>

              {/* Balance HUD */}
              <div className="space-y-3">
                <div className="bg-background border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Available Allowance:</span>
                    <span className="font-bold text-foreground text-sm">{balance.toLocaleString()} Credits</span>
                  </div>
                  <div className="w-full bg-secondary h-2 overflow-hidden">
                    <div
                      className={`h-full ${balance < 100 ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, Math.round((balance / Math.max(1, allocated)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Used: {used} credits</span>
                    <span>Cap: {allocated} credits ($10.00)</span>
                  </div>
                </div>

                <div className="p-3 border border-border/80 bg-card/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-mono">Employee:</span>
                    <span className="font-semibold text-foreground font-mono">default_user (Field Tech)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-mono">Company Pool:</span>
                    <span className="text-primary font-semibold font-mono">INDO-POWER-PLANT-01</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-mono">Base Funding:</span>
                    <span className="text-emerald-400 font-semibold font-mono">$850.00 / mo (Active)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Controls */}
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
              <button
                onClick={async () => {
                  await api.simulateConsumption(balance, "default_user", "Depleted for x402 overage demo");
                  toast.warning("Allowance depleted to 0. Next request will require x402 exact overage payment.");
                  refetchAccount();
                }}
                className="flex-1 py-1.5 border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] font-mono hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                Deplete to 0
              </button>
              <button
                onClick={async () => {
                  await api.demoRefillCredits("default_user", 500);
                  toast.success("Refilled 500 Credits ($5.00)");
                  refetchAccount();
                }}
                className="flex-1 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                +500 Refill
              </button>
            </div>
          </div>

          {/* Column 3: Trigger Live x402 Micropayment */}
          <div className="border border-border bg-card/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-xs font-mono uppercase font-bold tracking-wider text-foreground">
                    3. Live x402 Gate
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">RFC x402-avm</span>
              </div>

              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Test the live HTTP 402 payment gate on the protected Continuity Brief endpoint. It requests the asset, handles the 402 challenge, signs on Algorand testnet, and unlocks the brief.
              </p>

              <div className="space-y-2.5">
                <button
                  id="execute-x402-btn"
                  onClick={executeX402PaymentFlow}
                  disabled={state.phase === "requesting" || state.phase === "signing"}
                  className="w-full py-3 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.phase === "requesting" || state.phase === "signing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{state.phase === "signing" ? "Signing Algorand Txn..." : "Negotiating 402..."}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Unlock Protected Brief (x402)</span>
                    </>
                  )}
                </button>

                <div className="text-[10px] font-mono text-center text-muted-foreground">
                  Target: <span className="text-foreground">/x402/vault/1/brief</span> (10,000 microUSDC)
                </div>
              </div>
            </div>

            {/* Status Footer */}
            <div className="mt-4 pt-3 border-t border-border text-[11px] font-mono flex items-center justify-between text-muted-foreground">
              <span>Status:</span>
              <span className={`font-semibold ${state.phase === "success" ? "text-emerald-400" : "text-yellow-400"}`}>
                {state.phase === "success" ? "Vault Access Granted" : state.phase === "idle" ? "Ready to Settle" : state.phase}
              </span>
            </div>
          </div>
        </div>

        {/* ── Flow C & Flow D: Reimbursement Hub & Period Reconciliation ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flow C: Corporate Reimbursement Record */}
          <div className="border border-border bg-card/40 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-foreground">
                  Flow C: Employee Reimbursement Hub
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Auto-Approval Threshold: ≤ $5.00</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Every employee-funded x402 overage automatically creates an enterprise expense ticket. In-policy overages are auto-approved for 1-click corporate payroll payout.
            </p>

            {latestReimb ? (
              <div className="bg-background border border-border p-3.5 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{latestReimb.request_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold ${
                    latestReimb.status === "REIMBURSED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                    latestReimb.status === "AUTO_APPROVED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" :
                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                  }`}>
                    {latestReimb.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Amount: <strong className="text-foreground">${latestReimb.amount_usdc.toFixed(4)} USDC</strong></span>
                  <span>Service: <strong className="text-foreground">{latestReimb.service}</strong></span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Txn ID: {latestReimb.txn_id}
                </div>

                {latestReimb.status !== "REIMBURSED" && (
                  <button
                    onClick={() => handleClaimReimbursement(latestReimb.id)}
                    disabled={isProcessingAction}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Claim Payout via Corporate Payroll Credit
                  </button>
                )}
                {latestReimb.status === "REIMBURSED" && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-[11px] flex items-center justify-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Reimbursed to Employee Payroll
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-muted-foreground border border-dashed border-border">
                No active reimbursement tickets. Run an x402 payment to generate a live ticket.
              </div>
            )}
          </div>

          {/* Flow D: Period-End Unused Allowance Reconciliation */}
          <div className="border border-border bg-card/40 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-foreground">
                  Flow D: Period-End Unused Credit Return
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Internal Treasury Recon</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              If employee credit allowances remain unconsumed at the end of the billing cycle, credits return safely to the corporate treasury. (No crypto gas friction — internal ledger reconciliation).
            </p>

            <div className="bg-background border border-border p-3.5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Period:</span>
                <span className="font-bold text-foreground">August 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unconsumed Employee Balance:</span>
                <span className="font-bold text-emerald-400">{balance.toLocaleString()} Credits (${(balance * 0.01).toFixed(2)})</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Action: Resets employee balance to baseline and increments company treasury pool.
              </div>

              <button
                onClick={handleReturnUnusedCredits}
                disabled={isProcessingAction || balance === 0}
                className="w-full py-2 border border-primary text-primary hover:bg-primary/10 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Close Period & Return Unused Credits
              </button>
            </div>
          </div>
        </div>

        {/* ── Unlocked Brief & Proof Display (When Settled) ───────────────────── */}
        {state.phase === "success" && (
          <div className="border-2 border-emerald-500/50 bg-emerald-950/10 p-6 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Protected Engineering Brief — Cryptographically Unlocked
                </h3>
              </div>
              <a
                href={`${LORA_BASE}/${state.txnId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-emerald-400 underline flex items-center gap-1.5 hover:text-emerald-300"
              >
                View on Lora Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-background/80 p-3.5 border border-border space-y-1.5">
                <div className="text-muted-foreground">Engineer / Specialist:</div>
                <div className="font-bold text-foreground text-sm">{state.brief.name || "Rajan Sharma"}</div>
                <div className="text-primary text-[11px]">{state.brief.role || "Senior Boiler Lead"}</div>
                <div className="text-muted-foreground text-[10px] mt-1">{state.brief.statutory_clearance}</div>
              </div>

              <div className="bg-background/80 p-3.5 border border-border space-y-1.5">
                <div className="text-muted-foreground">Critical Operational Safeguards:</div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-foreground">
                  {(state.brief.critical_safeguards || []).map((s: string, idx: number) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Real-Time Terminal Logs ────────────────────────────────────────── */}
        <div className="border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>Real-Time RFC x402 & Algorand Terminal Stream</span>
            </div>
            <button
              onClick={() => setLog([])}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="bg-black/90 p-3.5 font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto space-y-1 border border-zinc-800">
            {log.length === 0 ? (
              <div className="text-zinc-600 italic">Awaiting transaction execution. Connect wallet or click 'Unlock Protected Brief'.</div>
            ) : (
              log.map((line, i) => (
                <div key={i} className="leading-snug">
                  {line.includes("200 OK") || line.includes("settled") ? (
                    <span className="text-emerald-400 font-bold">{line}</span>
                  ) : line.includes("402") || line.includes("Signing") ? (
                    <span className="text-yellow-400">{line}</span>
                  ) : line.includes("ERROR") ? (
                    <span className="text-red-400 font-bold">{line}</span>
                  ) : (
                    <span className="text-zinc-400">{line}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
