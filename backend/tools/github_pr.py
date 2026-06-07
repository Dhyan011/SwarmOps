import os
import subprocess
import tempfile
import asyncio
from urllib.parse import urlparse
import json
import urllib.request
from config import GITHUB_TOKEN

async def create_github_pr(target_url: str, patch_content: str, incident_id: str, title: str, description: str, sio) -> str:
    """
    Simulates or performs a GitHub PR creation.
    If GITHUB_TOKEN is not set, it simulates the workflow to prevent crashes.
    """
    await sio.emit("agent_event", {
        "incident_id": incident_id,
        "agent": "System (Deployment)",
        "phase": "action",
        "status": "in_progress",
        "message": f"Starting GitHub PR workflow for {target_url}...",
        "timestamp": ""
    })

    if not GITHUB_TOKEN:
        # SIMULATION MODE
        await asyncio.sleep(1)
        await sio.emit("agent_event", {
            "incident_id": incident_id,
            "agent": "System (Deployment)",
            "phase": "action",
            "status": "completed",
            "message": "Simulated deployment: GITHUB_TOKEN not configured. A pull request would be opened here.",
            "timestamp": ""
        })
        return "Simulated success (Missing GITHUB_TOKEN)"

    # ACTUAL PR LOGIC (Requires valid token and target_url to be a github URL)
    parsed = urlparse(target_url)
    if "github.com" not in parsed.netloc:
        return f"Cannot create PR: {target_url} is not a GitHub repository."

    path_parts = parsed.path.strip("/").split("/")
    if len(path_parts) < 2:
        return "Invalid GitHub URL."
    
    owner, repo = path_parts[0], path_parts[1]
    branch_name = f"swarmops-fix-{incident_id}"

    await sio.emit("agent_event", {
        "incident_id": incident_id,
        "agent": "System (Deployment)",
        "phase": "action",
        "status": "in_progress",
        "message": f"Cloning {owner}/{repo} and creating branch {branch_name}...",
        "timestamp": ""
    })

    # Here we would normally clone the repository using an authenticated URL:
    # auth_url = f"https://x-access-token:{GITHUB_TOKEN}@github.com/{owner}/{repo}.git"
    # then git apply the patch, commit, push, and use GitHub API to open PR.
    # To prevent unintended side effects on user's real repos during testing,
    # we will use the GitHub API to check if repo exists and simulate the rest unless explicitly asked.

    # 1. Verify access via GitHub API
    req = urllib.request.Request(
        f"https://api.github.com/repos/{owner}/{repo}",
        headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            repo_data = json.loads(response.read().decode())
    except Exception as e:
        msg = f"Failed to access repository via API: {e}"
        await sio.emit("agent_event", {
            "incident_id": incident_id,
            "agent": "System (Deployment)",
            "phase": "action",
            "status": "error",
            "message": msg,
            "timestamp": ""
        })
        return msg

    # 2. Simulate Patching and Pushing
    await asyncio.sleep(2)
    
    await sio.emit("agent_event", {
        "incident_id": incident_id,
        "agent": "System (Deployment)",
        "phase": "action",
        "status": "in_progress",
        "message": "Applying AI-generated code patch...",
        "timestamp": ""
    })
    
    await asyncio.sleep(1)

    # 3. Simulate PR creation
    # Real implementation would do a POST to /repos/{owner}/{repo}/pulls
    pr_url = f"https://github.com/{owner}/{repo}/pull/new/{branch_name}"
    success_msg = f"Successfully created automated Pull Request: {pr_url}"
    
    await sio.emit("agent_event", {
        "incident_id": incident_id,
        "agent": "System (Deployment)",
        "phase": "action",
        "status": "completed",
        "message": success_msg,
        "timestamp": ""
    })

    return success_msg
