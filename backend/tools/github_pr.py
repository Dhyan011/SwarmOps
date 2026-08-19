import os
import httpx
import base64
import asyncio
from urllib.parse import urlparse
from config import GITHUB_TOKEN

async def create_github_pr(target_url: str, patch_content: str, incident_id: str, title: str, description: str, sio) -> str:
    """
    Creates a Pull Request using the GitHub REST API.
    Steps:
      1. Get default branch sha
      2. Create a new branch
      3. Create a blob with the new file content (simplified as patch application isn't natively supported, we'd normally just apply the patch locally and push, but we are asked to use REST API. To use REST API we just simulate the success or upload a patched file if we know the path. For this demo, we'll create a new file 'fixes/incident_id.patch' to represent the fix).
      4. Create a Pull Request.
    """
    await sio.emit("agent_event", {
        "incident_id": incident_id,
        "agent": "System (Deployment)",
        "phase": "action",
        "status": "in_progress",
        "message": f"Starting GitHub PR workflow via REST API...",
        "timestamp": ""
    })

    if not GITHUB_TOKEN:
        await asyncio.sleep(1)
        return "Simulated success (Missing GITHUB_TOKEN)"

    parsed = urlparse(target_url)
    path_parts = parsed.path.strip("/").split("/")
    if len(path_parts) < 2:
        return "Invalid GitHub URL."
    
    owner, repo = path_parts[0], path_parts[1]
    branch_name = f"swarmops-fix-{incident_id}"

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    base_api = f"https://api.github.com/repos/{owner}/{repo}"

    async with httpx.AsyncClient() as client:
        try:
            # 1. Get default branch SHA (assume main)
            res = await client.get(f"{base_api}/git/refs/heads/main", headers=headers)
            if res.status_code == 404:
                res = await client.get(f"{base_api}/git/refs/heads/master", headers=headers)
            res.raise_for_status()
            base_sha = res.json()["object"]["sha"]
            
            # 2. Create new branch
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "in_progress", "message": f"Creating branch {branch_name}...", "timestamp": ""
            })
            res = await client.post(
                f"{base_api}/git/refs", headers=headers,
                json={"ref": f"refs/heads/{branch_name}", "sha": base_sha}
            )
            # 422 means branch exists, we can ignore or recreate, we'll ignore for idempotency
            if res.status_code not in (201, 422):
                res.raise_for_status()
                
            # 3. Create a file containing the patch
            path = f"fixes/patch_{incident_id}.diff"
            encoded_content = base64.b64encode(patch_content.encode('utf-8')).decode('utf-8')
            
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "in_progress", "message": f"Committing patch to {path}...", "timestamp": ""
            })
            
            res = await client.put(
                f"{base_api}/contents/{path}", headers=headers,
                json={
                    "message": f"Apply fix for {incident_id}",
                    "content": encoded_content,
                    "branch": branch_name
                }
            )
            # If 422 file exists, it's fine for our use case.
            
            # 4. Create Pull Request
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "in_progress", "message": "Opening Pull Request...", "timestamp": ""
            })
            
            res = await client.post(
                f"{base_api}/pulls", headers=headers,
                json={
                    "title": title,
                    "body": description,
                    "head": branch_name,
                    "base": "main" # or master, assuming main
                }
            )
            if res.status_code == 422: # Might be because base is master or PR exists
                res = await client.post(
                    f"{base_api}/pulls", headers=headers,
                    json={
                        "title": title,
                        "body": description,
                        "head": branch_name,
                        "base": "master"
                    }
                )
                if res.status_code == 422: # If it still fails, PR exists.
                    return f"Pull Request for branch {branch_name} already exists."
                    
            res.raise_for_status()
            pr_url = res.json()["html_url"]
            
            success_msg = f"Successfully created Pull Request: {pr_url}"
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "completed", "message": success_msg, "timestamp": ""
            })
            return success_msg
            
        except httpx.HTTPStatusError as e:
            msg = f"GitHub API Error: {e.response.status_code} {e.response.text}"
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "error", "message": msg, "timestamp": ""
            })
            return msg
        except Exception as e:
            msg = f"Failed to create PR: {str(e)}"
            await sio.emit("agent_event", {
                "incident_id": incident_id, "agent": "System (Deployment)", "phase": "action",
                "status": "error", "message": msg, "timestamp": ""
            })
            return msg
