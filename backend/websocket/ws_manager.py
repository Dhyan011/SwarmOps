import socketio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Configure Socket.IO Server
# cors_allowed_origins='*' is for local dev
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

class WebSocketManager:
    async def broadcast(self, event_type: str, agent: str, payload: dict):
        """Broadcasts an event to all connected Socket.IO clients."""
        message = {
            "event": event_type,
            "agent": agent,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "payload": payload
        }
        await sio.emit("agent_event", message)

ws_manager = WebSocketManager()

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
