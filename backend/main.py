from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from typing import Dict, Any
import socketio

from models.report import IncidentReport
from orchestrator.orchestrator import handle_alert
from websocket.ws_manager import sio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
import logging
from models.alert import AlertModel
import uuid
import datetime
from pydantic import BaseModel

class TargetRequest(BaseModel):
    target_url: str
    target_type: str # "repo" or "live"

app = FastAPI(title="SwarmOps Backend", description="Orchestration engine for incident alerts using specialist agents")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

app = socket_app

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()
is_investigating = False

async def monitor_target():
    global is_investigating
    if is_investigating:
        return

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get("http://localhost:4000/metrics", timeout=2.0)
            res.raise_for_status()
            data = res.json()
            
            # Anomaly rules
            if data.get("error_rate_percentage", 0) > 5 or data.get("cpu_percentage", 0) > 85 or data.get("memory_percentage", 0) > 90:
                is_investigating = True
                logger.warning("Anomaly detected! Triggering SwarmOps.")
                
                alert_payload = {
                    "incident_id": f"INC-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
                    "service": "target_server",
                    "severity": "P1",
                    "alert_type": "anomaly_detected",
                    "alert_message": "Automated monitor detected anomaly in metrics.",
                    "time_window": "last_5_minutes",
                    "environment": "production"
                }
                
                # Kick off the swarm in the background so scheduler isn't blocked
                import asyncio
                asyncio.create_task(process_alert(alert_payload))
                
    except Exception as e:
        logger.error(f"Monitor error: {e}")

@app.other_asgi_app.on_event("startup")
async def startup_event():
    scheduler.add_job(monitor_target, 'interval', seconds=5)
    scheduler.start()

@app.other_asgi_app.post("/api/v1/alert", response_model=IncidentReport)
async def process_alert(alert_payload: Dict[str, Any]):
    """Receives a raw alert, orchestrates the SwarmOps agents, and returns a root-cause report."""
    global is_investigating
    try:
        report = await handle_alert(alert_payload)
        is_investigating = False
        return report
    except ValidationError as e:
        is_investigating = False
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        is_investigating = False
        raise HTTPException(status_code=500, detail=str(e))

@app.other_asgi_app.post("/api/v1/analyze_target", response_model=IncidentReport)
async def analyze_target_endpoint(req: TargetRequest):
    """Receives a generic target URL (GitHub repo or live site) and orchestrates the SwarmOps agents to investigate it."""
    global is_investigating
    if is_investigating:
        raise HTTPException(status_code=409, detail="Swarm is currently investigating another incident.")
    
    is_investigating = True
    
    alert_payload = {
        "incident_id": f"TARGET-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
        "service": req.target_url,
        "severity": "P1",
        "alert_type": req.target_type,
        "alert_message": f"User requested autonomous analysis of {req.target_type} target: {req.target_url}",
        "time_window": "now",
        "environment": "production"
    }
    
    try:
        report = await handle_alert(alert_payload)
        is_investigating = False
        return report
    except Exception as e:
        is_investigating = False
        raise HTTPException(status_code=500, detail=str(e))
