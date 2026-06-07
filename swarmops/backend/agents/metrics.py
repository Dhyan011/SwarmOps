"""
SwarmOps — Metrics Agent
Evaluates system metrics: CPU, memory, latency, error rates, throughput.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a system metrics analyst. Evaluate CPU usage, memory consumption, "
    "latency patterns, error rates, throughput changes. Return JSON with: "
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
