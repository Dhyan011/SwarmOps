"""
SwarmOps — FastAPI Entry Point
Production multi-agent incident response system powered by OpenRouter LLMs.
"""

from fastapi import FastAPI, HTTPException, Header, Request, Depends, Query
import os
import asyncio
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import socketio

from config import OPENROUTER_API_KEY, ALLOWED_ORIGINS
from models.schemas import IncidentCreate, IncidentReport
from agents.orchestrator import Orchestrator
from db import db

from datetime import datetime, timezone
from pydantic import BaseModel
from auth import Principal, get_current_user, _decode_access_token

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
    allow_origins=ALLOWED_ORIGINS,
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
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=ALLOWED_ORIGINS)
socket_app = socketio.ASGIApp(sio, app)
socket_users: dict[str, str] = {}


def user_room(user_id: str) -> str:
    return f"user:{user_id}"


def incident_room(incident_id: str) -> str:
    return f"incident:{incident_id}"

# ── Orchestrator (created once, shared across requests) ──
orchestrator = Orchestrator(sio)

# ── Concurrency Limit ──
max_concurrent_investigations = asyncio.Semaphore(3)

# ── Socket.IO events ──
@sio.event
async def connect(sid, environ, auth_payload=None):
    token = auth_payload.get("token") if isinstance(auth_payload, dict) else None
    if not token:
        authorization = environ.get("HTTP_AUTHORIZATION", "")
        scheme, separator, value = authorization.partition(" ")
        if separator and scheme.lower() == "bearer":
            token = value.strip()
    if not token:
        return False
    try:
        claims = await asyncio.to_thread(_decode_access_token, token)
    except Exception:
        return False
    user_id = claims["sub"]
    socket_users[sid] = user_id
    await sio.enter_room(sid, user_room(user_id))
    return True


@sio.on("subscribe_incident")
async def subscribe_incident(sid, payload):
    user_id = socket_users.get(sid)
    incident_id = payload.get("incident_id") if isinstance(payload, dict) else None
    if not user_id or not isinstance(incident_id, str) or not incident_id.strip():
        return {"ok": False, "error": "unauthorized"}
    report = await db.get(incident_id, owner_id=user_id)
    if report is None:
        return {"ok": False, "error": "not_found"}
    await sio.enter_room(sid, incident_room(incident_id))
    return {"ok": True}

@sio.event
async def disconnect(sid):
    socket_users.pop(sid, None)

# ── Health Check ──
@app.get("/health", tags=["system"])
async def health_check():
    """Lightweight liveness probe."""
    return {
        "status": "alive",
        "service": "SwarmOps",
        "llm_configured": bool(OPENROUTER_API_KEY),
    }

@app.get("/ready", tags=["system"])
async def readiness_check():
    """Readiness probe verifies database connectivity without exposing details."""
    try:
        await db.health()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is not ready.") from exc
    return {"status": "ready"}

# ── Incident Endpoints ──

@app.post("/api/v1/incident", response_model=IncidentReport, tags=["incidents"])
@limiter.limit("5/minute")
async def create_incident(
    request: Request,
    incident: IncidentCreate,
    user: Principal = Depends(get_current_user),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """
    Triggers the full multi-agent investigation pipeline.
    Streams real-time agent events via Socket.IO while processing.
    Returns the complete IncidentReport once all phases finish.
    """
    provider_key = x_api_key or OPENROUTER_API_KEY
    if not provider_key:
        raise HTTPException(status_code=503, detail="LLM provider credentials are not configured.")
        
    try:
        async with max_concurrent_investigations:
            report = await orchestrator.investigate(
                incident, api_key=provider_key, owner_id=user.user_id
            )
            # Save to persistent database
            await db.set(report.incident_id, report)
            return report
    except asyncio.TimeoutError:
         raise HTTPException(status_code=429, detail="Too many concurrent investigations. Please try again later.")

@app.get("/api/v1/incidents", tags=["incidents"])
async def list_incidents(
    user: Principal = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Returns all stored incidents from the persistent database."""
    return await db.get_all(owner_id=user.user_id, limit=limit, offset=offset)

@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentReport, tags=["incidents"])
async def get_incident(incident_id: str, user: Principal = Depends(get_current_user)):
    """Returns a specific incident by ID."""
    report = await db.get(incident_id, owner_id=user.user_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return report

class ActionRequest(BaseModel):
    action: str

@app.post("/api/v1/incidents/{incident_id}/action", tags=["incidents"])
async def handle_incident_action(
    incident_id: str,
    payload: ActionRequest,
    user: Principal = Depends(get_current_user),
):
    report = await db.get(incident_id, owner_id=user.user_id)
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
            sio=sio,
            owner_id=report.owner_id,
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
        }, room=user_room(user.user_id))
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    # Update persistent database
    await db.set(incident_id, report)
    return {"status": report.status, "message": message}

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
