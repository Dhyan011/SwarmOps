"""
SwarmOps — Log Analyzer Agent
Analyses error patterns, recurring exceptions, and anomalous log entries.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a log analysis expert. Analyze error patterns, identify recurring "
    "exceptions, find anomalous log entries, trace error propagation. Return JSON "
    "with: error_patterns, anomalies, stack_traces, error_frequency, key_timestamps."
)


class LogAnalyzerAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="LogAnalyzerAgent",
            role="Log Analysis Expert",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
