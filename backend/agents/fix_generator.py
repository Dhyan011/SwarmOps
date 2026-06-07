"""
SwarmOps — Fix Generator Agent
Generates specific code patches or configuration fixes from a root cause analysis.
"""

from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a remediation engineer. Given a root cause analysis, generate a "
    "specific code patch or configuration fix. If the root cause indicates that no bugs "
    "were found, explicitly state 'No fix required' in the fix_description and leave the "
    "code_patch empty. Return JSON with: fix_description, "
    "code_patch (as a unified diff string), config_changes, deployment_steps, "
    "rollback_plan."
)


class FixGeneratorAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="FixGeneratorAgent",
            role="Remediation Engineer",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
