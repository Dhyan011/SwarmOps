import httpx
from bs4 import BeautifulSoup
import json
import time

def analyze_live_website(url: str) -> str:
    """
    Sends an HTTP GET request to a live website to analyze its status and content.
    Returns JSON containing status code, response time, headers, and the page title/summary.
    """
    start_time = time.time()
    try:
        response = httpx.get(url, timeout=10.0, follow_redirects=True)
        response_time = time.time() - start_time
        
        soup = BeautifulSoup(response.text, 'html.parser')
        title = soup.title.string if soup.title else "No Title"
        
        # Get first few paragraphs for context
        paragraphs = [p.text.strip() for p in soup.find_all('p') if p.text.strip()][:3]
        
        data = {
            "url": url,
            "status_code": response.status_code,
            "response_time_seconds": round(response_time, 2),
            "title": title,
            "content_preview": paragraphs,
            "server_header": response.headers.get("Server", "Unknown")
        }
        return json.dumps(data)
    except httpx.RequestError as e:
        return json.dumps({
            "url": url,
            "error": f"Failed to reach website: {str(e)}",
            "status": "unreachable"
        })
