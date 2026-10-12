"""SSRF-resistant, public-only URL context fetcher.

DNS answers are validated and pinned by aiohttp's connector resolver, redirects
are handled manually (and revalidated), and response sizes/time are bounded.
"""
from __future__ import annotations

import asyncio
import base64
import html
import ipaddress
import io
import json
import re
import socket
import stat
import zipfile
from urllib.parse import quote, urljoin, urlsplit

import aiohttp
from aiohttp.abc import AbstractResolver

MAX_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_API_BYTES = 1 * 1024 * 1024
MAX_REDIRECTS = 3
MAX_CONTEXT_CHARS = 30_000
MAX_REPO_FILES = 2_000
MAX_REPO_UNCOMPRESSED_BYTES = 5 * 1024 * 1024

SECRET_PATTERNS = (
    re.compile(r"(?is)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----"),
    re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"(?i)(\b(?:api[_-]?(?:key|token)|access[_-]?token|client[_-]?secret|password|secret[_-]?key)\b\s*[:=]\s*)([\"']?)[^\s,;#\"']{8,}"),
    re.compile(r"(?i)(\bbearer\s+)[A-Za-z0-9._~+/-]{16,}={0,2}"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
)

SECRET_PATH_NAMES = {
    ".npmrc", ".pypirc", ".netrc", "credentials", "credentials.json",
    "service-account.json", "id_rsa", "id_ed25519", "authorized_keys",
}
SECRET_EXTENSIONS = {".pem", ".key", ".p12", ".pfx", ".p7b", ".p7c", ".jks", ".keystore"}


class PublicOnlyResolver(AbstractResolver):
    """Resolve public DNS records once and return only pinned public IPs."""

    async def resolve(self, host, port=0, family=socket.AF_INET):
        normalized = host.rstrip(".").lower()
        try:
            literal = ipaddress.ip_address(normalized)
            addresses = [(socket.AF_INET6 if literal.version == 6 else socket.AF_INET, str(literal))]
        except ValueError:
            loop = asyncio.get_running_loop()
            try:
                answers = await loop.getaddrinfo(
                    normalized, port, family=family, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP
                )
            except OSError as exc:
                raise OSError("Host resolution failed") from exc
            addresses = []
            for answer_family, _socktype, _proto, _canonname, sockaddr in answers:
                ip = str(sockaddr[0]).split("%", 1)[0]
                addresses.append((answer_family, ip))
        unique = list(dict.fromkeys(addresses))
        if not unique:
            raise OSError("No address records")
        if any(not ipaddress.ip_address(ip).is_global for _family, ip in unique):
            raise OSError("Non-public destination blocked")
        return [
            {
                "hostname": normalized,
                "host": ip,
                "port": port,
                "family": address_family,
                "proto": socket.IPPROTO_TCP,
                "flags": socket.AI_NUMERICHOST,
            }
            for address_family, ip in unique
        ]

    async def close(self):
        return None


def validate_public_url(url: str):
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid URL") from exc
    host = parsed.hostname
    if (
        parsed.scheme.lower() != "https"
        or not host
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or "\r" in url
        or "\n" in url
    ):
        raise ValueError("Only canonical HTTPS public URLs are supported")
    normalized = host.rstrip(".").lower()
    if normalized == "localhost" or normalized.endswith((".localhost", ".local", ".internal", ".test")):
        raise ValueError("Local destinations are blocked")
    try:
        literal = ipaddress.ip_address(normalized)
    except ValueError:
        try:
            normalized.encode("idna")
        except UnicodeError as exc:
            raise ValueError("Invalid hostname") from exc
    else:
        if not literal.is_global:
            raise ValueError("Non-public destination blocked")
    return parsed


async def safe_fetch_bytes(url: str, *, max_bytes: int = MAX_RESPONSE_BYTES, accept: str = "*/*") -> tuple[bytes, str]:
    current_url = url
    timeout = aiohttp.ClientTimeout(total=15, connect=5, sock_read=8)
    connector = aiohttp.TCPConnector(
        resolver=PublicOnlyResolver(), use_dns_cache=False, limit=4, ssl=True
    )
    async with aiohttp.ClientSession(
        connector=connector, timeout=timeout, trust_env=False,
        headers={
            "Accept": accept,
            "Accept-Encoding": "identity",
            "User-Agent": "SwarmOps-public-context/1.0",
        },
        auto_decompress=False,
    ) as session:
        for redirect_count in range(MAX_REDIRECTS + 1):
            validate_public_url(current_url)
            async with session.get(current_url, allow_redirects=False) as response:
                if response.status in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    if not location or redirect_count >= MAX_REDIRECTS:
                        raise ValueError("Redirect limit exceeded")
                    next_url = urljoin(current_url, location)
                    validate_public_url(next_url)
                    current_url = next_url
                    continue
                if response.status < 200 or response.status >= 300:
                    raise ValueError("Remote request failed")
                if response.headers.get("Content-Encoding", "identity").lower() not in ("", "identity"):
                    raise ValueError("Compressed transfer bodies are not accepted")
                body = await response.content.read(max_bytes + 1)
                if len(body) > max_bytes:
                    raise ValueError("Remote response exceeded size limit")
                return body, response.headers.get("Content-Type", "").split(";", 1)[0].lower()
    raise ValueError("Redirect limit exceeded")


def _github_parts(url: str):
    parsed = validate_public_url(url)
    if parsed.hostname != "github.com":
        return None
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        return None
    owner, repo = parts[0], parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})", owner) or not re.fullmatch(r"[A-Za-z0-9._-]{1,100}", repo):
        return None
    return owner, repo, parts


async def fetch_url_context(url: str, mode: str = "full", max_tokens_approx: int = 8000) -> str:
    if not url:
        return ""
    try:
        github_parts = _github_parts(url)
        if github_parts:
            _owner, _repo, parts = github_parts
            if len(parts) > 2:
                return await fetch_github_path(url, min(max_tokens_approx * 4, MAX_CONTEXT_CHARS))
            return await fetch_github_repo(url, mode, min(max_tokens_approx * 4, MAX_CONTEXT_CHARS))
        return await fetch_website(url)
    except (ValueError, OSError, aiohttp.ClientError, asyncio.TimeoutError, zipfile.BadZipFile):
        return "External context unavailable; no content was fetched."


async def fetch_github_path(url: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    validate_public_url(url)
    info = _github_parts(url)
    if not info:
        return "External context unavailable."
    owner, repo, parts = info
    if len(parts) < 5 or parts[2] not in ("blob", "tree") or len(parts) < 6:
        return "External context unavailable."
    ref = parts[3]
    path = "/".join(parts[4:]) if parts[2] == "tree" else "/".join(parts[4:])
    safe_parts = [piece.casefold() for piece in path.split("/")]
    if (
        not path
        or any(piece in (".", "..", ".git", ".ssh", "secrets", "credentials") for piece in safe_parts)
        or any(piece.startswith(".env") for piece in safe_parts)
        or path.lower().endswith((".pem", ".key", ".p12", ".pfx", ".keystore"))
    ):
        return "Protected repository paths are not included in external context."
    api_url = (
        f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"
        f"/contents/{quote(path, safe='/')}?ref={quote(ref, safe='')}"
    )
    body, content_type = await safe_fetch_bytes(api_url, max_bytes=MAX_API_BYTES, accept="application/vnd.github+json")
    if "json" not in content_type:
        return "External context unavailable."
    data = json.loads(body)
    if isinstance(data, dict) and data.get("type") == "file":
        if data.get("encoding") != "base64" or not isinstance(data.get("content"), str):
            return "External context unavailable."
        content = base64.b64decode(data["content"], validate=True).decode("utf-8")
        return f"--- Public GitHub file: {path} ---\n{content[:max_chars]}"
    if isinstance(data, list):
        entries = [f"{item.get('type', 'entry')}: {item.get('path', '')}" for item in data[:40] if isinstance(item, dict)]
        return f"--- Public GitHub directory: {path} ---\n" + "\n".join(entries)
    return "External context unavailable."


async def fetch_website(url: str) -> str:
    body, content_type = await safe_fetch_bytes(url, max_bytes=MAX_RESPONSE_BYTES, accept="text/html,text/plain")
    if content_type not in ("text/html", "text/plain", "application/xhtml+xml"):
        return "External context unavailable; the content type is not text."
    text = body.decode("utf-8", errors="replace")
    text = re.sub(r"(?is)<(script|style|noscript).*?>.*?</\1>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(re.sub(r"\s+", " ", text)).strip()
    return text[:MAX_CONTEXT_CHARS]


async def fetch_github_repo(url: str, mode: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    info = _github_parts(url)
    if not info:
        return "External context unavailable."
    owner, repo, _parts = info
    metadata_url = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"
    metadata, content_type = await safe_fetch_bytes(
        metadata_url, max_bytes=MAX_API_BYTES, accept="application/vnd.github+json"
    )
    if "json" not in content_type:
        return "External context unavailable."
    repo_info = json.loads(metadata)
    branch = repo_info.get("default_branch")
    if not isinstance(branch, str) or not branch:
        return "External context unavailable."
    archive_url = f"{metadata_url}/zipball/{quote(branch, safe='')}"
    archive, _archive_type = await safe_fetch_bytes(archive_url, max_bytes=MAX_RESPONSE_BYTES)

    ignore_exts = {".png", ".jpg", ".jpeg", ".gif", ".mp4", ".pdf", ".zip", ".tar", ".gz", ".pem", ".key"}
    ignore_dirs = {"node_modules", ".git", ".ssh", "venv", ".venv", "dist", "build", "secrets", "credentials"}
    content_parts = [f"Public repository context: {owner}/{repo}"]
    total_chars = 0
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        items = zipped.infolist()
        if len(items) > 2000:
            raise ValueError("Archive contains too many files")
        uncompressed_bytes = 0
        for item in items:
            if item.is_dir() or item.file_size > 200_000 or item.file_size == 0:
                continue
            if uncompressed_bytes + item.file_size > 5 * 1024 * 1024:
                break
            parts = item.filename.split("/")
            relative = "/".join(parts[1:])
            lower_parts = [part.casefold() for part in parts[1:]]
            if not relative or any(part in ignore_dirs for part in lower_parts):
                continue
            if any(part.startswith(".env") for part in lower_parts):
                continue
            if any(relative.lower().endswith(ext) for ext in ignore_exts):
                continue
            try:
                text = zipped.read(item).decode("utf-8")
            except UnicodeDecodeError:
                continue
            uncompressed_bytes += item.file_size
            block = f"\n\n--- Public file: {relative} ---\n{text[:100_000]}"
            if total_chars + len(block) > min(max_chars, MAX_CONTEXT_CHARS):
                content_parts.append("\n\n--- [CONTEXT TRUNCATED] ---")
                break
            content_parts.append(block)
            total_chars += len(block)
    return "".join(content_parts)


def redact_repository_secrets(text: str) -> tuple[str, int]:
    """Redact common credential forms before public source is sent to an LLM."""
    redactions = 0
    result = text
    for pattern in SECRET_PATTERNS:
        result, count = pattern.subn(lambda match: f"{match.group(1)}[REDACTED]" if match.lastindex and match.lastindex >= 1 else "[REDACTED SECRET]", result)
        redactions += count
    return result, redactions


def _safe_repo_file(relative_path: str) -> bool:
    parts = [part.casefold() for part in relative_path.split("/")]
    basename = parts[-1]
    ignored_directories = {
        ".git", ".ssh", "node_modules", "venv", ".venv", "dist", "build",
        "secrets", "secret", "credentials", "credential", "private", "certs",
    }
    if any(part in ignored_directories or part.startswith(".env") for part in parts):
        return False
    if basename in SECRET_PATH_NAMES or basename.startswith(("id_rsa", "id_ed25519")):
        return False
    if any(basename.endswith(extension) for extension in SECRET_EXTENSIONS):
        return False
    return True


def _extract_snapshot_archive(archive: bytes, owner: str, repo: str, max_chars: int) -> tuple[str, int, int, dict[str, str]]:
    ignore_exts = {".png", ".jpg", ".jpeg", ".gif", ".mp4", ".pdf", ".zip", ".tar", ".gz", ".sqlite", ".db"}
    chunks = [f"Public repository context: {owner}/{repo}"]
    total_chars = 0
    included_files = redaction_count = uncompressed_bytes = 0
    source_files: dict[str, str] = {}
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        items = zipped.infolist()
        if len(items) > MAX_REPO_FILES:
            raise ValueError("Repository archive contains too many files")
        guidance = {"readme.md": 0, "contributing.md": 1, "agents.md": 2, "code_of_conduct.md": 3}
        items.sort(key=lambda item: (guidance.get(item.filename.split("/")[-1].casefold(), 10), item.filename.casefold()))
        for item in items:
            mode = item.external_attr >> 16
            if item.is_dir() or stat.S_ISLNK(mode) or item.file_size <= 0 or item.file_size > 200_000:
                continue
            if uncompressed_bytes + item.file_size > MAX_REPO_UNCOMPRESSED_BYTES:
                break
            parts = item.filename.split("/")
            relative_path = "/".join(parts[1:])
            if not relative_path or not _safe_repo_file(relative_path):
                continue
            if any(relative_path.casefold().endswith(ext) for ext in ignore_exts):
                continue
            try:
                source = zipped.read(item).decode("utf-8")
            except (UnicodeDecodeError, OSError, RuntimeError):
                continue
            safe_source, count = redact_repository_secrets(source)
            redaction_count += count
            header = f"\n\n--- Public source file: {relative_path} ---\n"
            budget = min(max_chars, MAX_CONTEXT_CHARS) - total_chars
            if budget <= len(header):
                chunks.append("\n\n--- [CONTEXT TRUNCATED] ---")
                break
            truncated = len(safe_source) > budget - len(header)
            included_source = safe_source[:budget - len(header)]
            block = header + included_source
            chunks.append(block)
            source_files[relative_path] = included_source
            total_chars += len(block)
            uncompressed_bytes += item.file_size
            included_files += 1
            if truncated:
                chunks.append("\n\n--- [CONTEXT TRUNCATED] ---")
                break
    return "".join(chunks), included_files, redaction_count, source_files


async def fetch_github_repository_snapshot(url: str, max_chars: int = MAX_CONTEXT_CHARS) -> dict[str, object]:
    """Fetch public repository text pinned to a single commit SHA, excluding sensitive files."""
    info = _github_parts(url)
    if not info or len(info[2]) != 2:
        raise ValueError("A canonical public GitHub repository URL is required")
    owner, repo, _parts = info
    api_root = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"
    metadata_bytes, content_type = await safe_fetch_bytes(api_root, max_bytes=MAX_API_BYTES, accept="application/vnd.github+json")
    if "json" not in content_type:
        raise ValueError("GitHub returned invalid repository metadata")
    metadata = json.loads(metadata_bytes)
    full_name = metadata.get("full_name") if isinstance(metadata, dict) else None
    default_branch = metadata.get("default_branch") if isinstance(metadata, dict) else None
    if not isinstance(full_name, str) or full_name.casefold() != f"{owner}/{repo}".casefold():
        raise ValueError("GitHub repository identity did not match the requested target")
    if (
        not isinstance(default_branch, str)
        or not default_branch
        or len(default_branch) > 255
        or default_branch.startswith("/")
        or default_branch.endswith("/")
        or ".." in default_branch
        or "//" in default_branch
        or not re.fullmatch(r"[A-Za-z0-9._/-]+", default_branch)
    ):
        raise ValueError("GitHub returned an invalid default branch")
    ref_url = f"{api_root}/git/ref/heads/{quote(default_branch, safe='/')}"
    ref_bytes, ref_type = await safe_fetch_bytes(ref_url, max_bytes=MAX_API_BYTES, accept="application/vnd.github+json")
    if "json" not in ref_type:
        raise ValueError("GitHub returned invalid source revision metadata")
    ref = json.loads(ref_bytes)
    source_sha = ref.get("object", {}).get("sha") if isinstance(ref, dict) else None
    if not isinstance(source_sha, str) or not re.fullmatch(r"[0-9a-fA-F]{40,64}", source_sha):
        raise ValueError("GitHub returned an invalid source revision")
    archive_url = f"{api_root}/zipball/{quote(source_sha, safe='')}"
    archive, _archive_type = await safe_fetch_bytes(archive_url, max_bytes=MAX_RESPONSE_BYTES)
    source_context, included_files, redactions, source_files = _extract_snapshot_archive(
        archive, owner, repo, max_chars=max(1, min(max_chars, MAX_CONTEXT_CHARS))
    )
    if included_files == 0:
        raise ValueError("No readable, non-sensitive source files were available for review")
    source_url = f"https://github.com/{owner}/{repo}/tree/{source_sha}"
    return {
        "repository": full_name,
        "target_url": f"https://github.com/{owner}/{repo}",
        "default_branch": default_branch,
        "source_sha": source_sha,
        "source_url": source_url,
        "included_files": included_files,
        "redactions": redactions,
        "context": source_context,
        "source_files": source_files,
    }
