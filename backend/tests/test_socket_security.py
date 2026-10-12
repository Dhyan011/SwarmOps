from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import jwt
import pytest

import auth
import main
from agents.base import BaseAgent

SECRET = "socket-test-secret-key-at-least-thirty-two-bytes-long"


def access_token(subject="user-a"):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": subject,
            "role": "authenticated",
            "iss": "https://socket-test.supabase.co/auth/v1",
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        SECRET,
        algorithm="HS256",
    )


@pytest.fixture(autouse=True)
def socket_auth_config(monkeypatch):
    monkeypatch.setattr(auth, "SUPABASE_URL", "https://socket-test.supabase.co")
    monkeypatch.setattr(auth, "SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setattr(auth, "SUPABASE_JWT_AUDIENCE", "authenticated")
    main.socket_users.clear()


@pytest.mark.asyncio
async def test_socket_rejects_missing_or_invalid_bearer():
    assert await main.connect("sid-missing", {}, None) is False
    assert await main.connect("sid-invalid", {}, {"token": "not-a-jwt"}) is False
    assert "sid-invalid" not in main.socket_users


@pytest.mark.asyncio
async def test_socket_authenticates_user_and_enters_private_user_room(monkeypatch):
    enter_room = AsyncMock()
    monkeypatch.setattr(main.sio, "enter_room", enter_room)
    accepted = await main.connect("sid-a", {}, {"token": access_token("user-a")})
    assert accepted is True
    assert main.socket_users["sid-a"] == "user-a"
    enter_room.assert_awaited_once_with("sid-a", "user:user-a")
    await main.disconnect("sid-a")
    assert "sid-a" not in main.socket_users


@pytest.mark.asyncio
async def test_socket_subscription_checks_incident_owner(monkeypatch):
    class FakeDB:
        async def get(self, incident_id, owner_id):
            if incident_id == "owned" and owner_id == "user-a":
                return object()
            return None

    enter_room = AsyncMock()
    monkeypatch.setattr(main, "db", FakeDB())
    monkeypatch.setattr(main.sio, "enter_room", enter_room)
    main.socket_users["sid-a"] = "user-a"

    authorized = await main.subscribe_incident("sid-a", {"incident_id": "owned"})
    assert authorized == {"ok": True}
    enter_room.assert_awaited_once_with("sid-a", "incident:owned")

    denied = await main.subscribe_incident("sid-a", {"incident_id": "other-users"})
    assert denied == {"ok": False, "error": "not_found"}
    assert enter_room.await_count == 1


@pytest.mark.asyncio
async def test_base_agent_events_target_only_owner_room():
    class CaptureSocket:
        def __init__(self):
            self.calls = []

        async def emit(self, event, payload, **kwargs):
            self.calls.append((event, payload, kwargs))

    socket = CaptureSocket()
    agent = BaseAgent("TestAgent", "test", "prompt", socket)
    await agent.emit("INC-1", "triage", "completed", "done", owner_id="user-a")
    assert socket.calls[0][0] == "agent_event"
    assert socket.calls[0][2] == {"room": "user:user-a"}

    await agent.emit("INC-1", "triage", "completed", "no owner")
    assert len(socket.calls) == 1
