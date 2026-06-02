"""
SwarmOps — FastAPI Entry Point
Autonomous incident response system powered by Microsoft AutoGen & OpenRouter.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

# ── App Initialisation ──
app = FastAPI(
    title="SwarmOps",
    description="Autonomous incident response orchestration via multi-agent swarms.",
    version="0.1.0",
)

# ── CORS (allow frontend in dev) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──
@app.get("/health", tags=["system"])
async def health_check():
    """Lightweight liveness probe."""
    return {"status": "alive", "service": "SwarmOps"}


# ── Uvicorn Runner ──
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
