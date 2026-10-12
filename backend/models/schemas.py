"""
SwarmOps — Pydantic Schemas
All request/response models for the incident response pipeline.
"""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class IncidentCreate(BaseModel):
    """Incoming incident payload from the frontend."""
    description: str = Field(..., max_length=5000)
    service: str = Field(..., max_length=100)
    severity: str = Field(..., max_length=50)
    code_snippet: str = Field("", max_length=50000)
    target_url: str = Field("", max_length=500)
    target_branch: str = Field("", max_length=255)
    analysis_mode: str = Field("full", max_length=50)


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
    owner_id: str = ""
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
    user_supplied_evidence: str = Field(default="", max_length=50000)
    validation_result: str
    validation_state: Literal[
        "not_validated", "validation_in_progress", "validation_passed",
        "validation_failed", "needs_manual_review"
    ] = "needs_manual_review"
    policy_state: Literal["not_checked", "passed", "rejected", "needs_manual_review"] = "needs_manual_review"
    policy_findings: list[str] = Field(default_factory=list)
    tests_executed: bool = False
    resolution_time_ms: int
    target_url: str = ""
    target_branch: str = ""
    pr_url: str = ""
    pr_number: int | None = None
    pr_title: str = ""
    pr_body: str = ""
    pr_action_started_at: str = ""


class ValidationOutput(BaseModel):
    """Strict, fail-closed output contract for the AI validation agent."""

    model_config = ConfigDict(extra="forbid", strict=True)

    validation_status: Literal["approved", "rejected", "needs_review"]
    safety_score: int = Field(ge=0, le=100)
    potential_side_effects: list[str]
    completeness: bool
    final_recommendation: str = Field(min_length=1, max_length=4000)


class AgentEvent(BaseModel):
    """Real-time Socket.IO event emitted by each agent."""
    agent: str
    phase: str
    status: str
    message: str
    timestamp: str
    findings: str = ""


class ContributionCandidate(BaseModel):
    """One concrete, reviewable open-source contribution proposal."""

    model_config = ConfigDict(extra="forbid", strict=True)

    category: str = Field(min_length=1, max_length=80)
    priority: Literal["low", "medium", "high", "critical"]
    confidence: int = Field(ge=0, le=100)
    issue_title: str = Field(min_length=8, max_length=200)
    issue_body: str = Field(min_length=1, max_length=8000)
    pull_request_title: str = Field(min_length=8, max_length=200)
    pull_request_body: str = Field(min_length=1, max_length=8000)
    summary: str = Field(min_length=1, max_length=3000)
    affected_files: list[str] = Field(min_length=1, max_length=10)
    patch: str = Field(min_length=1, max_length=30000)
    test_plan: list[str] = Field(min_length=1, max_length=10)


class ContributionScanOutput(BaseModel):
    """Strict scan response; a null candidate means no safe proposal was found."""

    model_config = ConfigDict(extra="forbid", strict=True)

    summary: str = Field(min_length=1, max_length=3000)
    candidate: ContributionCandidate | None


class ContributionScanRequest(BaseModel):
    repository_url: str = Field(min_length=1, max_length=500)


class ContributionPublishRequest(BaseModel):
    """Exact user-confirmed GitHub payload; the server still validates the patch."""

    model_config = ConfigDict(extra="forbid", strict=True)

    confirmed: bool
    issue_title: str = Field(min_length=8, max_length=200)
    issue_body: str = Field(min_length=1, max_length=8000)
    pull_request_title: str = Field(min_length=8, max_length=200)
    pull_request_body: str = Field(min_length=1, max_length=8000)
    patch: str = Field(min_length=1, max_length=30000)
