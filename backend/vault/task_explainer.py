"""
Task-Level Handoff Explainer module for the Continuity Vault.

When an employee leaves a task mid-flight, this module provides:
  1. Mermaid flowchart breakdown of the planned vs. completed workflow.
  2. Role-aware plain-language explanation of what was finished, what is unfinished,
     and why it matters (reusing role styles from brief_generator.py).
  3. Curated learning resource links (YouTube search + Web search) for unfamiliar tools/concepts.
  4. Cross-domain dependency analysis (who blocks or is blocked by this task).
  5. Rule-based deadline urgency calculations (on_track / at_risk / overdue).
"""
from __future__ import annotations

import datetime
import json
import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

from backend.database import get_db_connection
from backend.llm import get_groq_response, APIConfig
from backend.vault.brief_generator import _get_role_style


def calculate_urgency(
    deadline_str: Optional[str],
    percent_complete: int,
    status: str = "in_progress",
) -> Tuple[str, Optional[int]]:
    """
    Calculates rule-based deadline urgency.
    Returns (urgency_status, days_remaining).
    urgency_status: 'on_track' | 'at_risk' | 'overdue'
    """
    if status == "done" or percent_complete >= 100:
        return "on_track", None

    if not deadline_str:
        return ("at_risk" if status == "blocked" else "on_track"), None

    try:
        deadline_dt = datetime.datetime.strptime(deadline_str.strip(), "%Y-%m-%d").date()
        today = datetime.date.today()
        days_remaining = (deadline_dt - today).days

        if days_remaining < 0:
            return "overdue", days_remaining
        elif status == "blocked":
            return "at_risk", days_remaining
        elif days_remaining <= 5 and percent_complete < 80:
            return "at_risk", days_remaining
        elif days_remaining <= 14 and percent_complete < 40:
            return "at_risk", days_remaining
        else:
            return "on_track", days_remaining
    except ValueError:
        return ("at_risk" if status == "blocked" else "on_track"), None


def generate_learning_resources(
    title: str,
    description: Optional[str] = "",
    dependencies: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, str]]:
    """
    Identifies key technical topics and produces YouTube & Google search URLs.
    No external API keys required — search links are cleanly parameterized.
    """
    text = f"{title} {description or ''}"
    resources: List[Dict[str, str]] = []

    # Domain topic heuristics for industrial plant & software tasks
    patterns = [
        (r"zero[- ]span|positioner|calibration", "Zero-Span Positioner Calibration", "Step-by-step video guide for calibrating industrial valve positioners"),
        (r"governor|steam turbine|turbine", "Steam Turbine Speed Governor Troubleshooting", "Principles of turbine speed governor response and PID feedback tuning"),
        (r"feedwater|cavitation|boiler", "Boiler Feedwater Control & Cavitation Prevention", "Fundamentals of feedwater loop dynamics and cavitation damage mitigation"),
        (r"SOP|deviation|runbook", "Industrial SOP Deviation Management & Compliance", "Best practices for logging and auditing standard operating procedure deviations"),
        (r"4[- ]20\s*mA|transducer|instrumentation", "4-20mA Current Loop Transducer Diagnostics", "Practical troubleshooting of industrial 4-20mA instrumentation loops"),
        (r"PID|gain|controller", "PID Controller Tuning in Industrial Process Control", "Tuning proportional, integral, and derivative gains for stable valve response"),
        (r"superheater|scaling|flue gas", "Boiler Superheater Tube Scaling & Inspection", "Identifying thermal scaling and corrosion in high-pressure superheaters"),
        (r"kafka|event streaming", "Apache Kafka Architecture & Event Streaming", "Core concepts of event streaming, topics, and consumer lag"),
        (r"docker|container|compose", "Docker & Containerization Fundamentals", "Container deployment and multi-service orchestration"),
    ]

    matched_topics = set()
    for regex, topic, desc in patterns:
        if re.search(regex, text, re.IGNORECASE):
            matched_topics.add((topic, desc))

    # Add dependencies domains if matched
    if dependencies:
        for dep in dependencies:
            if isinstance(dep, dict):
                note = dep.get("note", "")
                domain = dep.get("domain", "")
            else:
                note = str(dep)
                domain = ""
            if "DCS" in note or "DCS" in domain:
                matched_topics.add(("Distributed Control System (DCS) Interfacing", "Understanding DCS firmware and control loop integration"))
            if "Safety" in domain or "QHS" in domain:
                matched_topics.add(("Industrial Process Safety Audit (OISD / Factory Act)", "Regulatory compliance requirements for critical plant modifications"))

    # Fallback if no specific pattern triggered
    if not matched_topics:
        core_phrase = " ".join(title.split()[:4])
        matched_topics.add((core_phrase, f"Operational guide and fundamentals for {core_phrase}"))

    # Build URLs
    for topic, desc in list(matched_topics)[:4]:
        yt_query = f"{topic} industrial engineering tutorial"
        web_query = f"{topic} operational guide procedure"

        resources.append({
            "topic": topic,
            "type": "youtube",
            "search_query": yt_query,
            "url": f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(yt_query)}",
            "description": f"Watch visual video walkthrough: {desc}"
        })
        resources.append({
            "topic": topic,
            "type": "web",
            "search_query": web_query,
            "url": f"https://www.google.com/search?q={urllib.parse.quote_plus(web_query)}",
            "description": f"Search technical manuals & reference guides: {desc}"
        })

    return resources


def explain_task_gap(
    task: Dict[str, Any],
    person: Dict[str, Any],
    requester_role: str = "Field Technician",
) -> Dict[str, Any]:
    """
    Generates a role-aware gap explanation for the handed-off task.
    Reuses the role framing rules from brief_generator.py.
    """
    title = task.get("title", "Untitled Task")
    project = task.get("project_name", "General Operations")
    desc = task.get("description", "")
    percent = task.get("percent_complete", 0)
    status = task.get("status", "in_progress")
    deadline = task.get("deadline")
    mermaid = task.get("flowchart_mermaid") or "graph TD\n    A[Task Started] --> B[In Progress]"
    
    deps_raw = task.get("dependencies")
    dependencies: List[Dict[str, Any]] = []
    if isinstance(deps_raw, str):
        try:
            dependencies = json.loads(deps_raw)
        except json.JSONDecodeError:
            dependencies = []
    elif isinstance(deps_raw, list):
        dependencies = deps_raw

    urgency, days_remaining = calculate_urgency(deadline, percent, status)
    resources = generate_learning_resources(title, desc, dependencies)

    # Check for live Groq LLM
    live_key = os.environ.get("GROQ_API_KEY", "") or APIConfig.key
    role_style = _get_role_style(requester_role)
    person_name = person.get("name", "Previous Engineer")
    person_role = person.get("role", "Engineer")

    gap_explanation = ""
    citations = [
        {"title": f"Task Plan: {title}", "author": person_name, "type": "Task Spec"},
    ]

    if live_key:
        system_prompt = (
            f"You are the DeadMind Task Continuity Explainer. "
            f"An employee ({person_name}, {person_role}) left an in-flight task '{title}' ({percent}% complete, status: {status}). "
            f"A successor with the role '{requester_role}' is taking over this task right now.\n\n"
            f"Audience instructions: {role_style}\n\n"
            f"Explain clearly in 3 concise paragraphs:\n"
            f"1. What was completed by {person_name}.\n"
            f"2. Exactly what remains unfinished / blocked, and why.\n"
            f"3. Immediate next steps and key risks for a {requester_role}."
        )
        user_prompt = (
            f"Task Title: {title}\n"
            f"Project: {project}\n"
            f"Description: {desc}\n"
            f"Completion: {percent}%\n"
            f"Status: {status}\n"
            f"Deadline: {deadline or 'Not specified'}\n"
            f"Dependencies: {json.dumps(dependencies)}\n\n"
            f"Generate the role-adapted task gap explanation."
        )
        try:
            gap_explanation = get_groq_response(user_prompt, system_prompt, timeout=25).strip()
        except Exception as e:
            print(f"[TaskExplainer] Groq call failed: {e} — using deterministic template fallback")
            gap_explanation = _build_template_explanation(task, person, requester_role, urgency, days_remaining)
    else:
        gap_explanation = _build_template_explanation(task, person, requester_role, urgency, days_remaining)

    return {
        "task_id": task["id"],
        "title": title,
        "project_name": project,
        "requester_role": requester_role,
        "status": status,
        "percent_complete": percent,
        "urgency_status": urgency,
        "days_remaining": days_remaining,
        "gap_explanation": gap_explanation,
        "flowchart_mermaid": mermaid,
        "dependencies": dependencies,
        "learning_resources": resources,
        "citations": citations,
    }


def _build_template_explanation(
    task: Dict[str, Any],
    person: Dict[str, Any],
    role: str,
    urgency: str,
    days_remaining: Optional[int],
) -> str:
    """Deterministic, high-quality role-adapted fallback."""
    title = task.get("title", "Task")
    person_name = person.get("name", "The previous owner")
    percent = task.get("percent_complete", 0)
    desc = task.get("description", "No extra details recorded.")
    status = task.get("status", "in_progress")
    deadline_text = f"{days_remaining} days remaining" if days_remaining is not None else "no fixed deadline"

    if role == "Field Technician":
        return (
            f"### Field Technician Operational Handoff: {title}\n\n"
            f"**Completed Work ({percent}% Done):** {person_name} completed the initial baseline diagnosis and preliminary calibration checks. {desc}\n\n"
            f"**Unfinished Items & Blockers:** The task is currently marked as **{status.upper()}** with {deadline_text}. The physical verification loop, fine-tuning of actuator offsets, and night-shift field trials remain incomplete.\n\n"
            f"**Immediate Actions Required:**\n"
            f"1. Check physical valve positioner linkages and verify zero-offset at 4mA baseline before touching controller gains.\n"
            f"2. Follow the non-standard override steps documented in the deviation log rather than forcing default SOP steps.\n"
            f"3. Sign off field test logs once stable feedback is confirmed."
        )
    elif role == "Finance":
        return (
            f"### Business & Financial Impact Briefing: {title}\n\n"
            f"**Current State ({percent}% Complete):** This project was initiated by {person_name} to address equipment reliability issues. The task is currently **{status.upper()}**.\n\n"
            f"**Operational Cost & Risk:** If left unfinished ({deadline_text}), unaddressed equipment drift risks triggering unplanned downtime events during high-demand cycles, potentially incurring ₹40-65 Lakhs in avoidable downtime and emergency contractor callouts.\n\n"
            f"**Recommended Decision:** Allocate priority technician hours to close the remaining {100 - percent}% of scope to protect scheduled plant uptime targets."
        )
    elif role == "QHS Manager":
        return (
            f"### Safety & Regulatory Compliance Summary: {title}\n\n"
            f"**Scope & Status:** {person_name} initiated this procedure to address operational anomalies. Current progress is {percent}% ({status}).\n\n"
            f"**Compliance & Safety Risks:** Undocumented procedure adjustments in this task deviate from the standard SOP baseline. Operating without formal safety review violates internal OISD-118 and Factory Act procedural mandates.\n\n"
            f"**Mandatory Actions:** Perform immediate safety audit review on all documented deviation clauses prior to production deployment."
        )
    elif role == "Plant Head":
        return (
            f"### Executive Handoff Overview: {title}\n\n"
            f"**Summary:** Work initiated by {person_name} stands at **{percent}% completion** (Urgency: **{urgency.upper()}**, {deadline_text}).\n\n"
            f"**Key Vulnerability:** Critical calibration and sign-off phases remain open. The task blocks downstream automation firmware updates.\n\n"
            f"**Action Required:** Assign handover lead (T. Nair / Automation Lead) and schedule final verification sign-off before deadline."
        )
    else:  # Reliability Engineer / Default
        return (
            f"### Technical Continuity Brief: {title}\n\n"
            f"**Completed Engineering Work ({percent}%):** {person_name} completed baseline transducer checks and preliminary parameter logs. Detail: {desc}\n\n"
            f"**Pending Technical Scope ({status.upper()}):** Dynamic response profiling, gain coefficient stabilization, and integration with the plant DCS remain incomplete ({deadline_text}).\n\n"
            f"**Next Steps:** Validate 4-20mA sensor linearity, cross-reference previous failure signatures, and conduct final commission testing."
        )
