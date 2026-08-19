"""
SwarmOps — Log Analyzer Agent
Analyses error patterns, recurring exceptions, and anomalous log entries.
"""

import json
import time
from datetime import datetime, timezone
from openai import AsyncOpenAI

from agents.base import BaseAgent
from tools.azure_logs import query_azure_logs
from config import OPENROUTER_BASE_URL, LLM_MODEL

SYSTEM_PROMPT = (
    "You are a log analysis expert. Analyze error patterns, identify recurring "
    "exceptions, find anomalous log entries, trace error propagation. Return JSON "
    "with: error_patterns, anomalies, stack_traces, error_frequency, key_timestamps."
)

class LogAnalyzerAgent(BaseAgent):
    def __init__(self, sio):
        super().__init__(
            name="LogAnalyzerAgent",
            role="Log Analysis Expert",
            system_prompt=SYSTEM_PROMPT,
            sio=sio,
        )

    async def run(self, context: dict, retries: int = 2) -> dict:
        phase = context.get("phase", "investigation")
        incident_id = context.get("incident_id", "unknown")
        api_key = context.get("api_key")
        
        if not api_key:
            return {"error": "Missing API Key"}
            
        client = AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        
        await self.emit(incident_id, phase, "started", f"{self.name} is formulating a KQL query to fetch real logs...")
        
        kql_prompt = (
            "You are a diagnostic tool. Generate ONLY a valid Kusto Query Language (KQL) "
            "query to search Azure Log Analytics for the incident described below. "
            f"Service: {context.get('service')}\nDescription: {context.get('description')}\n"
            "Return ONLY the KQL query string, nothing else. Do not use markdown blocks."
        )
        
        try:
            resp = await client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": kql_prompt}],
                max_tokens=200,
                temperature=0.1
            )
            kql_query = resp.choices[0].message.content.strip()
            if kql_query.startswith("```"):
                kql_query = kql_query.split("\n", 1)[-1]
            if kql_query.endswith("```"):
                kql_query = kql_query.rsplit("\n", 1)[0]
                
            await self.emit(incident_id, phase, "running", f"Executing Azure Log Analytics query:\n{kql_query}")
            
            logs_result = await query_azure_logs(kql_query)
            context["azure_logs"] = logs_result
            
            await self.emit(incident_id, phase, "running", f"Fetched logs from Azure. Analyzing results...")
            
        except Exception as e:
            context["azure_logs_error"] = str(e)
            
        return await super().run(context, retries)
