from agents.base_agent import BaseAgent
from tools.kb_tools import search_history, get_runbook

class KBAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="KBAgent",
            role="find matching past incidents, retrieve known runbooks and proven fixes from the knowledge base",
            tools_list=[search_history, get_runbook]
        )
