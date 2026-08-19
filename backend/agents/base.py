"""
SwarmOps — Base Agent
Abstract base for all specialist agents. Handles LLM communication
via the OpenAI AsyncClient (pointed at OpenRouter) and Socket.IO event emission.
"""

import json
import time
import asyncio
from datetime import datetime, timezone
from openai import AsyncOpenAI
from config import OPENROUTER_BASE_URL, LLM_MODEL

class BaseAgent:
    """
    Every specialist agent inherits from BaseAgent.
    Subclasses only need to set `name`, `role`, and `system_prompt`.
    """

    def __init__(self, name: str, role: str, system_prompt: str, sio):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt
        self.sio = sio

    async def emit(self, incident_id: str, phase: str, status: str, message: str, findings: str = ""):
        """Emit a real-time agent_event to all connected clients."""
        event = {
            "incident_id": incident_id,
            "agent": self.name,
            "phase": phase,
            "status": status,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "findings": findings,
        }
        await self.sio.emit("agent_event", event)

    def prune_context(self, context: dict) -> dict:
        """Limits the size of context blocks to prevent context window blowouts."""
        pruned = context.copy()
        if "code_snippet" in pruned and isinstance(pruned["code_snippet"], str):
            if len(pruned["code_snippet"]) > 15000:
                pruned["code_snippet"] = pruned["code_snippet"][:15000] + "\n...[TRUNCATED]"
        return pruned

    async def run(self, context: dict, retries: int = 2) -> dict:
        """
        Execute the agent:
        1. Emit 'started'
        2. Prune context
        3. Call the LLM with streaming + retry
        4. Parse the JSON response
        5. Emit 'completed'
        6. Return the parsed result dict
        """
        start = time.perf_counter_ns()
        phase = context.get("phase", "investigation")
        incident_id = context.get("incident_id", "unknown")
        
        api_key = context.get("api_key")
        if not api_key:
            raise ValueError("Authentication error: Missing API Key in context.")
            
        client = AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        pruned_context = self.prune_context(context)

        await self.emit(incident_id, phase, "started", f"{self.name} is analysing the incident…")

        for attempt in range(retries):
            try:
                # Primary model, fallback on retry
                model = LLM_MODEL
                if attempt > 0:
                     model = "meta-llama/llama-3.3-70b-instruct"

                response = await client.chat.completions.create(
                    model=model,
                    max_tokens=4000,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": json.dumps(pruned_context, default=str)},
                    ],
                    temperature=0.2,
                    stream=True,
                )

                raw = ""
                async for chunk in response:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        raw += delta
                        await self.sio.emit("agent_token", {
                            "incident_id": incident_id,
                            "agent": self.name,
                            "token": delta
                        })

                result = self._parse_json(raw)
                elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
                result["_agent"] = self.name
                result["_duration_ms"] = elapsed_ms

                await self.emit(incident_id, phase, "completed", f"{self.name} finished in {elapsed_ms}ms.", findings=raw)
                return result

            except Exception as exc:
                print(f"Agent {self.name} failed on attempt {attempt+1}: {exc}")
                if attempt == retries - 1:
                    elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
                    error_msg = f"{self.name} failed after retries: {exc}"
                    await self.emit(incident_id, phase, "failed", error_msg)
                    return {"_agent": self.name, "_duration_ms": elapsed_ms, "error": str(exc)}
                await asyncio.sleep(2 ** attempt)

    @staticmethod
    def _parse_json(text: str) -> dict:
        """Best-effort JSON extraction from LLM output."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        import re
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        return {"raw_response": text}
