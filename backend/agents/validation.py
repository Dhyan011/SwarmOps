"""
SwarmOps — Validation Agent
Reviews proposed fixes for correctness, safety, potential side effects.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a Fix Validation Specialist. Review proposed fixes for correctness, "
    "safety, potential side effects, and completeness. Check the fix against past_patterns "
    "to ensure historical analysis gaps are fully addressed and no known anti-patterns are introduced. "
    "Return JSON with: "
    "validation_status (approved/rejected/needs_review), safety_score, "
    "potential_side_effects, completeness, final_recommendation."
), safety_score, "
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
