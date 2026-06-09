"""
SwarmOps — Base Agent
Abstract base for all specialist agents. Handles LLM communication
via the OpenAI AsyncClient (pointed at OpenRouter) and Socket.IO event emission.
"""

import json
import time
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

    # ── Socket.IO helper ──────────────────────────────────────────────

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

    # ── Core execution ────────────────────────────────────────────────

    async def run(self, context: dict) -> dict:
        """
        Execute the agent:
        1. Emit 'started'
        2. Call the LLM
        3. Parse the JSON response
        4. Emit 'completed'
        5. Return the parsed result dict
        """
        start = time.perf_counter_ns()
        phase = context.get("phase", "investigation")
        incident_id = context.get("incident_id", "unknown")
        
        # Dynamically instantiate the client using the user's OAuth API key
        api_key = context.get("api_key")
        if not api_key:
            raise ValueError("Authentication error: Missing API Key in context.")
            
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
        )

        try:
            await self.emit(incident_id, phase, "started", f"{self.name} is analysing the incident…")

            response = await client.chat.completions.create(
                model=LLM_MODEL,
                max_tokens=4000,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": json.dumps(context, default=str)},
                ],
                temperature=0.2,
            )

            raw = response.choices[0].message.content or ""

            # Attempt to extract JSON from the response
            result = self._parse_json(raw)

            elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
            result["_agent"] = self.name
            result["_duration_ms"] = elapsed_ms

            await self.emit(
                incident_id,
                phase,
                "completed",
                f"{self.name} finished in {elapsed_ms}ms.",
                findings=raw,
            )
            return result

        except Exception as exc:
            elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
            error_msg = f"{self.name} failed: {exc}"
            await self.emit(incident_id, phase, "failed", error_msg)
            return {
                "_agent": self.name,
                "_duration_ms": elapsed_ms,
                "error": str(exc),
            }

    # ── JSON parsing helper ───────────────────────────────────────────

    @staticmethod
    def _parse_json(text: str) -> dict:
        """Best-effort JSON extraction from LLM output."""
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try to find a JSON block inside ```json ... ``` fences
        import re
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find any { ... } block
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        # Give up — return raw text
        return {"raw_response": text}
