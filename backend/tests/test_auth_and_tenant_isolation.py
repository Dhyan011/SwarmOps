from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

import auth
import main
from auth import Principal, get_current_user
from models.schemas import AgentFinding, IncidentReport

SECRET = "test-only-signing-key-that-is-long-enough-for-hmac"
ISSUER = "https://unit-test.supabase.co/auth/v1"
AUDIENCE = "authenticated"


def make_token(**overrides):
    now = datetime.now(timezone.utc)
    claims = {
        "sub": "user-a",
        "role": "authenticated",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    claims.update(overrides)
    return jwt.encode(claims, SECRET, algorithm="HS256")


@pytest.fixture(autouse=True)
def jwt_config(monkeypatch):
    monkeypatch.setattr(auth, "SUPABASE_URL", "https://unit-test.supabase.co")
    monkeypatch.setattr(auth, "SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setattr(auth, "SUPABASE_JWT_AUDIENCE", AUDIENCE)


def sample_report(incident_id, owner_id):
    return IncidentReport(
        incident_id=incident_id,
        owner_id=owner_id,
        description=f"incident for {owner_id}",
        service="api",
        severity="high",
        status="resolved",
        created_at=datetime.now(timezone.utc).isoformat(),
        phases=[],
        agent_findings=[],
        root_cause="test cause",
        confidence=80,
        recommended_fix="review manually",
        code_patch="",
        validation_result="needs_review",
        resolution_time_ms=1,
    )


def test_supabase_jwt_validates_and_returns_subject():
    claims = auth._decode_access_token(make_token())
    assert claims["sub"] == "user-a"


@pytest.mark.parametrize(
    "claims",
    [
        {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        {"iss": "https://attacker.invalid/auth/v1"},
        {"aud": "other-service"},
        {"role": "service_role"},
        {"sub": ""},
    ],
)
def test_supabase_jwt_rejects_expired_or_wrong_claims(claims):
    with pytest.raises(Exception):
        auth._decode_access_token(make_token(**claims))


def test_supabase_jwt_rejects_invalid_signature():
    bad_token = jwt.encode(
        {
            "sub": "user-a",
            "role": "authenticated",
            "iss": ISSUER,
            "aud": AUDIENCE,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "incorrect-signing-secret-that-is-at-least-32-bytes-long",
        algorithm="HS256",
    )
    with pytest.raises(Exception):
        auth._decode_access_token(bad_token)


def test_missing_bearer_token_is_401():
    client = TestClient(main.app)
    response = client.get("/api/v1/incidents")
    assert response.status_code == 401


def test_cross_user_incident_read_and_listing_are_isolated(monkeypatch):
    class InMemoryDB:
        incidents = {
            "own": sample_report("own", "user-a"),
            "other": sample_report("other", "user-b"),
        }

        def get_all(self, owner_id=None):
            return [r for r in self.incidents.values() if r.owner_id == owner_id]

        def get(self, incident_id, owner_id=None):
            item = self.incidents.get(incident_id)
            return item if item and item.owner_id == owner_id else None

    monkeypatch.setattr(main, "db", InMemoryDB())
    main.app.dependency_overrides[get_current_user] = lambda: Principal(
        user_id="user-a", claims={"sub": "user-a", "role": "authenticated"}
    )
    try:
        client = TestClient(main.app)
        listed = client.get("/api/v1/incidents")
        assert listed.status_code == 200
        assert [row["incident_id"] for row in listed.json()] == ["own"]

        own = client.get("/api/v1/incidents/own")
        assert own.status_code == 200
        assert own.json()["incident_id"] == "own"

        cross_user = client.get("/api/v1/incidents/other")
        assert cross_user.status_code == 404

        cross_user_action = client.post(
            "/api/v1/incidents/other/action", json={"action": "reject"}
        )
        assert cross_user_action.status_code == 404
    finally:
        main.app.dependency_overrides.pop(get_current_user, None)
