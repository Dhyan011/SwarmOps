from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a QA Automation Engineer. Based on the root cause and proposed fix, "
    "generate comprehensive unit/integration tests that reproduce the issue and verify the fix. "
    "Incorporate past_patterns to ensure previous testing gaps are closed. "
    "Return JSON with: test_description, test_code (ready to run), "
    "edge_cases_covered, execution_instructions."
)

class TestGeneratorAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="TestGeneratorAgent",
            role="Test Engineer",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
