import json
import logging
from typing import List, Any
from openai import AsyncOpenAI
from models.alert import AlertModel
from models.report import IncidentReport
from config.settings import settings
from websocket.ws_manager import ws_manager

logger = logging.getLogger(__name__)

async def synthesise_findings(alert: AlertModel, raw_findings: List[Any]) -> IncidentReport:
    """Takes all agent findings and uses an LLM to synthesise a root cause report."""
    from models.finding import AgentFinding
    
    await ws_manager.broadcast("orchestrator_synthesising", "orchestrator", {"status": "started"})
    
    valid_findings = []
    error_agents = []
    
    for idx, f in enumerate(raw_findings):
        if isinstance(f, Exception):
            # Try to guess which agent failed based on index if possible, or just log
            logger.error(f"Agent {idx} raised exception: {f}")
            error_agents.append(f"Agent_{idx}")
        elif isinstance(f, AgentFinding):
            valid_findings.append(f.model_dump())
            if f.status == "error":
                error_agents.append(f.agent)
        else:
            logger.warning(f"Unexpected finding type: {type(f)}")
            
    # Format the prompt
    from prompts.synthesis_prompt import SYNTHESIS_PROMPT
    prompt = SYNTHESIS_PROMPT.replace("{ALERT_JSON}", alert.model_dump_json())
    prompt = prompt.replace("{FINDINGS_JSON}", json.dumps(valid_findings, indent=2))
    
    # Use OpenAI client pointing to OpenRouter
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY
    )
    
    try:
        response = await client.chat.completions.create(
            model=settings.ORCHESTRATOR_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1000
        )
        
        raw_text = response.choices[0].message.content.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        report_dict = json.loads(raw_text.strip())
        report = IncidentReport(**report_dict)
        
        # Override agents_unavailable
        report.agents_unavailable = list(set(report.agents_unavailable + error_agents))
        
        await ws_manager.broadcast("orchestrator_complete", "orchestrator", {"incident_id": report.incident_id})
        return report
        
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        await ws_manager.broadcast("orchestrator_error", "orchestrator", {"error": str(e)})
        raise e
