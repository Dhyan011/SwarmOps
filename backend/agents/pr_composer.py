from agents.base import BaseAgent

SYSTEM_PROMPT = (
    "You are a PR Composer. Given a root cause, fix, and tests, write a professional, "
    "comprehensive GitHub Pull Request description. Highlight how this PR addresses the root cause, "
    "closes historical gaps (from past_patterns), and improves system robustness. "
    "Return JSON with: pr_title, pr_body (markdown format), branch_name_suggestion, "
    "commit_message_suggestion."
)

class PRComposerAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="PRComposerAgent",
            role="Release Engineer",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )
