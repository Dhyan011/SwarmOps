from pydantic import BaseModel, Field
from typing import Literal, Optional, List

class AgentFinding(BaseModel):
    agent: str = Field(..., description="Name of the agent")
    status: Literal["success", "no_data", "error"] = Field(...)
    anomaly_detected: Optional[bool] = None
    anomaly_timestamp: Optional[str] = Field(None, description="ISO-8601 or null")
    affected_service: Optional[str] = None
    signal_type: Optional[str] = Field(None, description="Description of what was found")
    signal_detail: Optional[str] = Field(None, description="One sentence max detail")
    evidence: Optional[List[str]] = Field(default_factory=list, description="Raw excerpts")
    confidence: Optional[Literal["high", "medium", "low"]] = None
    recommended_action: Optional[str] = None
