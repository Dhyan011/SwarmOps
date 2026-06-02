import asyncio
import logging
from models.alert import AlertModel
from models.report import IncidentReport
from orchestrator.alert_validator import validate_and_enrich_alert
from orchestrator.synthesiser import synthesise_findings

from agents.log_agent import LogAgent
from agents.metric_agent import MetricAgent
from agents.trace_agent import TraceAgent
from agents.visual_agent import VisualAgent
from agents.config_agent import ConfigAgent
from agents.kb_agent import KBAgent
from agents.security_agent import SecurityAgent

logger = logging.getLogger(__name__)

async def handle_alert(raw_alert: dict) -> IncidentReport:
    """Main orchestration pipeline: enrich -> fan-out -> gather -> synthesize."""
    
    # Stage 1: Validate and enrich
    alert: AlertModel = validate_and_enrich_alert(raw_alert)
    logger.info(f"Processing alert: {alert.incident_id}")

    # Stage 2: Fan-out (Dispatch to agents)
    # The agents now wrap AutoGen internally.
    agents = [
        LogAgent(),
        MetricAgent(),
        TraceAgent(),
        VisualAgent(),
        ConfigAgent(),
        KBAgent(),
        SecurityAgent()
    ]

    # Stage 3: Sequential execution (to avoid OpenRouter rate limits on free models)
    findings = []
    for agent in agents:
        try:
            finding = await agent.run(alert)
            findings.append(finding)
        except Exception as e:
            logger.error(f"Agent {agent.__class__.__name__} failed: {e}")
            findings.append({"error": str(e)})

    # Stage 4 & 5: Collect findings and Synthesise
    report = await synthesise_findings(alert, findings)
    
    # Stage 6: Return root-cause report
    return report
