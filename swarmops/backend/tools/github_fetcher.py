import httpx
import re
import tempfile
import zipfile
import os
import io

async def fetch_url_context(url: str, mode: str = "full", max_tokens_approx: int = 8000) -> str:
    """
    Fetches the content of a URL (GitHub Repo or Live Website).
    If it's a GitHub repo and mode="full", it downloads the zip, extracts text files,
    and returns a concatenated string (limited to ~8000 tokens / 32KB approx to fit smaller models).
    If it's a live website, it fetches the HTML and returns the text.
    """
    if not url:
        return ""
        
    is_github = "github.com" in url
    
    if is_github:
        return await fetch_github_repo(url, mode, max_tokens_approx)
    else:
        return await fetch_website(url)

async def fetch_website(url: str) -> str:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=10.0)
            response.raise_for_status()
            text = response.text
            # Very naive text extraction (strip tags)
            clean_text = re.sub(r'<[^>]+>', ' ', text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            return f"Website Context from {url}:\n\n{clean_text[:20000]}"
    except Exception as e:
        return f"Failed to fetch website {url}: {str(e)}"

async def fetch_github_repo(url: str, mode: str, max_chars: int = 30000) -> str:
    # URL format: https://github.com/user/repo
    parts = url.rstrip("/").split("/")
    if len(parts) < 5:
        return "Invalid GitHub URL format."
        
    user, repo = parts[3], parts[4]
    api_url = f"https://api.github.com/repos/{user}/{repo}/zipball/main"
    
    try:
        async with httpx.AsyncClient() as client:
            # We try main first, if 404, we try master
            response = await client.get(api_url, follow_redirects=True, timeout=15.0)
            if response.status_code == 404:
                api_url = f"https://api.github.com/repos/{user}/{repo}/zipball/master"
                response = await client.get(api_url, follow_redirects=True, timeout=15.0)
            response.raise_for_status()
            
            # Extract zip in memory
            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                # Filter files
                ignore_exts = {'.png', '.jpg', '.jpeg', '.gif', '.mp4', '.pdf', '.zip', '.tar', '.gz'}
                ignore_dirs = {'node_modules', '.git', 'venv', '.venv', 'dist', 'build'}
                
                content_parts = [f"Repository: {user}/{repo}"]
                total_chars = 0
                
                for file_info in z.infolist():
                    if file_info.is_dir():
                        continue
                        
                    parts = file_info.filename.split('/')
                    # Skip the root wrapper directory that GitHub adds
                    rel_path = "/".join(parts[1:])
                    
                    if not rel_path:
                        continue
                        
                    # Basic filtering
                    if any(d in parts for d in ignore_dirs):
                        continue
                    if any(rel_path.endswith(ext) for ext in ignore_exts):
                        continue
                        
                    try:
                        file_content = z.read(file_info.filename).decode('utf-8')
                        file_block = f"\n\n--- File: {rel_path} ---\n{file_content}"
                        
                        if total_chars + len(file_block) > max_chars:
                            content_parts.append(f"\n\n--- [TRUNCATED due to length limits] ---")
                            break
                            
                        content_parts.append(file_block)
                        total_chars += len(file_block)
                        
                    except UnicodeDecodeError:
                        # Skip binary files
                        continue
                
                return "".join(content_parts)
    except Exception as e:
        return f"Failed to fetch GitHub repo {url}: {str(e)}"
