"""
SwarmOps — Metrics Agent
Evaluates system metrics: CPU, memory, latency, error rates, throughput.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a System Metrics Analyst. Evaluate CPU usage, memory consumption, "
    "latency patterns, error rates, throughput changes. Cross-reference your findings "
    "with any past_patterns provided to spot subtle regressions or known resource leaks. "
    "Return JSON with: "
    "cpu_analysis, memory_analysis, latency_analysis, error_rate_trend, "
    "resource_bottlenecks."
)


class MetricsAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="MetricsAgent",
            role="Metrics Analyst",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
