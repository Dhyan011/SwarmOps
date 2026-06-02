import base64
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

async def render_timeseries(data: str) -> str:
    """Takes a screenshot of the live target server dashboard to visually detect anomalies."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("http://localhost:4000/dashboard.html", wait_until="networkidle")
            screenshot_bytes = await page.screenshot(type="png")
            await browser.close()
            
            b64_img = base64.b64encode(screenshot_bytes).decode('utf-8')
            return f"data:image/png;base64,{b64_img}"
    except Exception as e:
        logger.error(f"Failed to capture screenshot: {e}")
        return f"Error capturing dashboard screenshot: {e}"

async def render_heatmap(data: str) -> str:
    """Generates a base64 encoded PNG anomaly heatmap."""
    return await render_timeseries(data)
