from pydantic import BaseModel, Field
from typing import Literal

class AlertModel(BaseModel):
    incident_id: str = Field(..., description="Unique ID e.g. INC-20240612-0047")
    service: str = Field(..., description="The failing service name")
    severity: Literal["P1", "P2", "P3"] = Field(..., description="Incident severity")
    alert_type: str = Field(..., description="e.g. 'latency_spike', 'oom_kill'")
    alert_time: str = Field(..., description="ISO-8601 — when the alert fired")
    time_window: str = Field(..., description="e.g. '15m', '1h'")
    environment: Literal["production", "staging", "dev"] = Field(..., description="Deployment environment")
    alert_message: str = Field(..., description="Raw alert text")
