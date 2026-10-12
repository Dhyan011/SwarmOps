import io
import json
import zipfile

import pytest

import tools.github_fetcher as fetcher


@pytest.mark.asyncio
async def test_snapshot_is_pinned_to_commit_and_sensitive_content_is_filtered(monkeypatch):
    archive_io = io.BytesIO()
    with zipfile.ZipFile(archive_io, "w") as archive:
        archive.writestr("project-abc/README.md", "# Project\nSee CONTRIBUTING.md\n")
        archive.writestr("project-abc/.env", "API_KEY=should-never-be-read\n")
        archive.writestr("project-abc/secrets/token.txt", "secret value\n")
        archive.writestr("project-abc/src/main.py", 'API_KEY = "live-secret-value-123456789"\ndef run(): return True\n')

    requested = []

    async def fake_fetch(url, *, max_bytes, accept="*/*"):
        requested.append(url)
        if url.endswith("/repos/acme/project"):
            return json.dumps({"full_name": "acme/project", "default_branch": "main"}).encode(), "application/json"
        if url.endswith("/git/ref/heads/main"):
            return json.dumps({"object": {"sha": "a" * 40}}).encode(), "application/json"
        if url.endswith("/zipball/" + "a" * 40):
            return archive_io.getvalue(), "application/zip"
        raise AssertionError(url)

    monkeypatch.setattr(fetcher, "safe_fetch_bytes", fake_fetch)
    snapshot = await fetcher.fetch_github_repository_snapshot("https://github.com/acme/project")

    assert snapshot["source_sha"] == "a" * 40
    assert snapshot["source_url"].endswith("/tree/" + "a" * 40)
    assert requested[-1].endswith("/zipball/" + "a" * 40)
    assert "live-secret-value-123456789" not in snapshot["context"]
    assert "should-never-be-read" not in snapshot["context"]
    assert "secret value" not in snapshot["context"]
    assert "[REDACTED]" in snapshot["context"]
    assert "src/main.py" in snapshot["source_files"]


def test_redactor_removes_private_key_blocks_and_bearer_tokens():
    text = "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456\n-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----"
    redacted, count = fetcher.redact_repository_secrets(text)
    assert count == 2
    assert "abcdefghijklmnopqrstuvwxyz123456" not in redacted
    assert "-----BEGIN PRIVATE KEY-----" not in redacted
