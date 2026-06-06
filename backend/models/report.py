from pydantic import BaseModel, Field
from typing import Literal, Optional, List

class TimelineEvent(BaseModel):
    timestamp: str = Field(..., description="ISO-8601 timestamp")
    agent: str = Field(..., description="Agent name")
    event: str = Field(..., description="What the agent found at this time")

class EvidenceItem(BaseModel):
    agent: str = Field(..., description="Agent name")
    finding: Optional[str] = Field(None, description="One-line summary of agent finding")
    status: Literal["success", "no_data", "error", "unavailable"] = Field(...)

class IncidentReport(BaseModel):
    incident_id: str = Field(..., description="Copy from alert")
    root_cause_agent: Optional[str] = Field(None, description="Agent name with earliest signal")
    root_cause_service: Optional[str] = Field(None, description="Affected service")
    root_cause_summary: Optional[str] = Field(None, description="One sentence, plain English")
    confidence: Literal["high", "medium", "low"] = Field(...)
    confidence_reason: Optional[str] = Field(None, description="Why this confidence level")
    timeline: List[TimelineEvent] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    recommended_fix: Optional[str] = Field(None, description="Specific action to take")
    runbook_id: Optional[str] = None
    agents_unavailable: List[str] = Field(default_factory=list, description="List of agent names that returned error")
    synthesis_notes: Optional[str] = Field(None, description="Flag any conflicts or uncertainty")
