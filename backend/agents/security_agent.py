from agents.base_agent import BaseAgent
from tools.security_tools import scan_vulnerabilities
import autogen

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("SecurityAgent")
        autogen.agentchat.register_function(
            scan_vulnerabilities,
            caller=self.agent,
            executor=self.proxy,
            name="scan_vulnerabilities",
            description="Scans a target URL (live website or GitHub repo) for common security vulnerabilities like missing HTTP headers or exposed secrets."
        )
