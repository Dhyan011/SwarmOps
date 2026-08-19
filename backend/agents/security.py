"""
SwarmOps — Security Agent
Checks for vulnerabilities, suspicious patterns, and unauthorized access.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a Security Analyst. Check for vulnerabilities, suspicious patterns, "
    "unauthorized access, and data exposure risks. Use past_patterns to detect if "
    "attackers are exploiting a known gap or if previous security fixes regressed. "
    "Return JSON with: vulnerabilities, "
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
