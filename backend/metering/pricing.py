"""
DeadMind Centralized Dynamic Pricing Engine & Service Catalog.
Provides configurable operational base costs, dynamic complexity computation,
and machine-readable service discovery for humans and autonomous AI agents.
"""
from typing import Dict, Any, List

# ── Configurable Base Operational Costs (DeadMind Credits) ───────────────────
BASE_PRICING_SCHEDULE = {
    "base_chat": 10,
    "hybrid_rag": 15,
    "expert_twin": 15,           # per expert consulted
    "consensus_synthesis": 20,
    "uncertainty_analysis": 15,
    "risk_analysis": 25,
    "compliance_audit": 40,
    "deep_rca_pack": 35,
    "continuity_analysis": 30,
    "agent_deep_pack": 30,
}

USDC_PER_CREDIT_MICRO = 1000  # 1 DeadMind Credit = 1,000 microUSDC ($0.0010 USDC)


class PricingEngine:
    @staticmethod
    def calculate_cost(
        service_type: str = "chat",
        query: str = "",
        experts_count: int = 0,
        has_consensus: bool = False,
        has_uncertainty: bool = True,
        analysis_mode: str = "standard",
        token_count: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates dynamic itemized cost in DeadMind Credits.
        Formula: base_operation + token_complexity + retrieval + expert_twins + analysis_modules
        """
        base = BASE_PRICING_SCHEDULE.get("base_chat", 10)
        rag = BASE_PRICING_SCHEDULE.get("hybrid_rag", 15)
        
        # Expert Twins
        expert_cost = experts_count * BASE_PRICING_SCHEDULE.get("expert_twin", 15)
        
        # Consensus
        consensus_cost = BASE_PRICING_SCHEDULE.get("consensus_synthesis", 20) if (has_consensus and experts_count >= 2) else 0
        
        # Uncertainty
        uncertainty_cost = BASE_PRICING_SCHEDULE.get("uncertainty_analysis", 15) if has_uncertainty else 0
        
        # Specialized Modules
        mode_cost = 0
        if analysis_mode == "risk_analysis":
            mode_cost = BASE_PRICING_SCHEDULE.get("risk_analysis", 25)
        elif analysis_mode == "compliance_audit":
            mode_cost = BASE_PRICING_SCHEDULE.get("compliance_audit", 40)
        elif analysis_mode == "deep_rca_pack":
            mode_cost = BASE_PRICING_SCHEDULE.get("deep_rca_pack", 35)
        elif analysis_mode in ("agent_consensus", "deep_risk_audit", "compliance_pack"):
            mode_cost = BASE_PRICING_SCHEDULE.get("agent_deep_pack", 30)

        # Dynamic Token Surcharge (1 credit per ~400 tokens above baseline)
        token_surcharge = max(0, (token_count - 300) // 400) if token_count > 0 else 0

        total_credits = base + rag + expert_cost + consensus_cost + uncertainty_cost + mode_cost + token_surcharge

        return {
            "total_credits": total_credits,
            "breakdown": {
                "base_inference": base,
                "hybrid_rag": rag,
                "expert_twins": expert_cost,
                "consensus_synthesis": consensus_cost,
                "uncertainty_analysis": uncertainty_cost,
                "specialized_module": mode_cost,
                "token_surcharge": token_surcharge
            },
            "pricing_metadata": {
                "service_type": service_type,
                "analysis_mode": analysis_mode,
                "experts_evaluated": experts_count
            }
        }

    @staticmethod
    def get_service_catalog() -> List[Dict[str, Any]]:
        """Returns machine-readable service discovery catalog for autonomous agents & API clients."""
        return [
            {
                "service_id": "plant_operations_chat",
                "service_name": "Standard Plant Operations Inquiry",
                "description": "General plant documentation, P&ID lookups, and operating procedure guidance.",
                "base_credit_cost": 25,
                "estimated_credits_range": "25 - 40 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "conversation_id"]
            },
            {
                "service_id": "expert_twin_consultation",
                "service_name": "Expert Twin Deep Consultation",
                "description": "Directly consults grounded historical knowledge of specific plant domain specialists.",
                "base_credit_cost": 40,
                "estimated_credits_range": "40 - 70 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "selected_experts", "conversation_id"]
            },
            {
                "service_id": "multi_expert_consensus",
                "service_name": "Multi-Expert Consensus & Dissent Synthesis",
                "description": "Cross-references multiple engineering disciplines (Mechanical, Electrical, I&C), exposes technical consensus, and isolates points of dissent.",
                "base_credit_cost": 65,
                "estimated_credits_range": "65 - 105 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "selected_experts", "analysis_mode"]
            },
            {
                "service_id": "risk_and_uncertainty_audit",
                "service_name": "Cognitive Risk & Uncertainty Decomposition",
                "description": "Decomposes 4-factor risk (sparsity, staleness, cross-expert disagreement, causal exposure) with safety interlock checks.",
                "base_credit_cost": 50,
                "estimated_credits_range": "50 - 85 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "target_equipment"]
            },
            {
                "service_id": "regulatory_compliance_pack",
                "service_name": "OISD & Regulatory Compliance Audit Pack",
                "description": "Cross-examines maintenance records against OISD-118, OSHA PSM, and ISO-14224 plant standards.",
                "base_credit_cost": 80,
                "estimated_credits_range": "80 - 140 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "standards_filter"]
            },
            {
                "service_id": "agent_deep_rca_pack",
                "service_name": "Autonomous Agent Deep RCA Intelligence Pack",
                "description": "Machine-payable end-to-end evidence package with root-cause analysis, causal graphs, and cryptographic document SHA-256 verification hashes.",
                "base_credit_cost": 100,
                "estimated_credits_range": "100 - 175 Credits",
                "x402_required_on_overage": True,
                "supported_parameters": ["query", "max_price_credits", "format"]
            }
        ]


pricing_engine = PricingEngine()
