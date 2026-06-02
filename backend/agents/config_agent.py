from agents.base_agent import BaseAgent
from tools.config_tools import read_config, diff_config

class ConfigAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ConfigAgent",
            role="detect recent deployments, config changes, or environment variable drift that correlate with the incident time window",
            tools_list=[read_config, diff_config]
        )
