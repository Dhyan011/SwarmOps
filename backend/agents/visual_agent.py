from agents.base_agent import BaseAgent
from tools.visual_tools import render_timeseries, render_heatmap

class VisualAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VisualAgent",
            role="produce a base64-encoded PNG anomaly chart of the most relevant metric or log volume over time",
            tools_list=[render_timeseries, render_heatmap]
        )
