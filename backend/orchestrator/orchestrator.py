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
        KBAgent()
    ]

    # Stage 3: Parallel execution
    # BaseAgent.run is an async wrapper around a_initiate_chat
    tasks = [agent.run(alert) for agent in agents]
    findings = await asyncio.gather(*tasks, return_exceptions=True)

    # Stage 4 & 5: Collect findings and Synthesise
    report = await synthesise_findings(alert, findings)
    
    # Stage 6: Return root-cause report
    return report
