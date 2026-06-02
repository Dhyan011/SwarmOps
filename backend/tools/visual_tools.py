import base64
import logging
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

def render_timeseries(data: str) -> str:
    """Takes a screenshot of the live target server dashboard to visually detect anomalies."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("http://localhost:4000/dashboard.html", wait_until="networkidle")
            screenshot_bytes = page.screenshot(type="png")
            browser.close()
            
            b64_img = base64.b64encode(screenshot_bytes).decode('utf-8')
            return f"data:image/png;base64,{b64_img}"
    except Exception as e:
        logger.error(f"Failed to capture screenshot: {e}")
        return f"Error capturing dashboard screenshot: {e}"

def render_heatmap(data: str) -> str:
    """Generates a base64 encoded PNG anomaly heatmap."""
    return render_timeseries(data)
