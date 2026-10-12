"""Deterministic policy checks for AI-generated remediation patches.

This is a preflight gate, not a claim that generated tests were executed or that
human security review is unnecessary.
"""
from dataclasses import dataclass
import re

from tools.github_pr import parse_unified_diff

SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{24,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(
        r"(?i)\b(?:api[_-]?key|client[_-]?secret|password|token|access[_-]?token|refresh[_-]?token)\b"
        r"\s*[:=]\s*['\"][^'\"]{12,}['\"]"
    ),
)
PROTECTED_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "credentials.json"}
PROTECTED_DIRS = {".git", ".ssh", "secrets", "credentials", "private"}
SENSITIVE_PATH_PREFIXES = (".github/workflows/", "backend/auth.py", "backend/security_policy.py")


@dataclass(frozen=True)
class PolicyResult:
    state: str
    findings: tuple[str, ...]
    modified_paths: tuple[str, ...]
    tests_executed: bool = False


def evaluate_patch(patch: str) -> PolicyResult:
    if not patch.strip():
        return PolicyResult("needs_manual_review", ("empty_patch",), (), False)
    try:
        files = parse_unified_diff(patch)
    except (TypeError, ValueError):
        return PolicyResult("needs_manual_review", ("patch_format_unverified",), (), False)

    paths = tuple(file_patch.path for file_patch in files)
    findings: list[str] = []
    for path in paths:
        parts = [part.casefold() for part in path.split("/")]
        if (
            any(part in PROTECTED_NAMES or part.startswith(".env") for part in parts)
            or any(part in PROTECTED_DIRS for part in parts)
            or any(part.endswith((".pem", ".key", ".p12", ".pfx", ".keystore")) for part in parts)
        ):
            findings.append("protected_path_modified")
    for file_patch in files:
        for hunk in file_patch.hunks:
            for marker, added_line in hunk.lines:
                if marker != "+":
                    continue
                if any(pattern.search(added_line) for pattern in SECRET_PATTERNS):
                    findings.append("possible_secret_added")
                    break
    if findings:
        return PolicyResult("rejected", tuple(sorted(set(findings))), paths, False)
    if any(path.startswith(SENSITIVE_PATH_PREFIXES) for path in paths):
        return PolicyResult("needs_manual_review", ("security_sensitive_path_requires_manual_review",), paths, False)
    return PolicyResult("passed", (), paths, False)
