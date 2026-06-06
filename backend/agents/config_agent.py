from agents.base_agent import BaseAgent
from tools.config_tools import read_config, diff_config
from tools.github_tools import analyze_github_repo

class ConfigAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ConfigAgent",
            role="detect recent deployments, config changes, or analyze generic public GitHub repositories",
            tools_list=[read_config, diff_config, analyze_github_repo]
        )
