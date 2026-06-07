"""
SwarmOps — Validation Agent
Reviews proposed fixes for correctness, safety, potential side effects.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a fix validation specialist. Review proposed fixes for correctness, "
    "safety, potential side effects, and completeness. Return JSON with: "
    "validation_status (approved/rejected/needs_review), safety_score, "
    "potential_side_effects, completeness, final_recommendation."
)


class ValidationAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="ValidationAgent",
            role="Validation Specialist",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
