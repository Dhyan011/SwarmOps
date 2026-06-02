from agents.base_agent import BaseAgent
from tools.log_tools import query_logs, grep_pattern

class LogAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="LogAgent",
            role="find error patterns, stack traces, OOM events, repeated failures in application logs for the affected service and time window",
            tools_list=[query_logs, grep_pattern]
        )
