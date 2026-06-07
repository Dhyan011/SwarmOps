"""
SwarmOps — Root Cause Agent
Correlates evidence from investigation agents to determine definitive root cause.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a root cause analysis expert. Given findings from multiple "
    "investigation agents, correlate evidence, determine the definitive root cause, "
    "and assign a confidence score (0-100). If no bugs or issues are found in the codebase "
    "based on the incident description, explicitly state 'No bugs found' in the root_cause "
    "and provide a brief architectural summary of the project instead. "
    "Return JSON with: root_cause, confidence, evidence_chain, contributing_factors, timeline."
)


class RootCauseAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="RootCauseAgent",
            role="Root Cause Analyst",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
