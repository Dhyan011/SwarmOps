import httpx
import json
from urllib.parse import urlparse

def scan_vulnerabilities(target_url: str) -> str:
    """
    Scans a target URL (live website or github repo) for common security vulnerabilities.
    Returns a JSON payload with the scan results.
    """
    parsed = urlparse(target_url)
    
    if "github.com" in parsed.netloc:
        # It's a GitHub repo - scan for exposed secrets or outdated deps by fetching contents
        parts = parsed.path.strip('/').split('/')
        if len(parts) >= 2:
            owner, repo = parts[0], parts[1]
            api_base = f"https://api.github.com/repos/{owner}/{repo}/contents"
            headers = {"Accept": "application/vnd.github.v3+json"}
            
            try:
                res = httpx.get(api_base, headers=headers, timeout=5.0)
                if res.status_code == 200:
                    files = [item['name'] for item in res.json()]
                    findings = []
                    if ".env" in files or ".env.example" in files:
                        findings.append("Warning: Environment variable file found in repository root. Potential secret exposure.")
                    if "package.json" in files or "requirements.txt" in files:
                        findings.append("Dependency manifest found. Recommend running npm audit or pip-audit.")
                    if not findings:
                        findings.append("No obvious secret exposures found in the repository root.")
                    return json.dumps({"target": target_url, "type": "github_repo", "vulnerability_findings": findings})
            except Exception as e:
                return json.dumps({"error": f"Failed to scan repo contents: {str(e)}"})
                
    else:
        # It's a live website - scan for missing HTTP security headers
        try:
            res = httpx.get(target_url, timeout=5.0, follow_redirects=True)
            headers = res.headers
            findings = []
            
            security_headers = [
                "Strict-Transport-Security",
                "Content-Security-Policy",
                "X-Frame-Options",
                "X-Content-Type-Options"
            ]
            
            for header in security_headers:
                if header not in headers:
                    findings.append(f"Missing Security Header: {header}")
                    
            if not findings:
                findings.append("All basic HTTP security headers are present.")
                
            return json.dumps({"target": target_url, "type": "live_website", "vulnerability_findings": findings})
            
        except Exception as e:
            return json.dumps({"error": f"Failed to scan website headers: {str(e)}"})
            
    return json.dumps({"error": "Unsupported target type for security scan."})
