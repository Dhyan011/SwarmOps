"""
SwarmOps — Security Agent
Checks for vulnerabilities, suspicious patterns, and unauthorized access.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a security analyst. Check for vulnerabilities, suspicious patterns, "
    "unauthorized access, data exposure risks. Return JSON with: vulnerabilities, "
    "suspicious_patterns, access_anomalies, risk_level, security_recommendations."
)


class SecurityAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="SecurityAgent",
            role="Security Analyst",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
