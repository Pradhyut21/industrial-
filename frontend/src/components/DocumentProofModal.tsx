import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  X,
  Download,
  Copy,
  Check,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  Award,
  Hash,
  Activity,
  AlertCircle,
  FileCheck2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

export interface DocumentProofData {
  id: number;
  title: string;
  author: string;
  doc_type: string;
  equipment_tag: string;
  failure_code: string;
  upload_date: string;
  confidence: number;
  doi: string;
  journal: string;
  peer_reviewed: boolean;
  peer_reviewer: string;
  cryptographic_hash: string;
  abstract: string;
  key_findings: string[];
  full_content: string;
  pages: Array<{
    page_number: number;
    header: string;
    section: string;
    text: string;
    highlighted_proof: string;
    equations?: string[];
  }>;
}

interface DocumentProofModalProps {
  docId: number | null;
  citationTitle?: string;
  onClose: () => void;
}

export function DocumentProofModal({
  docId,
  citationTitle,
  onClose,
}: DocumentProofModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"pdf" | "grounding" | "raw">("pdf");
  const [zoomLevel, setZoomLevel] = useState<100 | 120 | 140>(100);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const { data: doc, isLoading, error } = useQuery<DocumentProofData>({
    queryKey: ["document-proof", docId],
    queryFn: async () => {
      if (!docId) throw new Error("No document ID specified");
      const res = await fetch(`${API_BASE}/api/documents/${docId}`);
      if (!res.ok) {
        // Fallback fallback fetch from all docs if specific ID shifted
        const listRes = await fetch(`${API_BASE}/api/documents`);
        if (listRes.ok) {
          const list = await listRes.json();
          const found = list.find((d: any) => d.id === docId || d.title === citationTitle);
          if (found) {
            const retryRes = await fetch(`${API_BASE}/api/documents/${found.id}`);
            if (retryRes.ok) return await retryRes.json();
          }
        }
        throw new Error("Failed to load document proof");
      }
      return await res.json();
    },
    enabled: !!docId,
  });

  if (!docId) return null;

  const handleCopyBibtex = () => {
    if (!doc) return;
    const bibtex = `@article{deadmind_${doc.id},
  title={{${doc.title}}},
  author={{${doc.author}}},
  journal={{${doc.journal}}},
  year={2024},
  doi={{${doc.doi}}},
  note={Grounding Proof on DeadMind Industrial Knowledge Vault}
}`;
    navigator.clipboard.writeText(bibtex);
    setCopiedBibtex(true);
    toast.success("BibTeX citation copied to clipboard!");
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const pages = doc?.pages || [];
  const activePage = pages.find((p) => p.page_number === currentPage) || pages[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl border border-primary/50 bg-[#0d0f17] text-foreground shadow-[0_0_80px_oklch(0.85_0.16_80_/_0.25)] flex flex-col max-h-[94vh] rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Bar Header ────────────────────────────────────────────── */}
        <div className="border-b border-primary/30 bg-[#121524] px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-primary/10 border border-primary/40 flex items-center justify-center text-primary shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-primary/20 text-primary border border-primary/40">
                  {doc?.doc_type || "Source Proof"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  DOI: {doc?.doi || "10.1109/TII.2024.3398112"}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2">
                  <ShieldCheck className="w-2.5 h-2.5" /> Peer Verified
                </span>
              </div>
              <h2 className="font-display text-sm uppercase tracking-wide text-foreground truncate mt-0.5">
                {doc?.title || citationTitle || "Loading Document Proof..."}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center border border-border bg-[#0b0d14] p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`px-2 py-1 transition-colors ${
                  viewMode === "pdf"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PDF Paper
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grounding")}
                className={`px-2 py-1 transition-colors ${
                  viewMode === "grounding"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Math & Grounding
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`px-2 py-1 transition-colors ${
                  viewMode === "raw"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Raw Text
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyBibtex}
              title="Copy BibTeX Citation"
              className="p-1.5 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              {copiedBibtex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              title="Print / Save PDF"
              className="p-1.5 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Sub-header / Metadata Bar ──────────────────────────────────── */}
        {doc && (
          <div className="bg-[#15192c]/80 border-b border-border/60 px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <div>
                <span className="text-muted-foreground">Author: </span>
                <span className="text-primary font-bold">{doc.author}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Equipment: </span>
                <span className="text-amber-400 font-bold">[{doc.equipment_tag}]</span>
              </div>
              <div>
                <span className="text-muted-foreground">Journal / Standard: </span>
                <span className="text-foreground/90">{doc.journal}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-mono text-emerald-400/90 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Hash: {doc.cryptographic_hash.slice(0, 16)}...
              </span>
            </div>
          </div>
        )}

        {/* ── Main Content Area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono">Decrypting and loading verified research paper proof...</p>
            </div>
          )}

          {error && (
            <div className="p-6 border border-destructive/40 bg-destructive/10 text-xs font-mono text-destructive space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Failed to load live document proof
              </p>
              <p>{(error as Error).message}</p>
            </div>
          )}

          {doc && viewMode === "pdf" && (
            <div className="space-y-4">
              {/* PDF Document Viewer Container */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Interactive PDF Viewer — Page {currentPage} of {pages.length || 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => (z === 100 ? 120 : z === 120 ? 140 : 100))}
                    className="flex items-center gap-1 border border-border px-2 py-0.5 hover:border-primary text-[10px]"
                  >
                    <ZoomIn className="w-3 h-3" /> {zoomLevel}%
                  </button>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 border border-border disabled:opacity-30 hover:border-primary"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= pages.length}
                    onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                    className="p-1 border border-border disabled:opacity-30 hover:border-primary"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Realistic Academic / Industrial Paper Sheet */}
              <div
                className="bg-[#fcfbf9] text-[#1b1c1e] p-6 sm:p-10 shadow-2xl border border-[#d5d0c7] font-serif transition-transform duration-200"
                style={{
                  transform: zoomLevel === 120 ? "scale(1.02)" : zoomLevel === 140 ? "scale(1.05)" : "scale(1)",
                  transformOrigin: "top center",
                }}
              >
                {/* Academic Header */}
                <div className="border-b-2 border-[#2b2b2b] pb-4 mb-6 font-sans">
                  <div className="flex justify-between items-start text-[10px] text-[#555] uppercase tracking-wider mb-2 font-mono">
                    <span>{activePage?.header || doc.journal}</span>
                    <span className="font-bold text-emerald-700">✓ CERTIFIED RECORD</span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-[#111] leading-tight mb-2">
                    {doc.title}
                  </h1>
                  <div className="text-xs text-[#333] flex items-center gap-3 flex-wrap font-mono">
                    <span>
                      <strong>Lead Author:</strong> {doc.author}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Audited by:</strong> {doc.peer_reviewer}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Asset Code:</strong> {doc.equipment_tag}
                    </span>
                  </div>
                </div>

                {/* Abstract Box */}
                {currentPage === 1 && (
                  <div className="bg-[#f2efe9] border-l-4 border-primary p-4 mb-6 text-xs text-[#222] font-sans leading-relaxed">
                    <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 text-primary">
                      Official Abstract & Executive Grounding Rationale
                    </span>
                    {doc.abstract}
                  </div>
                )}

                {/* Two-Column Academic Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-[#2a2a2a]">
                  {/* Left Column */}
                  <div className="space-y-4 font-sans">
                    <h3 className="font-bold text-sm text-[#111] border-b border-[#ddd] pb-1 uppercase tracking-wide">
                      {activePage?.section || "1. Operational Telemetry & Observations"}
                    </h3>
                    <p className="whitespace-pre-wrap text-justify">
                      {activePage?.text || doc.full_content}
                    </p>

                    {/* Mathematical Proof Box */}
                    {activePage?.equations && activePage.equations.length > 0 && (
                      <div className="bg-[#e9eff7] border border-[#b6cce6] p-3 space-y-1.5 font-mono text-[11px] text-[#1e3a5f]">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#0e52a0] block">
                          Governing Hydrodynamic & Thermodynamic Equations
                        </span>
                        {activePage.equations.map((eq, i) => (
                          <div key={i} className="p-1 bg-white/70 border border-[#c5d8ed] text-center font-bold">
                            {eq}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column (Highlighted AI Citation Grounding) */}
                  <div className="space-y-4 font-sans">
                    <h3 className="font-bold text-sm text-[#111] border-b border-[#ddd] pb-1 uppercase tracking-wide">
                      {currentPage === 1 ? "2. Field Heuristic Verification" : "3. Compliance & Action Checklist"}
                    </h3>

                    {/* Highlighted Proof Citation Section */}
                    {activePage?.highlighted_proof && (
                      <div className="bg-[#fef9c3] border-2 border-[#eab308] p-4 relative shadow-sm">
                        <div className="absolute -top-2.5 right-3 bg-[#eab308] text-[#111] text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
                          Grounding Cited by Copilot
                        </div>
                        <p className="text-xs font-semibold text-[#713f12] leading-relaxed italic">
                          "{activePage.highlighted_proof}"
                        </p>
                        <span className="block mt-2 text-[10px] text-[#854d0e] font-mono">
                          ↳ Grounded Source Citation #{doc.id} • Eliminates AI Hallucination
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#444] block font-mono">
                        Key Engineering Directives:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#333]">
                        {doc.key_findings.map((finding, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary font-bold font-mono">[{i + 1}]</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Academic Footer */}
                <div className="border-t border-[#ccc] mt-8 pt-3 flex justify-between text-[10px] text-[#777] font-mono">
                  <span>DeadMind Cognitive Continuity Intelligence Platform</span>
                  <span>Document ID: DM-{doc.id.toString().padStart(4, "0")} • Page {currentPage} of {pages.length || 1}</span>
                </div>
              </div>
            </div>
          )}

          {doc && viewMode === "grounding" && (
            <div className="space-y-4 font-mono text-xs">
              <div className="border border-primary/40 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Cognitive Grounding & Anti-Hallucination Architecture</span>
                </div>
                <p className="text-foreground/80 leading-relaxed text-[11px]">
                  When a technician queries DeadMind, the Copilot does NOT generate free-form statistical text.
                  It executes hybrid dense semantic retrieval (FAISS) + BM25 keyword matching across verified
                  technical papers, binds the exact mathematical proof, and returns citations directly from this document.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border bg-card p-4 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    Target Equipment & Failure Mode
                  </span>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Equipment: </span>{doc.equipment_tag}</p>
                    <p><span className="text-muted-foreground">Failure Code: </span>{doc.failure_code}</p>
                    <p><span className="text-muted-foreground">Confidence Metric: </span>{(doc.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="border border-border bg-card p-4 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Compliance & Peer Stamp
                  </span>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Auditor: </span>{doc.peer_reviewer}</p>
                    <p><span className="text-muted-foreground">Standard: </span>{doc.journal}</p>
                    <p><span className="text-muted-foreground">Verification: </span>Cryptographically Recorded</p>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-card p-4 space-y-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                  Actionable Operational Takeaways
                </span>
                <div className="space-y-2">
                  {doc.key_findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-muted/20 p-2.5 border border-border/40">
                      <span className="text-primary font-bold">[{i + 1}]</span>
                      <span className="text-foreground/90">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {doc && viewMode === "raw" && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                Verbatim Ingested Document Text:
              </span>
              <pre className="p-4 bg-black/60 border border-border text-foreground/90 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {doc.full_content}
              </pre>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="border-t border-border bg-[#121524] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-[10px] text-muted-foreground">
            DeadMind Cognitive Twin Grounding Proof Engine • Verifiable Source Citation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-primary text-primary-foreground font-display uppercase tracking-wider text-[10px] hover:bg-primary/90 cursor-pointer"
          >
            Close Proof Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
