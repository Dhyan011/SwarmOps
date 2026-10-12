"""Human-confirmed, idempotent GitHub issue creation for contribution proposals."""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

from fastapi import HTTPException

from security_policy import contains_possible_secret
from tools.github_pr import parse_github_repository


async def create_github_issue(
    *,
    target_url: str,
    title: str,
    body: str,
    scan_id: str,
    owner_id: str,
    store,
    app_client,
) -> dict[str, Any]:
    if not re.fullmatch(r"[0-9a-f-]{36}", scan_id):
        raise HTTPException(status_code=422, detail="Invalid contribution identifier.")
    if not isinstance(title, str) or not title.strip() or len(title) > 200:
        raise HTTPException(status_code=422, detail="Invalid GitHub issue title.")
    if not isinstance(body, str) or not body.strip() or len(body) > 8_000:
        raise HTTPException(status_code=422, detail="Invalid GitHub issue description.")
    if contains_possible_secret(title) or contains_possible_secret(body):
        raise HTTPException(status_code=422, detail="Remove credential-like content before publishing public issue text.")

    repo_owner, repo_name = parse_github_repository(target_url)
    permissions = {"metadata": "read", "issues": "write"}
    token = await app_client.token_for_repository(
        owner_id,
        repo_owner,
        repo_name,
        store,
        permission_scope=permissions,
    )
    repository_path = f"/repos/{quote(repo_owner, safe='')}/{quote(repo_name, safe='')}"
    metadata = await app_client._request("GET", repository_path, token)
    if not isinstance(metadata, dict) or str(metadata.get("full_name", "")).casefold() != f"{repo_owner}/{repo_name}".casefold():
        raise HTTPException(status_code=502, detail="GitHub repository identity could not be verified.")

    marker = f"<!-- swarmops-contribution:{scan_id} -->"
    for page in range(1, 11):
        issues = await app_client._request(
            "GET",
            f"{repository_path}/issues",
            token,
            params={"state": "all", "per_page": "100", "page": str(page), "sort": "created", "direction": "desc"},
        )
        if not isinstance(issues, list):
            raise HTTPException(status_code=502, detail="GitHub returned an invalid issue list.")
        for issue in issues:
            if not isinstance(issue, dict) or "pull_request" in issue:
                continue
            if marker in str(issue.get("body") or ""):
                return _verified_issue(issue, repo_owner, repo_name, created=False)
        if len(issues) < 100:
            break
    else:
        raise HTTPException(status_code=413, detail="Unable to safely check for an existing contribution issue.")

    payload = {"title": title.strip(), "body": f"{body.rstrip()}\n\n{marker}"}
    issue = await app_client._request("POST", f"{repository_path}/issues", token, json_body=payload)
    return _verified_issue(issue, repo_owner, repo_name, created=True)


def _verified_issue(issue: Any, owner: str, repo: str, *, created: bool) -> dict[str, Any]:
    if not isinstance(issue, dict):
        raise HTTPException(status_code=502, detail="GitHub returned invalid issue metadata.")
    number = issue.get("number")
    url = issue.get("html_url")
    expected_prefix = f"https://github.com/{owner}/{repo}/issues/"
    if (
        type(number) is not int
        or number <= 0
        or not isinstance(url, str)
        or not re.fullmatch(re.escape(expected_prefix) + r"[1-9][0-9]*", url, flags=re.IGNORECASE)
        or int(url.rsplit("/", 1)[-1]) != number
        or "pull_request" in issue
    ):
        raise HTTPException(status_code=502, detail="GitHub did not confirm a valid issue in the target repository.")
    return {"number": number, "url": url, "title": str(issue.get("title", "")), "created": created}
