"""Apply validated unified diffs through a user's GitHub App installation.

No shared personal token, simulated success, arbitrary path, or raw patch-file PR is used.
"""
from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from urllib.parse import quote, urlsplit

from fastapi import HTTPException

from tools.github_app import GitHubAppClient

MAX_PATCH_BYTES = 1_000_000
MAX_PATCH_FILES = 100
HUNK_HEADER = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$")
OWNER_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})$")
REPO_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,100}$")
BRANCH_PATTERN = re.compile(r"^[A-Za-z0-9._/-]{1,255}$")


@dataclass(frozen=True)
class Hunk:
    old_start: int
    old_count: int
    new_count: int
    lines: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class FilePatch:
    path: str
    hunks: tuple[Hunk, ...]


def _safe_path(path: str) -> str:
    if path.startswith(("/", "\\")) or "\\" in path or "\x00" in path:
        raise ValueError("Unsafe patch path")
    pieces = path.split("/")
    if not path or len(path) > 500 or any(part in ("", ".", "..") for part in pieces):
        raise ValueError("Unsafe patch path")
    if pieces[0].casefold() == ".git":
        raise ValueError("Git metadata cannot be modified")
    return path


def parse_unified_diff(patch: str) -> list[FilePatch]:
    """Parse only ordinary edits to existing text files; reject create/delete/rename/binary."""
    if not isinstance(patch, str) or not patch.strip() or len(patch.encode("utf-8")) > MAX_PATCH_BYTES:
        raise ValueError("Patch is empty or too large")
    lines = patch.splitlines(keepends=True)
    files: list[FilePatch] = []
    seen: set[str] = set()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith(("GIT binary patch", "Binary files ", "rename from ", "rename to ", "new file mode ", "deleted file mode ")):
            raise ValueError("Binary, rename, create, and delete patches are not permitted")
        if line.startswith(("diff --git ", "index ", "similarity index ")):
            i += 1
            continue
        if line.startswith(("diff --git ", "index ", "similarity index ", "--- ", "+++ ")):
            if line.startswith("--- "):
                old_header = line[4:].strip().split("\t", 1)[0]
                i += 1
                if i >= len(lines) or not lines[i].startswith("+++ "):
                    raise ValueError("Malformed unified diff headers")
                new_header = lines[i][4:].strip().split("\t", 1)[0]
                if old_header == "/dev/null" or new_header == "/dev/null":
                    raise ValueError("New or deleted files are not permitted")
                if not old_header.startswith("a/") or not new_header.startswith("b/"):
                    raise ValueError("Unsupported diff paths")
                old_path = _safe_path(old_header[2:])
                new_path = _safe_path(new_header[2:])
                if old_path != new_path or old_path in seen:
                    raise ValueError("Renames and duplicate file patches are not permitted")
                seen.add(old_path)
                i += 1
                hunks: list[Hunk] = []
                while i < len(lines) and lines[i].startswith("@@ "):
                    match = HUNK_HEADER.match(lines[i].rstrip("\r\n"))
                    if not match:
                        raise ValueError("Malformed unified diff hunk")
                    old_start = int(match.group(1))
                    old_count = int(match.group(2) or "1")
                    new_count = int(match.group(4) or "1")
                    i += 1
                    hunk_lines: list[tuple[str, str]] = []
                    consumed_old = consumed_new = 0
                    while i < len(lines) and (consumed_old < old_count or consumed_new < new_count):
                        item = lines[i]
                        if item.startswith("\\ No newline at end of file"):
                            i += 1
                            continue
                        if not item or item[0] not in " +-":
                            raise ValueError("Malformed unified diff content")
                        marker, content = item[0], item[1:]
                        hunk_lines.append((marker, content))
                        if marker in " -":
                            consumed_old += 1
                        if marker in " +":
                            consumed_new += 1
                        i += 1
                    if consumed_old != old_count or consumed_new != new_count:
                        raise ValueError("Unified diff hunk counts do not match")
                    hunks.append(Hunk(old_start, old_count, new_count, tuple(hunk_lines)))
                if not hunks:
                    raise ValueError("Patch contains no applicable hunks")
                files.append(FilePatch(old_path, tuple(hunks)))
                if len(files) > MAX_PATCH_FILES:
                    raise ValueError("Patch modifies too many files")
                continue
            if line.startswith("+++"):
                raise ValueError("Malformed unified diff headers")
        if line.strip():
            raise ValueError("Unsupported or malformed unified diff line")
        i += 1
    if not files:
        raise ValueError("No supported file patches were found")
    return files


def apply_file_patch(original: str, file_patch: FilePatch) -> str:
    if "\x00" in original:
        raise ValueError("Binary files cannot be patched")
    source = original.splitlines(keepends=True)
    output: list[str] = []
    cursor = 0
    for hunk in file_patch.hunks:
        old_pos = max(0, hunk.old_start - 1) if hunk.old_count else hunk.old_start
        if old_pos < cursor or old_pos > len(source):
            raise ValueError("Patch hunk location is invalid")
        output.extend(source[cursor:old_pos])
        cursor = old_pos
        old_seen = new_seen = 0
        for marker, content in hunk.lines:
            if marker in " -":
                if cursor >= len(source) or source[cursor].rstrip("\r\n") != content.rstrip("\r\n"):
                    raise ValueError("Patch context does not match the expected base revision")
                existing = source[cursor]
                cursor += 1
                old_seen += 1
                if marker == " ":
                    output.append(existing)
                    new_seen += 1
            else:
                output.append(content)
                new_seen += 1
        if old_seen != hunk.old_count or new_seen != hunk.new_count:
            raise ValueError("Patch hunk counts are invalid")
    output.extend(source[cursor:])
    return "".join(output)


def parse_github_repository(url: str) -> tuple[str, str]:
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Invalid GitHub repository URL.") from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname != "github.com"
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or parsed.query
        or parsed.fragment
    ):
        raise HTTPException(status_code=422, detail="Only canonical HTTPS GitHub repository URLs are supported.")
    path = parsed.path.strip("/")
    if path.endswith(".git"):
        path = path[:-4]
    parts = path.split("/")
    if len(parts) != 2 or not OWNER_PATTERN.fullmatch(parts[0]) or not REPO_PATTERN.fullmatch(parts[1]):
        raise HTTPException(status_code=422, detail="URL must identify exactly one GitHub repository.")
    return parts[0], parts[1]


def validate_branch(branch: str) -> str:
    if (
        not branch
        or not BRANCH_PATTERN.fullmatch(branch)
        or branch.startswith("/")
        or branch.endswith(("/", "."))
        or ".." in branch
        or "//" in branch
        or "@{" in branch
        or "\\" in branch
    ):
        raise HTTPException(status_code=422, detail="Invalid Git branch name.")
    return branch


def _verified_pr_response(data: object, owner: str, repo: str) -> tuple[str, int] | None:
    if not isinstance(data, dict):
        return None
    pr_url = data.get("html_url")
    number = data.get("number")
    if not isinstance(pr_url, str) or type(number) is not int or number <= 0:
        return None
    try:
        parsed = urlsplit(pr_url)
        port = parsed.port
    except ValueError:
        return None
    expected_path = f"/{owner}/{repo}/pull/{number}".casefold()
    if (
        parsed.scheme != "https"
        or parsed.hostname != "github.com"
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or parsed.path.casefold() != expected_path
        or parsed.query
        or parsed.fragment
    ):
        return None
    return pr_url, number


async def create_github_pr(
    *, target_url: str, target_branch: str, patch_content: str, incident_id: str,
    title: str, description: str, owner_id: str, store,
    app_client: GitHubAppClient | None = None, expected_base_sha: str | None = None,
    branch_prefix: str = "swarmops-fix",
) -> dict[str, object]:
    """Create a PR only after applying a context-verified patch to an authorized repository."""
    from security_policy import evaluate_patch

    policy = evaluate_patch(patch_content)
    if policy.state != "passed":
        raise HTTPException(status_code=409, detail="Remediation did not pass deterministic security policy.")
    repo_owner, repo_name = parse_github_repository(target_url)
    file_patches = parse_unified_diff(patch_content)
    github = app_client or GitHubAppClient()
    token = await github.token_for_repository(owner_id, repo_owner, repo_name, store)
    repo_path = f"/repos/{quote(repo_owner, safe='')}/{quote(repo_name, safe='')}"
    repo_info = await github._request("GET", repo_path, token)
    if repo_info.get("full_name", "").casefold() != f"{repo_owner}/{repo_name}".casefold():
        raise HTTPException(status_code=409, detail="GitHub repository identity changed.")
    base_branch = validate_branch(target_branch or str(repo_info.get("default_branch", "")))
    ref = await github._request(
        "GET", f"{repo_path}/git/ref/heads/{quote(base_branch, safe='/')}", token
    )
    base_sha = ref.get("object", {}).get("sha")
    if not isinstance(base_sha, str) or not re.fullmatch(r"[0-9a-fA-F]{40,64}", base_sha):
        raise HTTPException(status_code=502, detail="GitHub returned invalid base revision metadata.")

    safe_incident = re.sub(r"[^A-Za-z0-9-]", "-", incident_id)[:70]
    if branch_prefix not in {"swarmops-fix", "swarmops-contribution"}:
        raise HTTPException(status_code=422, detail="Invalid pull request branch prefix.")
    branch_name = f"{branch_prefix}-{safe_incident}"
    existing = await github._request(
        "GET", f"{repo_path}/pulls", token,
        params={"state": "open", "head": f"{repo_owner}:{branch_name}", "base": base_branch},
    )
    if not isinstance(existing, list):
        raise HTTPException(status_code=502, detail="GitHub could not verify whether this pull request already exists.")
    if existing:
        pr = existing[0]
        verified_pr = _verified_pr_response(pr, repo_owner, repo_name)
        if verified_pr:
            return {"url": verified_pr[0], "number": verified_pr[1], "branch": branch_name, "base_sha": base_sha, "idempotent": True}

    if expected_base_sha and base_sha.casefold() != expected_base_sha.casefold():
        raise HTTPException(
            status_code=409,
            detail="The repository default branch changed after this scan. Rescan before creating a pull request.",
        )

    branch_created = False
    try:
        await github._request(
            "POST", f"{repo_path}/git/refs", token,
            json_body={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
        )
        branch_created = True
        for file_patch in file_patches:
            content_data = await github._request(
                "GET", f"{repo_path}/contents/{quote(file_patch.path, safe='/')}", token,
                params={"ref": branch_name},
            )
            if content_data.get("type") != "file" or content_data.get("encoding") != "base64":
                raise HTTPException(status_code=422, detail="Patch target must be an existing text file.")
            try:
                current = base64.b64decode(content_data["content"], validate=True).decode("utf-8")
                updated = apply_file_patch(current, file_patch)
            except (KeyError, ValueError, UnicodeDecodeError) as exc:
                raise HTTPException(status_code=409, detail="Patch does not apply cleanly to the authorized base revision.") from exc
            await github._request(
                "PUT", f"{repo_path}/contents/{quote(file_patch.path, safe='/')}", token,
                json_body={
                    "message": f"Prepare SwarmOps remediation for {incident_id}",
                    "content": base64.b64encode(updated.encode("utf-8")).decode("ascii"),
                    "sha": content_data.get("sha"),
                    "branch": branch_name,
                },
            )

        pr_data = await github._request(
            "POST", f"{repo_path}/pulls", token,
            json_body={
                "title": title[:240],
                "body": description[:60000],
                "head": branch_name,
                "base": base_branch,
            },
        )
        verified_pr = _verified_pr_response(pr_data, repo_owner, repo_name)
        if not verified_pr:
            raise HTTPException(status_code=502, detail="GitHub did not confirm pull request creation.")
        return {"url": verified_pr[0], "number": verified_pr[1], "branch": branch_name, "base_sha": base_sha, "idempotent": False}
    except Exception as exc:
        if branch_created:
            try:
                # Do not delete a branch if GitHub may have created the PR before a timeout.
                prs = await github._request(
                    "GET", f"{repo_path}/pulls", token,
                    params={"state": "open", "head": f"{repo_owner}:{branch_name}", "base": base_branch},
                )
                if not isinstance(prs, list) or any(
                    not isinstance(pr, dict) or not isinstance(pr.get("head"), dict)
                    for pr in prs
                ):
                    raise HTTPException(status_code=502, detail="GitHub returned an ambiguous pull request listing.")
                if isinstance(prs, list) and any(
                    pr["head"].get("ref") == branch_name
                    for pr in prs
                ):
                    raise HTTPException(
                        status_code=502,
                        detail=f"GitHub may have created a pull request for branch {branch_name}; inspect GitHub before retrying.",
                    )
                await github._request("DELETE", f"{repo_path}/git/refs/heads/{quote(branch_name, safe='/')}", token)
            except Exception as cleanup_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"GitHub publication failed and the outcome or branch cleanup is uncertain for {branch_name}; inspect GitHub before retrying.",
                ) from cleanup_error
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=502, detail="GitHub publication failed; no success was recorded.") from exc
