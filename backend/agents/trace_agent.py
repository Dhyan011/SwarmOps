from agents.base_agent import BaseAgent
from tools.trace_tools import fetch_traces, list_spans

class TraceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="TraceAgent",
            role="identify slow spans, broken traces, dependency failures in distributed tracing data",
            tools_list=[fetch_traces, list_spans]
        )
