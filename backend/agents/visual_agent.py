from agents.base_agent import BaseAgent
from tools.visual_tools import render_timeseries, render_heatmap
from tools.web_tools import analyze_live_website

class VisualAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VisualAgent",
            role="produce a base64-encoded PNG anomaly chart or scan live websites by fetching HTML and statuses",
            tools_list=[render_timeseries, render_heatmap, analyze_live_website]
        )
