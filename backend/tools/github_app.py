"""GitHub App integration; installation tokens are short-lived and never persisted."""
from __future__ import annotations

import time
import re
from typing import Any
from urllib.parse import quote

import httpx
import jwt
from fastapi import HTTPException

from config import GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_SLUG

API_ROOT = "https://api.github.com"


class GitHubAppClient:
    def __init__(self, app_id: str | None = None, private_key: str | None = None, slug: str | None = None):
        self.app_id = app_id if app_id is not None else GITHUB_APP_ID
        self.private_key = private_key if private_key is not None else GITHUB_APP_PRIVATE_KEY
        self.slug = slug if slug is not None else GITHUB_APP_SLUG

    def _require_config(self) -> None:
        if (
            not self.app_id
            or not self.app_id.isdigit()
            or not self.private_key
            or not self.slug
            or not re.fullmatch(r"[A-Za-z0-9-]{1,100}", self.slug)
        ):
            raise HTTPException(status_code=503, detail="GitHub App integration is not configured.")

    def app_jwt(self) -> str:
        self._require_config()
        now = int(time.time())
        try:
            return jwt.encode(
                {"iat": now - 30, "exp": now + 8 * 60, "iss": self.app_id},
                self.private_key,
                algorithm="RS256",
                headers={"typ": "JWT"},
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="GitHub App credentials are invalid.") from exc

    async def _request(
        self,
        method: str,
        path: str,
        token: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
    ) -> Any:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0), follow_redirects=False) as client:
                response = await client.request(
                    method, f"{API_ROOT}{path}", headers=headers, json=json_body, params=params
                )
            if response.status_code >= 400:
                if response.status_code in (401, 403):
                    raise HTTPException(status_code=502, detail="GitHub rejected the configured installation permissions.")
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="GitHub resource was not found or is not accessible.")
                if response.status_code == 422:
                    raise HTTPException(status_code=409, detail="GitHub rejected this remediation request.")
                if response.status_code == 429:
                    raise HTTPException(status_code=503, detail="GitHub rate limit reached; retry later.")
                raise HTTPException(status_code=502, detail="GitHub request failed.")
            return response.json() if response.content else {}
        except HTTPException:
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise HTTPException(status_code=503, detail="GitHub is temporarily unavailable.") from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="GitHub request could not be completed.") from exc

    async def verify_installation(self, installation_id: str) -> dict[str, str]:
        if not installation_id.isdigit() or len(installation_id) > 20:
            raise HTTPException(status_code=422, detail="Invalid GitHub installation identifier.")
        data = await self._request(
            "GET", f"/app/installations/{quote(installation_id, safe='')}", self.app_jwt()
        )
        if str(data.get("id")) != installation_id or not isinstance(data.get("account"), dict):
            raise HTTPException(status_code=502, detail="GitHub returned invalid installation metadata.")
        account = data["account"]
        login = account.get("login")
        account_type = account.get("type")
        if not isinstance(login, str) or account_type not in ("User", "Organization"):
            raise HTTPException(status_code=502, detail="GitHub returned invalid installation metadata.")
        return {"account_login": login, "account_type": account_type}

    async def installation_token(
        self,
        installation_id: str,
        repository_ids: list[int] | None = None,
        permissions: dict[str, str] | None = None,
    ) -> str:
        if not installation_id.isdigit() or len(installation_id) > 20:
            raise HTTPException(status_code=422, detail="Invalid GitHub installation identifier.")
        if repository_ids is not None and (
            len(repository_ids) != 1 or any(type(repo_id) is not int or repo_id <= 0 for repo_id in repository_ids)
        ):
            raise HTTPException(status_code=422, detail="Invalid GitHub repository scope.")
        payload = {"repository_ids": repository_ids} if repository_ids is not None else {}
        if permissions is not None:
            allowed = {"metadata": {"read"}, "contents": {"read", "write"}, "pull_requests": {"read", "write"}}
            if not permissions or any(key not in allowed or value not in allowed[key] for key, value in permissions.items()):
                raise HTTPException(status_code=422, detail="Invalid GitHub permission scope.")
            payload["permissions"] = permissions
        data = await self._request(
            "POST",
            f"/app/installations/{quote(installation_id, safe='')}/access_tokens",
            self.app_jwt(),
            json_body=payload,
        )
        token = data.get("token")
        if not isinstance(token, str) or not token:
            raise HTTPException(status_code=502, detail="GitHub did not issue an installation token.")
        return token

    async def installation_repositories(self, token: str) -> list[dict[str, Any]]:
        repositories: list[dict[str, Any]] = []
        for page in range(1, 11):
            data = await self._request(
                "GET", "/installation/repositories", token,
                params={"per_page": "100", "page": str(page)},
            )
            batch = data.get("repositories", [])
            if not isinstance(batch, list):
                raise HTTPException(status_code=502, detail="GitHub returned an invalid repository list.")
            repositories.extend(batch)
            if len(batch) < 100:
                return repositories
        raise HTTPException(status_code=413, detail="Installation contains too many repositories to validate safely.")

    async def token_for_repository(self, owner_id: str, repo_owner: str, repo_name: str, store) -> str:
        connections = await store.get_repository_connections(owner_id)
        for connection in connections:
            installation_id = connection["installation_id"]
            listing_token = await self.installation_token(
                installation_id, permissions={"metadata": "read"}
            )
            repositories = await self.installation_repositories(listing_token)
            matched = next((
                item for item in repositories
                if str(item.get("full_name", "")).casefold() == f"{repo_owner}/{repo_name}".casefold()
            ), None)
            if matched is not None:
                repository_id = matched.get("id")
                if type(repository_id) is not int or repository_id <= 0:
                    raise HTTPException(status_code=502, detail="GitHub returned invalid repository metadata.")
                return await self.installation_token(
                    installation_id,
                    repository_ids=[repository_id],
                    permissions={"metadata": "read", "contents": "write", "pull_requests": "write"},
                )
        raise HTTPException(status_code=403, detail="No linked GitHub App installation can access this repository.")

    def install_url(self, state: str) -> str:
        self._require_config()
        return f"https://github.com/apps/{quote(self.slug, safe='-')}/installations/new?state={quote(state, safe='')}"
