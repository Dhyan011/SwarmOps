"""
SwarmOps — Triage Agent
Assesses severity, classifies incident type, estimates blast radius.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a triage specialist. Assess incident severity, classify the type "
    "(memory, CPU, network, database, security), identify affected components, "
    "estimate blast radius. If the incident description and code reveal no actual bugs, "
    "set the severity to 'low' and type to 'informational'. "
    "Return JSON with: severity_assessment, incident_type, "
    "affected_components, blast_radius, priority_score."
)


class TriageAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="TriageAgent",
            role="Triage Specialist",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
