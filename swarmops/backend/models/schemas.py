"""
SwarmOps — Pydantic Schemas
All request/response models for the incident response pipeline.
"""

from pydantic import BaseModel


class IncidentCreate(BaseModel):
    """Incoming incident payload from the frontend."""
    description: str
    service: str
    severity: str
    code_snippet: str = ""
    target_url: str = ""
    analysis_mode: str = "full"  # "full" or "agentic"


class AgentFinding(BaseModel):
    """Output summary from a single agent."""
    agent_name: str
    role: str
    status: str
    findings: str
    recommendations: list[str]
    duration_ms: int


class IncidentReport(BaseModel):
    """Full incident report returned after orchestration completes."""
    incident_id: str
    description: str
    service: str
    severity: str
    status: str
    created_at: str
    phases: list[dict]
    agent_findings: list[AgentFinding]
    root_cause: str
    confidence: int
    recommended_fix: str
    code_patch: str
    validation_result: str
    resolution_time_ms: int


class AgentEvent(BaseModel):
    """Real-time Socket.IO event emitted by each agent."""
    agent: str
    phase: str
    status: str
    message: str
    timestamp: str
    findings: str = ""
