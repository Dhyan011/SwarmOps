"""
SwarmOps — FastAPI Entry Point
Production multi-agent incident response system powered by OpenRouter LLMs.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio

from config import OPENROUTER_API_KEY
from models.schemas import IncidentCreate, IncidentReport
from agents.orchestrator import Orchestrator

from datetime import datetime, timezone

# ── In-memory incident store ──
incidents_db: dict[str, IncidentReport] = {}

# ── App Initialisation ──
app = FastAPI(
    title="SwarmOps",
    description="Autonomous incident response orchestration via multi-agent swarms.",
    version="0.2.0",
)

# ── CORS (allow frontend in dev) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Socket.IO Setup ──
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, app)

# ── Orchestrator (created once, shared across requests) ──
orchestrator = Orchestrator(sio)


# ── Socket.IO events ──
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


# ── Health Check ──
@app.get("/health", tags=["system"])
async def health_check():
    """Lightweight liveness probe."""
    return {
        "status": "alive",
        "service": "SwarmOps",
        "llm_configured": bool(OPENROUTER_API_KEY),
    }


# ── Incident Endpoints ──
@app.post("/api/v1/incident", response_model=IncidentReport, tags=["incidents"])
async def create_incident(incident: IncidentCreate):
    """
    Triggers the full multi-agent investigation pipeline.
    Streams real-time agent events via Socket.IO while processing.
    Returns the complete IncidentReport once all phases finish.
    """
    report = await orchestrator.investigate(incident)
    incidents_db[report.incident_id] = report
    return report


@app.get("/api/v1/incidents", tags=["incidents"])
async def list_incidents():
    """Returns all stored incidents, most recent first."""
    return list(reversed(incidents_db.values()))


@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentReport, tags=["incidents"])
async def get_incident(incident_id: str):
    """Returns a specific incident by ID."""
    report = incidents_db.get(incident_id)
    if report is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return report


from pydantic import BaseModel

class ActionRequest(BaseModel):
    action: str

@app.post("/api/v1/incidents/{incident_id}/action", tags=["incidents"])
async def handle_incident_action(incident_id: str, payload: ActionRequest):
    if incident_id not in incidents_db:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident = incidents_db[incident_id]
    
    if payload.action == "approve":
        incident.status = "deployed"
        
        # Determine patch
        patch_content = incident.code_patch
        
        # We don't have target_url on the IncidentReport directly, 
        # so for simulation, we'll just pass a placeholder or get from db if we mapped it.
        target_url = "https://github.com/simulation/repo"
        
        from tools.github_pr import create_github_pr
        message = await create_github_pr(
            target_url=target_url,
            patch_content=patch_content,
            incident_id=incident_id,
            title=f"SwarmOps Fix: {incident.description[:50]}",
            description=incident.root_cause,
            sio=sio
        )
        
    elif payload.action == "reject":
        incident.status = "rejected"
        message = "Proposed fix was rejected by operator."
        await sio.emit("agent_event", {
            "incident_id": incident_id,
            "agent": "System",
            "phase": "action",
            "status": "completed",
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "findings": ""
        })
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    return {"status": incident.status, "message": message}

# ── Uvicorn Runner ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
