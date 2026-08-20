# DeadMind — Restructure to 4-Tab Blueprint

The current build has ~14 separate routes. The new blueprint collapses them into **4 role-based views**. We keep every PRD endpoint and the existing "Forge & Steel" design language, but rewire navigation, layout, and panel composition so each view tells one coherent story.

## Final Sidebar (4 entries)

```text
1.  Plant Map          → /            (CFO view)
2.  Expert Copilot     → /copilot     (Technician view)
3.  Operations Audit   → /audit       (Plant Head view)
4.  Ingestion          → /ingest      (Admin view)
```

The global year scrubber + plant-risk header stays in the top bar (already built).

---

## Tab 1 — Plant Knowledge & Vulnerability Map  (`/`)

Merges today's `index`, `vulnerability-map`, `decay`, `network`, `causal/$tag`, `counterfactuals/$tag`, `engineers` roster, `drift/$tag`.

- **Top Bar (inside page)**: Plant Risk %, Total ₹ Crore exposure, Active vs Retired counts. Driven by year context.
- **Main Panel**: SVG node-graph of B-101, P-302, V-205, C-104, S-501 with dashed flow links. Node color = coverage (green/yellow/red). Click selects.
- **Controls Tray** (below graph): 2026–2036 range slider, Play/Pause, year readout. Reuses existing `YearExposureBar` logic, restyled inline.
- **Details Split Panel** (slides up when a node is selected):
  - Left — meta: process area, criticality, active owners, retired owners (from `vulnerabilityMap`).
  - Middle — Causal Timeline Trace (`api.causal(tag)`).
  - Right — Counterfactual Simulator (`api.counterfactuals(tag)`) with ₹ saved counter + step animation.
- **Secondary strip** below: Retirement timeline (decay) + organizational dependency mini-graph (network).

## Tab 2 — Expert Persona Copilot  (`/copilot`)

Merges `copilot`, `engineers/$name` radar, `consensus`, `conflicts`.

- **Left Column**: Engineer dropdown → 6-axis cognitive radar SVG + metric legend (reuses `CognitiveRadar`).
- **Middle Column**: Chat feed.
  - User bubbles right (primary/gold), expert bubbles left (steel/popover, no fill on assistant per chat conventions).
  - Each expert bubble: response markdown, grounding confidence bar, cross-links to other experts, citation chips.
  - **Epistemic Uncertainty Grid** under each response: Sparsity / Staleness / Disagreement / Causal Gaps (from `ChatResponse.uncertainty`).
- **Consensus Drawer**: fades in when "Consensus" button pressed — calls `api.consensus`, shows weights bar chart + agreement/dissent.
- **Bottom Bar**: text input, [Consensus] toggle, [Consult] submit, suggestion chips.

## Tab 3 — Operations & Compliance Shadow Audit  (`/audit`)

Merges `sop-audit`, `half-life`, `shift-note`, `coreference` (coref also surfaces in Tab 4).

- **Left Column**: SOP table — Step #, Description, Compliance bar, Workarounds. Grouped by SOP id.
- **Right Column**: Knowledge Freshness Heatmap — card tiles colored by `freshness_score` (green/yellow/red), showing age, refs, contradictions, hardware gen.
- **Top utility strip**: Shift-Note analyzer (textarea + Analyze button → proactive alert card) so plant heads can paste a note without leaving the view.

## Tab 4 — Ingestion & Active Capture  (`/ingest`)

Merges `ingest` + `coreference` table.

- **Left Column — Authorship Ingestion Engine**: title + text area, optional author dropdown (or auto-detect), Submit → slide-in Attribution Report (tag, code, confidence, author from `api.upload`).
- **Right Column — Active Capture**: expert dropdown, big mic button with wave animation while recording (2s sample), transcript block, "Index Voice Note" submits via `api.voiceNote` and invalidates Tabs 1 & 3 queries.
- **Bottom Panel — Entity Coreference Resolver**: live table of alias → canonical with confidence (from `api.coreference`).

---

## Implementation Steps

1. **Sidebar rewrite** (`src/components/app-sidebar.tsx`): replace 14 entries with the 4 above, keep collapsible icon mode.
2. **Delete obsolete route files** (content is folded into the 4 pages):
   - `engineers.tsx`, `engineers.$name.tsx`, `vulnerability-map.tsx`, `decay.tsx`, `causal.$tag.tsx`, `counterfactuals.$tag.tsx`, `drift.$tag.tsx`, `half-life.tsx`, `consensus.tsx`, `shift-note.tsx`, `coreference.tsx`, `network.tsx`, `sop-audit.tsx`, `conflicts.tsx`.
3. **Extract reusable panels** into `src/components/panels/`:
   - `PlantGraph.tsx`, `NodeDetailDrawer.tsx`, `CausalTrace.tsx`, `CounterfactualSim.tsx`, `RetirementTimeline.tsx`, `DependencyMini.tsx`
   - `ChatFeed.tsx`, `UncertaintyGrid.tsx`, `ConsensusDrawer.tsx`
   - `SopTable.tsx`, `FreshnessHeatmap.tsx`, `ShiftNoteStrip.tsx`
   - `IngestForm.tsx`, `VoiceCapture.tsx`, `CoreferenceTable.tsx`
4. **Rewrite the 4 page routes** (`index.tsx`, `copilot.tsx`, `audit.tsx`, `ingest.tsx`) to compose those panels.
5. **State**: selected-node and selected-engineer move to local route state (search params for shareability: `/?node=B-101`, `/copilot?engineer=Vikram`).
6. **Year context** stays global; Plant Risk header continues to derive from it.

## Technical Notes

- All 14 PRD endpoints in `src/lib/api.ts` are preserved — only the UI surface changes.
- TanStack Query keys reused so cache survives the refactor.
- Animations (mic wave, drawer slide-up, counterfactual ₹ counter) via existing `animate-fade-in`/`scale-in` + a small framer-motion add where needed.
- No backend or business-logic changes.

## Out of Scope

- No new API calls or schemas.
- No design-system color/token changes.
- No auth or persistence work.
