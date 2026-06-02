from agents.base_agent import BaseAgent
from tools.metric_tools import get_metrics, get_percentile

class MetricAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="MetricAgent",
            role="detect CPU spikes, memory saturation, latency regressions, error rate increases in time-series metrics for the affected service",
            tools_list=[get_metrics, get_percentile]
        )
