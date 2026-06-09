"""
SwarmOps — Orchestrator
Coordinates the multi-phase incident investigation pipeline:
  Phase 1  →  Triage (sequential)
  Phase 2  →  Investigation (4 agents in parallel)
  Phase 3  →  Root Cause Analysis (sequential, uses Phase 2 results)
  Phase 4  →  Fix Generation (sequential, uses Phase 3 result)
  Phase 5  →  Validation (sequential, reviews the proposed fix)
"""

import asyncio
import json
import time
from datetime import datetime, timezone
from fastapi import HTTPException

from models.schemas import IncidentCreate, IncidentReport, AgentFinding

from agents.triage import TriageAgent
from agents.log_analyzer import LogAnalyzerAgent
from agents.metrics import MetricsAgent
from agents.trace import TraceAgent
from agents.security import SecurityAgent
from agents.root_cause import RootCauseAgent
from agents.fix_generator import FixGeneratorAgent
from agents.validation import ValidationAgent
from tools.github_fetcher import fetch_url_context


class Orchestrator:
    """Drives the full incident-response pipeline across all agent phases."""

    def __init__(self, sio):
        self.sio = sio

        # Instantiate every agent with the shared Socket.IO server
        self.triage_agent = TriageAgent(sio)
        self.log_analyzer = LogAnalyzerAgent(sio)
        self.metrics_agent = MetricsAgent(sio)
        self.trace_agent = TraceAgent(sio)
        self.security_agent = SecurityAgent(sio)
        self.root_cause_agent = RootCauseAgent(sio)
        self.fix_generator = FixGeneratorAgent(sio)
        self.validation_agent = ValidationAgent(sio)

    # ──────────────────────────────────────────────────────────────────

    async def investigate(self, incident: IncidentCreate, api_key: str) -> IncidentReport:
        """Run the full 5-phase investigation and return a complete report."""
        incident_id = f"INC-{int(time.time() * 1000)}"
        created_at = datetime.now(timezone.utc).isoformat()
        pipeline_start = time.perf_counter_ns()

        # 1. Gather URL Context if provided
        url_context = ""
        if getattr(incident, "target_url", None):
            await self.sio.emit("agent_event", {
                "incident_id": incident_id,
                "agent": "Orchestrator",
                "phase": "setup",
                "status": "running",
                "message": f"Fetching context from {incident.target_url}...",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "findings": "",
            })
            url_context = await fetch_url_context(incident.target_url, getattr(incident, "analysis_mode", "standard"))

        phases: list[dict] = []
        agent_findings: list[AgentFinding] = []

        # Base context shared with every agent
        context: dict = {
            "api_key": api_key,
            "incident_id": incident_id,
            "description": incident.description,
            "service": incident.service,
            "severity": incident.severity,
            "code_snippet": incident.code_snippet,
            "target_url_context": url_context,
            "analysis_mode": getattr(incident, "analysis_mode", "full")
        }

        # ── Phase 1: Triage ───────────────────────────────────────────
        context["phase"] = "triage"
        await self._emit_phase(incident_id, "triage", "started", "Triage phase initiated")
        triage_result = await self.triage_agent.run(context)
        phases.append({"phase": "triage", "status": "completed", "result": triage_result})
        agent_findings.append(self._to_finding(self.triage_agent, triage_result))
        context["triage_result"] = triage_result
        
        if "error" in triage_result:
            error_msg = triage_result["error"]
            await self._emit_phase(incident_id, "triage", "failed", f"Investigation aborted due to API error: {error_msg}")
            raise HTTPException(status_code=429, detail=f"OpenRouter API limit or error encountered: {error_msg}")

        await self._emit_phase(incident_id, "triage", "completed", "Triage phase completed")

        # ── Phase 2: Parallel Investigation ───────────────────────────
        context["phase"] = "investigation"
        await self._emit_phase(incident_id, "investigation", "started", "Investigation phase initiated — 4 agents running in parallel")

        log_res, metrics_res, trace_res, sec_res = await asyncio.gather(
            self.log_analyzer.run(context),
            self.metrics_agent.run(context),
            self.trace_agent.run(context),
            self.security_agent.run(context),
        )

        investigation_results = {
            "log_analysis": log_res,
            "metrics_analysis": metrics_res,
            "trace_analysis": trace_res,
            "security_analysis": sec_res,
        }
        phases.append({"phase": "investigation", "status": "completed", "result": investigation_results})
        agent_findings.extend([
            self._to_finding(self.log_analyzer, log_res),
            self._to_finding(self.metrics_agent, metrics_res),
            self._to_finding(self.trace_agent, trace_res),
            self._to_finding(self.security_agent, sec_res),
        ])
        context["investigation_findings"] = investigation_results
        await self._emit_phase(incident_id, "investigation", "completed", "Investigation phase completed")

        # ── Phase 3: Root Cause ───────────────────────────────────────
        context["phase"] = "root_cause"
        await self._emit_phase(incident_id, "root_cause", "started", "Root cause analysis initiated")
        root_cause_result = await self.root_cause_agent.run(context)
        phases.append({"phase": "root_cause", "status": "completed", "result": root_cause_result})
        agent_findings.append(self._to_finding(self.root_cause_agent, root_cause_result))
        context["root_cause"] = root_cause_result
        await self._emit_phase(incident_id, "root_cause", "completed", "Root cause analysis completed")

        # ── Phase 4: Fix Generation ───────────────────────────────────
        context["phase"] = "fix_generation"
        await self._emit_phase(incident_id, "fix_generation", "started", "Fix generation initiated")
        fix_result = await self.fix_generator.run(context)
        phases.append({"phase": "fix_generation", "status": "completed", "result": fix_result})
        agent_findings.append(self._to_finding(self.fix_generator, fix_result))
        context["proposed_fix"] = fix_result
        await self._emit_phase(incident_id, "fix_generation", "completed", "Fix generation completed")

        # ── Phase 5: Validation ───────────────────────────────────────
        context["phase"] = "validation"
        await self._emit_phase(incident_id, "validation", "started", "Validation phase initiated")
        validation_result = await self.validation_agent.run(context)
        phases.append({"phase": "validation", "status": "completed", "result": validation_result})
        agent_findings.append(self._to_finding(self.validation_agent, validation_result))
        await self._emit_phase(incident_id, "validation", "completed", "Validation phase completed")

        # ── Build Report ──────────────────────────────────────────────
        resolution_ms = (time.perf_counter_ns() - pipeline_start) // 1_000_000

        report = IncidentReport(
            incident_id=incident_id,
            description=incident.description,
            service=incident.service,
            severity=incident.severity,
            status="resolved",
            created_at=created_at,
            phases=phases,
            agent_findings=agent_findings,
            root_cause=root_cause_result.get("root_cause", "Unable to determine"),
            confidence=self._parse_confidence(root_cause_result.get("confidence", 0)),
            recommended_fix=fix_result.get("fix_description", "No fix generated"),
            code_patch=fix_result.get("code_patch", ""),
            validation_result=validation_result.get("validation_status", "unknown"),
            resolution_time_ms=resolution_ms,
        )

        await self.sio.emit("investigation_complete", report.model_dump())
        return report

    # ── Helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _parse_confidence(val) -> int:
        """Safely parse LLM confidence outputs (e.g. '95%', 'High', 'N/A') to an integer."""
        if isinstance(val, int):
            return val
        try:
            if isinstance(val, str):
                val = val.replace('%', '').strip()
            return int(float(val))
        except (ValueError, TypeError):
            return 0

    async def _emit_phase(self, incident_id: str, phase: str, status: str, message: str):
        await self.sio.emit("agent_event", {
            "incident_id": incident_id,
            "agent": "Orchestrator",
            "phase": phase,
            "status": status,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "findings": "",
        })

    @staticmethod
    def _to_finding(agent, result: dict) -> AgentFinding:
        """Convert a raw agent result dict into an AgentFinding model."""
        # Try to pull recommendations from the result
        recs: list[str] = []
        for key in ("recommendations", "security_recommendations", "deployment_steps", "final_recommendation"):
            val = result.get(key)
            if isinstance(val, list):
                recs = [str(r) for r in val]
                break
            elif isinstance(val, str) and val:
                recs = [val]
                break

        return AgentFinding(
            agent_name=result.get("_agent", agent.name),
            role=agent.role,
            status="error" if "error" in result else "completed",
            findings=json.dumps(
                {k: v for k, v in result.items() if not k.startswith("_")},
                default=str,
            ),
            recommendations=recs,
            duration_ms=result.get("_duration_ms", 0),
        )
