"""
SwarmOps — FastAPI Entry Point
Production multi-agent incident response system powered by OpenRouter LLMs.
"""

from fastapi import FastAPI, HTTPException, Header, Request, Response
import os
import asyncio
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import socketio

from config import OPENROUTER_API_KEY
from models.schemas import IncidentCreate, IncidentReport
from agents.orchestrator import Orchestrator
from db import db

from datetime import datetime, timezone
from pydantic import BaseModel

# ── App Initialisation ──
app = FastAPI(
    title="SwarmOps",
    description="Autonomous incident response orchestration via multi-agent swarms.",
    version="0.2.0",
)

# ── Rate Limiting ──
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Headers (CSP) ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

# ── Socket.IO Setup ──
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, app)

# ── Orchestrator (created once, shared across requests) ──
orchestrator = Orchestrator(sio)

# ── Concurrency Limit ──
max_concurrent_investigations = asyncio.Semaphore(3)

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
@limiter.limit("5/minute")
async def create_incident(request: Request, incident: IncidentCreate, x_api_key: str = Header(None)):
    """
    Triggers the full multi-agent investigation pipeline.
    Streams real-time agent events via Socket.IO while processing.
    Returns the complete IncidentReport once all phases finish.
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="OpenRouter API Key is required. Please sign in.")
        
    try:
        async with max_concurrent_investigations:
            report = await orchestrator.investigate(incident, api_key=x_api_key)
            # Save to persistent database
            await db.set(report.incident_id, report)
            return report
    except asyncio.TimeoutError:
         raise HTTPException(status_code=429, detail="Too many concurrent investigations. Please try again later.")

@app.get("/api/v1/incidents", tags=["incidents"])
async def list_incidents():
    """Returns all stored incidents from the persistent database."""
    return db.get_all()

@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentReport, tags=["incidents"])
async def get_incident(incident_id: str):
    """Returns a specific incident by ID."""
    report = db.get(incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return report

class ActionRequest(BaseModel):
    action: str

@app.post("/api/v1/incidents/{incident_id}/action", tags=["incidents"])
async def handle_incident_action(incident_id: str, payload: ActionRequest):
    report = db.get(incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if payload.action == "approve":
        report.status = "deployed"
        patch_content = report.code_patch
        target_url = "https://github.com/simulation/repo"
        
        from tools.github_pr import create_github_pr
        message = await create_github_pr(
            target_url=target_url,
            patch_content=patch_content,
            incident_id=incident_id,
            title=f"SwarmOps Fix: {report.description[:50]}",
            description=report.root_cause,
            sio=sio
        )
        
        # Save patterns to memory
        from memory_store import memory_store
        memory_store.extract_and_save(report)
        
    elif payload.action == "reject":
        report.status = "rejected"
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
        
    # Update persistent database
    await db.set(incident_id, report)
    return {"status": report.status, "message": message}

# ── GitHub OAuth Endpoints ──
@app.get("/api/v1/auth/github/login", tags=["auth"])
async def github_login():
    """Initiates GitHub OAuth flow."""
    return {"url": "https://github.com/login/oauth/authorize?client_id=demo"}

@app.get("/api/v1/auth/github/callback", tags=["auth"])
async def github_callback(code: str):
    """Handles GitHub OAuth callback."""
    return {"status": "success", "token": "gho_dummy123456789"}

# ── Serve Frontend ──
dist_path = os.path.join(os.path.dirname(__file__), "dist")
os.makedirs(dist_path, exist_ok=True)

# Mount assets directory for JS/CSS files
assets_path = os.path.join(dist_path, "assets")
os.makedirs(assets_path, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# Catch-all to serve index.html for React Router
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(dist_path, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(dist_path, "index.html"))

# ── Uvicorn Runner ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
