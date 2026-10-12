"""
SwarmOps — FastAPI Entry Point
Multi-agent incident response using authenticated users' own configured AI providers.
"""

from fastapi import FastAPI, HTTPException, Request, Depends, Query
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import socketio

from config import (
    ALLOWED_ORIGINS,
    APP_STATE_SECRET,
    PUBLIC_BASE_URL,
    MAX_CONCURRENT_INVESTIGATIONS,
    INVESTIGATION_QUEUE_WAIT_SECONDS,
    INVESTIGATION_TIMEOUT_SECONDS,
)
from models.schemas import (
    ContributionPublishRequest,
    ContributionScanOutput,
    ContributionScanRequest,
    IncidentCreate,
    IncidentReport,
    ProviderConfigRequest,
    ProviderKeyRequest,
    ProviderTestRequest,
)
from agents.orchestrator import Orchestrator
from agents.contribution_scanner import ContributionScanner
from db import db

from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import BaseModel
from typing import Literal
from auth import Principal, get_current_user, _decode_access_token
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from tools.github_app import GitHubAppClient
from tools.github_fetcher import fetch_github_repository_snapshot
from tools.github_issue import create_github_issue
from tools.github_pr import apply_file_patch, create_github_pr, parse_github_repository, parse_unified_diff
from security_policy import PolicyResult, contains_possible_secret, evaluate_patch
from tools.byok import PROVIDERS, decrypt_provider_key, encrypt_provider_key, list_models, test_completion, validate_encryption_key

# ── App Initialisation ──
@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        yield
    finally:
        await db.close()


app = FastAPI(
    title="SwarmOps",
    description="Autonomous incident response orchestration via multi-agent swarms.",
    version="0.2.0",
    lifespan=lifespan,
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
max_concurrent_investigations = asyncio.Semaphore(MAX_CONCURRENT_INVESTIGATIONS)


async def run_limited_investigation(incident: IncidentCreate, provider_config: dict[str, str], owner_id: str):
    try:
        await asyncio.wait_for(
            max_concurrent_investigations.acquire(), timeout=INVESTIGATION_QUEUE_WAIT_SECONDS
        )
    except asyncio.TimeoutError as exc:
        retry_after = max(1, int(INVESTIGATION_QUEUE_WAIT_SECONDS))
        raise HTTPException(
            status_code=429,
            detail="Investigation capacity is busy. Retry after the indicated delay.",
            headers={"Retry-After": str(retry_after)},
        ) from exc

    try:
        return await asyncio.wait_for(
            orchestrator.investigate(incident, provider_config=provider_config, owner_id=owner_id),
            timeout=INVESTIGATION_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Investigation exceeded the configured execution deadline.") from exc
    finally:
        max_concurrent_investigations.release()


def validate_contribution_patch(
    patch: str,
    source_files: dict[str, str],
    allowed_paths: set[str] | None = None,
) -> PolicyResult:
    """Require an allowed diff to apply cleanly to the exact source snapshot."""
    policy = evaluate_patch(patch)
    if policy.state != "passed":
        return policy
    try:
        file_patches = parse_unified_diff(patch)
        paths = {file_patch.path for file_patch in file_patches}
        if allowed_paths is not None and paths != allowed_paths:
            return PolicyResult("needs_manual_review", ("proposal_paths_do_not_match_patch",), tuple(sorted(paths)), False)
        for file_patch in file_patches:
            original = source_files.get(file_patch.path)
            if not isinstance(original, str):
                return PolicyResult("needs_manual_review", ("patch_target_not_in_scanned_snapshot",), tuple(sorted(paths)), False)
            updated = apply_file_patch(original, file_patch)
            if updated == original:
                return PolicyResult("needs_manual_review", ("patch_has_no_effect",), tuple(sorted(paths)), False)
    except (TypeError, ValueError):
        return PolicyResult("needs_manual_review", ("patch_does_not_apply_to_scanned_snapshot",), (), False)
    return policy


async def require_user_provider(owner_id: str) -> dict[str, str]:
    """Load only this authenticated owner's BYOK credential; never fall back."""
    row = await db.get_ai_provider_credential(owner_id)
    if row is None:
        raise HTTPException(status_code=428, detail="Configure your own AI provider in Settings before using AI features.")
    return {
        "provider": row["provider"],
        "model": row["model"],
        "api_key": decrypt_provider_key(row["encrypted_key"], owner_id),
    }


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
    }

@app.get("/ready", tags=["system"])
async def readiness_check():
    """Readiness probe verifies database connectivity without exposing details."""
    try:
        await db.health()
        validate_encryption_key()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database or encrypted provider-key storage is not ready.") from exc
    return {"status": "ready"}


@app.get("/api/v1/ai/providers", tags=["ai-settings"])
async def list_ai_providers(user: Principal = Depends(get_current_user)):
    return [{"id": provider, "name": details["label"]} for provider, details in PROVIDERS.items()]


@app.get("/api/v1/ai/config", tags=["ai-settings"])
async def get_ai_config(user: Principal = Depends(get_current_user)):
    row = await db.get_ai_provider_credential(user.user_id)
    if not row:
        return {"configured": False, "provider": None, "model": None}
    # Never return ciphertext, plaintext, key fragments, or a reversible key hint.
    return {"configured": True, "provider": row["provider"], "model": row["model"]}


@app.post("/api/v1/ai/models", tags=["ai-settings"])
async def get_ai_models(payload: ProviderKeyRequest, user: Principal = Depends(get_current_user)):
    api_key = payload.api_key.get_secret_value().strip()
    if not api_key:
        raise HTTPException(status_code=422, detail="Enter a valid provider API key.")
    return {"models": await list_models(payload.provider, api_key)}


@app.post("/api/v1/ai/test", tags=["ai-settings"])
async def test_ai_provider(payload: ProviderTestRequest, user: Principal = Depends(get_current_user)):
    api_key = payload.api_key.get_secret_value().strip()
    if not api_key:
        raise HTTPException(status_code=422, detail="Enter a valid provider API key.")
    models = await list_models(payload.provider, api_key)
    if payload.model not in {entry["id"] for entry in models}:
        raise HTTPException(status_code=422, detail="Select a model returned by the selected provider.")
    await test_completion(payload.provider, api_key, payload.model)
    return {"tested": True, "provider": payload.provider, "model": payload.model}


@app.put("/api/v1/ai/config", tags=["ai-settings"])
async def save_ai_config(payload: ProviderConfigRequest, user: Principal = Depends(get_current_user)):
    api_key = payload.api_key.get_secret_value().strip()
    if not api_key:
        raise HTTPException(status_code=422, detail="Enter a valid provider API key.")
    encrypted_key = encrypt_provider_key(api_key, user.user_id)
    models = await list_models(payload.provider, api_key)
    if payload.model not in {entry["id"] for entry in models}:
        raise HTTPException(status_code=422, detail="Select a model returned by the selected provider.")
    # Persist only after a real provider completion succeeded; never save rejected credentials.
    await test_completion(payload.provider, api_key, payload.model)
    await db.save_ai_provider_credential(
        owner_id=user.user_id,
        provider=payload.provider,
        model=payload.model,
        encrypted_key=encrypted_key,
    )
    return {"configured": True, "provider": payload.provider, "model": payload.model}


@app.delete("/api/v1/ai/config", tags=["ai-settings"])
async def delete_ai_config(user: Principal = Depends(get_current_user)):
    removed = await db.delete_ai_provider_credential(user.user_id)
    return {"configured": False, "removed": removed}


@app.post("/api/v1/github/install-url", tags=["integrations"])
async def github_install_url(user: Principal = Depends(get_current_user)):
    if len(APP_STATE_SECRET) < 32:
        raise HTTPException(status_code=503, detail="GitHub installation flow is not configured.")
    state = URLSafeTimedSerializer(APP_STATE_SECRET, salt="swarmops-github-install").dumps(
        {"sub": user.user_id}
    )
    return {"url": GitHubAppClient().install_url(state)}


@app.get("/api/v1/github/installation/callback", tags=["integrations"])
async def github_install_callback(
    installation_id: str,
    setup_action: str,
    state: str,
):
    if len(APP_STATE_SECRET) < 32 or setup_action != "install":
        raise HTTPException(status_code=400, detail="Invalid GitHub installation callback.")
    try:
        payload = URLSafeTimedSerializer(APP_STATE_SECRET, salt="swarmops-github-install").loads(
            state, max_age=600
        )
    except SignatureExpired as exc:
        raise HTTPException(status_code=400, detail="GitHub installation state expired.") from exc
    except BadSignature as exc:
        raise HTTPException(status_code=400, detail="Invalid GitHub installation state.") from exc
    owner_id = payload.get("sub") if isinstance(payload, dict) else None
    if not isinstance(owner_id, str) or not owner_id:
        raise HTTPException(status_code=400, detail="Invalid GitHub installation state.")
    installation = await GitHubAppClient().verify_installation(installation_id)
    await db.save_repository_connection(
        owner_id=owner_id,
        installation_id=installation_id,
        account_login=installation["account_login"],
        account_type=installation["account_type"],
    )
    if PUBLIC_BASE_URL:
        return RedirectResponse(f"{PUBLIC_BASE_URL}/login?github_connected=1", status_code=303)
    return {"status": "installed", "account_login": installation["account_login"]}


@app.get("/api/v1/github/installations", tags=["integrations"])
async def list_github_installations(user: Principal = Depends(get_current_user)):
    return await db.get_repository_connections(user.user_id)


@app.delete("/api/v1/github/installations/{installation_id}", tags=["integrations"])
async def remove_github_installation(
    installation_id: str,
    user: Principal = Depends(get_current_user),
):
    removed = await db.remove_repository_connection(user.user_id, installation_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Installation not found.")
    return {"status": "removed"}


@app.post("/api/v1/contributions/scan", tags=["contributions"])
@limiter.limit("3/hour")
async def scan_public_repository(
    request: Request,
    payload: ContributionScanRequest,
    user: Principal = Depends(get_current_user),
):
    """Analyze public GitHub source pinned to one SHA; no write permission is used here."""
    provider_config = await require_user_provider(user.user_id)
    repo_owner, repo_name = parse_github_repository(payload.repository_url)
    canonical_url = f"https://github.com/{repo_owner}/{repo_name}"
    scan_id = str(uuid4())
    try:
        snapshot = await fetch_github_repository_snapshot(canonical_url)
        raw = await ContributionScanner(sio).scan({
            "provider_config": provider_config,
            "owner_id": user.user_id,
            "incident_id": scan_id,
            "phase": "contribution_scan",
            "repository": snapshot["repository"],
            "default_branch": snapshot["default_branch"],
            "source_sha": snapshot["source_sha"],
            "repository_context": snapshot["context"],
        })
        output = ContributionScanOutput.model_validate({key: value for key, value in raw.items() if not key.startswith("_")})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The public repository could not be scanned safely.") from exc

    candidate_data = output.candidate.model_dump(mode="json") if output.candidate else None
    status = "no_safe_candidate"
    summary = output.summary
    if candidate_data is not None:
        public_text = "\n".join([
            candidate_data["issue_title"], candidate_data["issue_body"],
            candidate_data["pull_request_title"], candidate_data["pull_request_body"],
            candidate_data["summary"], candidate_data["patch"],
            "\n".join(candidate_data["test_plan"]),
        ])
        if contains_possible_secret(public_text):
            candidate_data = None
            summary = "A credential-like pattern was detected in the generated proposal, so no proposal was saved for publication."
        else:
            policy = validate_contribution_patch(
                candidate_data["patch"],
                snapshot["source_files"],
                set(candidate_data["affected_files"]),
            )
            candidate_data["patch_policy_state"] = policy.state
            candidate_data["policy_findings"] = list(policy.findings)
            candidate_data["publication_allowed"] = policy.state == "passed" and candidate_data["confidence"] >= 80
            status = "ready" if candidate_data["publication_allowed"] else "review_required"

    result_json = {
        "status": status,
        "summary": summary,
        "repository": snapshot["repository"],
        "target_url": snapshot["target_url"],
        "default_branch": snapshot["default_branch"],
        "source_sha": snapshot["source_sha"],
        "source_url": snapshot["source_url"],
        "included_files": snapshot["included_files"],
        "redactions": snapshot["redactions"],
        "candidate": candidate_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.save_contribution_scan(
        scan_id=scan_id,
        owner_id=user.user_id,
        repository=str(snapshot["repository"]),
        target_url=str(snapshot["target_url"]),
        default_branch=str(snapshot["default_branch"]),
        source_sha=str(snapshot["source_sha"]),
        result_json=result_json,
    )
    return {"scan_id": scan_id, "status": status, "result": result_json}


@app.get("/api/v1/contributions/{scan_id}", tags=["contributions"])
async def get_contribution_scan(scan_id: str, user: Principal = Depends(get_current_user)):
    try:
        UUID(scan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Contribution scan not found.") from exc
    scan = await db.get_contribution_scan(scan_id, user.user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Contribution scan not found.")
    return scan


@app.post("/api/v1/contributions/{scan_id}/publish", tags=["contributions"])
@limiter.limit("5/minute")
async def publish_contribution(
    request: Request,
    scan_id: str,
    payload: ContributionPublishRequest,
    user: Principal = Depends(get_current_user),
):
    """After explicit reviewer confirmation, create one repository-scoped PR and issue."""
    if not user.has_any_role({"security_reviewer", "administrator"}):
        raise HTTPException(status_code=403, detail="A security reviewer or administrator role is required to publish contributions.")
    if payload.confirmed is not True:
        raise HTTPException(status_code=400, detail="Explicit publication confirmation is required.")
    try:
        UUID(scan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Contribution scan not found.") from exc
    scan = await db.get_contribution_scan(scan_id, user.user_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Contribution scan not found.")
    if scan["status"] == "published":
        return {"status": "published", **scan["result"].get("publication", {})}

    result_json = dict(scan["result"])
    candidate = result_json.get("candidate")
    if not isinstance(candidate, dict) or candidate.get("publication_allowed") is not True:
        raise HTTPException(status_code=409, detail="This scan has no policy-cleared proposal eligible for publication.")
    payload_data = payload.model_dump(mode="json")
    public_text = "\n".join([
        payload.issue_title, payload.issue_body, payload.pull_request_title,
        payload.pull_request_body, payload.patch,
    ])
    if contains_possible_secret(public_text):
        raise HTTPException(status_code=422, detail="Remove credential-like content from the public issue and pull-request text.")

    try:
        snapshot = await fetch_github_repository_snapshot(scan["target_url"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The scanned repository revision could not be re-verified.") from exc
    if snapshot["source_sha"].casefold() != scan["source_sha"].casefold():
        raise HTTPException(status_code=409, detail="The repository default branch changed after this scan. Rescan before publishing.")
    policy = validate_contribution_patch(
        payload.patch,
        snapshot["source_files"],
        set(candidate.get("affected_files", [])),
    )
    if policy.state != "passed":
        raise HTTPException(status_code=409, detail="The edited patch no longer passes source-context and deterministic policy checks.")

    publication = dict(result_json.get("publication") or {})
    if publication.get("request") is not None and publication["request"] != payload_data:
        raise HTTPException(status_code=409, detail="A partial publication must be retried with the same confirmed payload. Start a new scan to change it.")
    if publication.get("pull_request") and publication.get("request") is None:
        raise HTTPException(status_code=409, detail="The prior publication state cannot be safely resumed. Start a new scan.")

    await db.claim_contribution_publication(scan_id=scan_id, owner_id=user.user_id)
    await db.append_audit_event(
        incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
        action="github_contribution_publish", outcome="started", correlation_id=scan_id,
        detail="Reviewer confirmed publication of a repository contribution.",
    )
    publication["request"] = payload_data
    publication["status"] = "publishing"
    result_json["publication"] = publication
    await db.update_contribution_scan(scan_id=scan_id, owner_id=user.user_id, status="publishing", result_json=result_json)

    try:
        pull_request = publication.get("pull_request")
        if not isinstance(pull_request, dict):
            pull_request = await create_github_pr(
                target_url=scan["target_url"],
                target_branch=scan["default_branch"],
                patch_content=payload.patch,
                incident_id=f"{scan_id}",
                title=payload.pull_request_title,
                description=payload.pull_request_body,
                owner_id=user.user_id,
                store=db,
                expected_base_sha=scan["source_sha"],
                branch_prefix="swarmops-contribution",
            )
            publication["pull_request"] = pull_request
            result_json["publication"] = publication
            await db.update_contribution_scan(scan_id=scan_id, owner_id=user.user_id, status="publishing", result_json=result_json)

        issue = await create_github_issue(
            target_url=scan["target_url"],
            title=payload.issue_title,
            body=payload.issue_body,
            scan_id=scan_id,
            owner_id=user.user_id,
            store=db,
            app_client=GitHubAppClient(),
        )
        publication["issue"] = issue
        publication["status"] = "published"
        publication.pop("issue_error", None)
        result_json["publication"] = publication
        result_json["status"] = "published"
        await db.update_contribution_scan(scan_id=scan_id, owner_id=user.user_id, status="published", result_json=result_json)
        await db.append_audit_event(
            incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
            action="github_contribution_publish", outcome="published", correlation_id=scan_id,
            detail="GitHub confirmed a pull request and issue for the contribution.",
        )
        return {"status": "published", "issue": issue, "pull_request": pull_request, "source_sha": scan["source_sha"]}
    except HTTPException as exc:
        if publication.get("pull_request"):
            publication["status"] = "pr_created_issue_failed"
            publication["issue_error"] = str(exc.detail)
            result_json["publication"] = publication
            result_json["status"] = "pr_created_issue_failed"
            await db.update_contribution_scan(
                scan_id=scan_id, owner_id=user.user_id, status="pr_created_issue_failed", result_json=result_json
            )
            await db.append_audit_event(
                incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
                action="github_contribution_publish", outcome="partial", correlation_id=scan_id,
                detail="Pull request exists; issue creation needs retry.",
            )
            return JSONResponse(
                status_code=207,
                content={
                    "status": "pr_created_issue_failed",
                    "message": "The pull request exists, but GitHub did not confirm issue creation. Retry with the same payload after resolving the issue permission or repository setting.",
                    "issue_error": str(exc.detail),
                    "pull_request": publication["pull_request"],
                    "issue": None,
                    "source_sha": scan["source_sha"],
                },
            )
        result_json["publication"] = {"status": "failed", "error": str(exc.detail)}
        result_json["status"] = "ready"
        await db.update_contribution_scan(scan_id=scan_id, owner_id=user.user_id, status="ready", result_json=result_json)
        await db.append_audit_event(
            incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
            action="github_contribution_publish", outcome="failed", correlation_id=scan_id,
            detail="GitHub did not confirm a pull request.",
        )
        raise
    except Exception as exc:
        # Keep the persisted workflow retryable and never turn an unhandled provider
        # failure into a success-looking or permanently locked state.
        if publication.get("pull_request"):
            publication["status"] = "pr_created_issue_failed"
            publication["issue_error"] = "GitHub did not confirm issue creation. Inspect the repository before retrying."
            result_json["publication"] = publication
            result_json["status"] = "pr_created_issue_failed"
            await db.update_contribution_scan(
                scan_id=scan_id, owner_id=user.user_id, status="pr_created_issue_failed", result_json=result_json
            )
            await db.append_audit_event(
                incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
                action="github_contribution_publish", outcome="partial", correlation_id=scan_id,
                detail="Pull request exists; issue creation outcome needs verification.",
            )
            return JSONResponse(
                status_code=207,
                content={
                    "status": "pr_created_issue_failed",
                    "message": "The pull request exists, but issue creation was not confirmed. Inspect GitHub before retrying with the same payload.",
                    "issue_error": publication["issue_error"],
                    "pull_request": publication["pull_request"],
                    "issue": None,
                    "source_sha": scan["source_sha"],
                },
            )
        result_json["publication"] = {
            "status": "failed",
            "error": "GitHub did not confirm pull request creation. Inspect the repository before retrying.",
        }
        result_json["status"] = "ready"
        await db.update_contribution_scan(scan_id=scan_id, owner_id=user.user_id, status="ready", result_json=result_json)
        await db.append_audit_event(
            incident_id=f"CONTRIB-{scan_id}", owner_id=user.user_id, actor_id=user.user_id,
            action="github_contribution_publish", outcome="failed", correlation_id=scan_id,
            detail="Unexpected error while verifying the GitHub publication outcome.",
        )
        raise HTTPException(
            status_code=502,
            detail="GitHub did not confirm the pull request. Inspect the repository before retrying.",
        ) from exc


# ── Incident Endpoints ──

@app.post("/api/v1/incident", response_model=IncidentReport, tags=["incidents"])
@limiter.limit("5/minute")
async def create_incident(
    request: Request,
    incident: IncidentCreate,
    user: Principal = Depends(get_current_user),
):
    """
    Triggers the full multi-agent investigation pipeline.
    Streams real-time agent events via Socket.IO while processing.
    Returns the complete IncidentReport once all phases finish.
    """
    provider_config = await require_user_provider(user.user_id)
        
    try:
        report = await run_limited_investigation(incident, provider_config, user.user_id)
        await db.set(report.incident_id, report)
        return report
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Investigation could not be completed.") from exc

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
    action: Literal["approve", "reject"]

@app.post("/api/v1/incidents/{incident_id}/action", tags=["incidents"])
async def handle_incident_action(
    incident_id: str,
    payload: ActionRequest,
    user: Principal = Depends(get_current_user),
):
    report = await db.get(incident_id, owner_id=user.user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if payload.action == "approve" and report.status == "pr_created" and report.pr_url:
        return {"status": report.status, "message": "Pull request already exists.", "pr_url": report.pr_url}
    if payload.action == "approve" and (
        report.status != "awaiting_review"
        or report.validation_state != "validation_passed"
        or report.policy_state != "passed"
    ):
        raise HTTPException(status_code=409, detail="Remediation is not eligible for approval.")

    if payload.action == "approve":
        if not user.has_any_role({"security_reviewer", "administrator"}):
            raise HTTPException(status_code=403, detail="A security reviewer role is required to approve remediation.")
        if report.status == "pr_created" and report.pr_url:
            return {"status": report.status, "message": "Pull request already exists.", "pr_url": report.pr_url}
        if not report.target_url or not report.code_patch:
            raise HTTPException(status_code=409, detail="Incident is missing a repository target or code patch.")
        from tools.github_pr import create_github_pr
        await db.claim_pr_creation(
            incident_id=incident_id, owner_id=user.user_id, actor_id=user.user_id, report=report
        )
        try:
            result = await create_github_pr(
                target_url=report.target_url,
                target_branch=report.target_branch,
                patch_content=report.code_patch,
                incident_id=incident_id,
                title=report.pr_title or f"SwarmOps remediation: {report.description[:150]}",
                description=report.pr_body or report.root_cause,
                owner_id=report.owner_id,
                store=db,
            )
        except HTTPException as exc:
            report.status = "awaiting_review"
            report.pr_action_started_at = ""
            await db.set(incident_id, report)
            await db.append_audit_event(
                incident_id=incident_id, owner_id=user.user_id, actor_id=user.user_id,
                action="github_pr_create", outcome="failed", detail=str(exc.detail),
            )
            raise
        except Exception as exc:
            report.status = "awaiting_review"
            report.pr_action_started_at = ""
            await db.set(incident_id, report)
            await db.append_audit_event(
                incident_id=incident_id, owner_id=user.user_id, actor_id=user.user_id,
                action="github_pr_create", outcome="failed", detail=type(exc).__name__,
            )
            raise HTTPException(status_code=502, detail="Pull request creation failed.") from exc
        report.status = "pr_created"
        report.pr_action_started_at = ""
        report.pr_url = str(result["url"])
        report.pr_number = int(result["number"])
        await db.set(incident_id, report)
        await db.append_audit_event(
            incident_id=incident_id, owner_id=user.user_id, actor_id=user.user_id,
            action="github_pr_create", outcome="success", detail=report.pr_url,
        )
        message = "Pull request created and verified."
        await sio.emit("agent_event", {
            "incident_id": incident_id, "agent": "System", "phase": "action",
            "status": "completed", "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(), "findings": "",
        }, room=user_room(user.user_id))
    elif payload.action == "reject":
        if report.status not in {"awaiting_review", "needs_review"}:
            raise HTTPException(status_code=409, detail="Incident is not awaiting review.")
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
        await db.set(incident_id, report)
        await db.append_audit_event(
            incident_id=incident_id, owner_id=user.user_id, actor_id=user.user_id,
            action="remediation_reject", outcome="success", detail="Rejected by reviewer.",
        )
    return {"status": report.status, "message": message, "pr_url": report.pr_url}

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
