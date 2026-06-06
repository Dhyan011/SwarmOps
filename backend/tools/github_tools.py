import httpx
import json

def analyze_github_repo(repo_url: str) -> str:
    """
    Analyzes a public GitHub repository using the GitHub API.
    Input should be the full URL, e.g., 'https://github.com/microsoft/autogen'
    Returns repository metadata, language stats, and recent open issues.
    """
    try:
        # Extract owner and repo from URL
        # e.g., https://github.com/owner/repo
        parts = repo_url.rstrip('/').split('/')
        if len(parts) < 2:
            return json.dumps({"error": "Invalid GitHub URL format."})
        
        owner, repo = parts[-2], parts[-1]
        
        api_base = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {"Accept": "application/vnd.github.v3+json"}
        
        # 1. Get Repo Metadata
        repo_res = httpx.get(api_base, headers=headers, timeout=5.0)
        if repo_res.status_code != 200:
            return json.dumps({"error": f"Failed to fetch repo: {repo_res.status_code} {repo_res.text}"})
        
        repo_data = repo_res.json()
        
        # 2. Get Languages
        lang_res = httpx.get(f"{api_base}/languages", headers=headers, timeout=5.0)
        languages = lang_res.json() if lang_res.status_code == 200 else {}
        
        # 3. Get Recent Issues
        issues_res = httpx.get(f"{api_base}/issues?state=open&per_page=3", headers=headers, timeout=5.0)
        issues = []
        if issues_res.status_code == 200:
            for issue in issues_res.json():
                issues.append({"title": issue.get("title"), "state": issue.get("state")})
                
        return json.dumps({
            "name": repo_data.get("full_name"),
            "description": repo_data.get("description"),
            "stars": repo_data.get("stargazers_count"),
            "open_issues_count": repo_data.get("open_issues_count"),
            "languages": languages,
            "recent_issues": issues
        })
        
    except Exception as e:
        return json.dumps({"error": f"Error analyzing repo: {str(e)}"})
