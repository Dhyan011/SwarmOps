"""
SwarmOps — Trace Agent
Maps service dependencies, identifies slow spans and failure points.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a distributed tracing expert. Map service dependencies, identify slow "
    "spans, find failure points in request chains. Return JSON with: "
    "service_dependencies, slow_spans, failure_points, latency_breakdown, "
    "affected_endpoints."
)


class TraceAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="TraceAgent",
            role="Distributed Tracing Expert",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
