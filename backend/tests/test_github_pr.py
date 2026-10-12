import base64

import pytest
from fastapi import HTTPException

from tools.github_pr import (
    apply_file_patch,
    parse_github_repository,
    parse_unified_diff,
    validate_branch,
)


def test_context_verified_unified_patch_applies_exactly():
    patch = """diff --git a/backend/example.py b/backend/example.py
index 1111111..2222222 100644
--- a/backend/example.py
+++ b/backend/example.py
@@ -1,2 +1,2 @@
 def run():
-    return False
+    return True
"""
    file_patch = parse_unified_diff(patch)[0]
    result = apply_file_patch("def run():\n    return False\n\n", file_patch)
    assert result == "def run():\n    return True\n\n"
    assert file_patch.path == "backend/example.py"


def test_patch_rejects_traversal_paths_and_git_metadata():
    for path in ("../secret", ".git/config", "/etc/passwd", "a\\..\\secret"):
        patch = f"--- a/{path}\n+++ b/{path}\n@@ -1 +1 @@\n-old\n+new\n"
        with pytest.raises(ValueError):
            parse_unified_diff(patch)


def test_patch_rejects_create_delete_binary_rename_and_stray_lines():
    rejected = [
        "--- /dev/null\n+++ b/new.py\n@@ -0,0 +1 @@\n+new\n",
        "--- a/old.py\n+++ /dev/null\n@@ -1 +0,0 @@\n-old\n",
        "GIT binary patch\n",
        "diff --git a/old b/new\nsimilarity index 100%\nrename from old\nrename to new\n",
        "--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-old\n+new\n+extra\n",
    ]
    for patch in rejected:
        with pytest.raises(ValueError):
            parse_unified_diff(patch)


def test_patch_rejects_context_mismatch():
    file_patch = parse_unified_diff("--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-expected\n+updated\n")[0]
    with pytest.raises(ValueError, match="does not match"):
        apply_file_patch("different\n", file_patch)


def test_repository_url_is_canonical_github_only():
    assert parse_github_repository("https://github.com/acme/project.git") == ("acme", "project")
    for url in (
        "http://github.com/acme/project",
        "https://github.com.evil.test/acme/project",
        "https://user@github.com/acme/project",
        "https://github.com/acme/project/tree/main",
        "https://github.com/acme/project?redirect=evil",
    ):
        with pytest.raises(HTTPException):
            parse_github_repository(url)


def test_branch_name_validation_rejects_ref_injection():
    assert validate_branch("release/2026.10") == "release/2026.10"
    for branch in ("../main", "/main", "main/", "main..evil", "main@{now}", "a\\b"):
        with pytest.raises(HTTPException):
            validate_branch(branch)


@pytest.mark.asyncio
async def test_github_pr_workflow_updates_only_authorized_existing_file():
    from tools.github_pr import create_github_pr

    patch = "--- a/src/example.py\n+++ b/src/example.py\n@@ -1 +1 @@\n-return False\n+return True\n"
    original = "return False\n"

    class FakeGitHub:
        def __init__(self):
            self.calls = []

        async def token_for_repository(self, owner_id, repo_owner, repo_name, store):
            assert (owner_id, repo_owner, repo_name) == ("user-a", "acme", "project")
            return "short-lived-installation-token"

        async def _request(self, method, path, token, *, json_body=None, params=None):
            assert token == "short-lived-installation-token"
            self.calls.append((method, path, json_body, params))
            if method == "GET" and path == "/repos/acme/project":
                return {"full_name": "acme/project", "default_branch": "main"}
            if method == "GET" and path == "/repos/acme/project/git/ref/heads/main":
                return {"object": {"sha": "a" * 40}}
            if method == "GET" and path == "/repos/acme/project/pulls":
                return []
            if method == "GET" and "/contents/" in path:
                return {
                    "type": "file", "encoding": "base64", "sha": "b" * 40,
                    "content": base64.b64encode(original.encode()).decode(),
                }
            if method == "POST" and path == "/repos/acme/project/pulls":
                return {"html_url": "https://github.com/acme/project/pull/7", "number": 7}
            return {}

    github = FakeGitHub()
    result = await create_github_pr(
        target_url="https://github.com/acme/project",
        target_branch="main",
        patch_content=patch,
        incident_id="INC-123",
        title="Fix safely",
        description="A bounded fix",
        owner_id="user-a",
        store=object(),
        app_client=github,
    )
    assert result["url"] == "https://github.com/acme/project/pull/7"
    assert result["number"] == 7
    put_call = next(call for call in github.calls if call[0] == "PUT")
    assert base64.b64decode(put_call[2]["content"]).decode() == "return True\n"
    assert not any("patch_" in call[1] for call in github.calls)
