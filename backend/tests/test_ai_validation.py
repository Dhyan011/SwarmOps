import pytest

from agents.base import BaseAgent
import agents.orchestrator as orchestration
import db as db_module
from models.schemas import IncidentCreate, ValidationOutput


class FakeSocket:
    def __init__(self):
        self.events = []

    async def emit(self, event, payload, **kwargs):
        self.events.append((event, payload, kwargs))


class FakeAgent:
    def __init__(self, name, result, role="test agent"):
        self.name = name
        self.role = role
        self.result = result
        self.called = 0

    async def run(self, context):
        self.called += 1
        return dict(self.result)


class FakeDB:
    def __init__(self):
        self.reports = []

    async def set(self, incident_id, report):
        self.reports.append(report)


def create_orchestrator(validation_result, test_result=None):
    instance = orchestration.Orchestrator.__new__(orchestration.Orchestrator)
    instance.sio = FakeSocket()
    instance.triage_agent = FakeAgent("TriageAgent", {"triage": "ok", "_agent": "TriageAgent"})
    instance.log_analyzer = FakeAgent("LogAnalyzerAgent", {"logs": "clean"})
    instance.metrics_agent = FakeAgent("MetricsAgent", {"metrics": "ok"})
    instance.trace_agent = FakeAgent("TraceAgent", {"trace": "ok"})
    instance.security_agent = FakeAgent("SecurityAgent", {"findings": []})
    instance.root_cause_agent = FakeAgent("RootCauseAgent", {"root_cause": "cause", "confidence": 85})
    instance.fix_generator = FakeAgent("FixGeneratorAgent", {"fix_description": "safe fix", "code_patch": ""})
    instance.test_generator = FakeAgent("TestGeneratorAgent", test_result or {"tests": ["test case"]})
    instance.validation_agent = FakeAgent("ValidationAgent", validation_result)
    instance.pr_composer = FakeAgent("PRComposerAgent", {"pr_title": "fix", "pr_body": "body"})
    return instance


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "validation_result",
    [
        {},
        {"validation_status": "approved"},
        {"validation_status": "approved", "safety_score": "100", "potential_side_effects": [], "completeness": True, "final_recommendation": "ok"},
        {"validation_status": "unknown", "safety_score": 100, "potential_side_effects": [], "completeness": True, "final_recommendation": "ok"},
    ],
)
async def test_invalid_or_missing_validation_fails_closed(validation_result, monkeypatch):
    async def no_similar(*args):
        return None

    monkeypatch.setattr(orchestration, "find_similar_incident", no_similar)
    monkeypatch.setattr(orchestration.memory_store, "get_past_patterns", lambda service: [])
    fake_db = FakeDB()
    monkeypatch.setattr(db_module, "db", fake_db)
    pipeline = create_orchestrator(validation_result)
    report = await pipeline.investigate(
        IncidentCreate(description="test", service="api", severity="low"),
        api_key="provider-test-key",
        owner_id="user-a",
    )
    assert report.status == "needs_review"
    assert report.validation_state == "needs_manual_review"
    assert json_validation_status(report.validation_result) == "needs_review"
    assert pipeline.pr_composer.called == 0
    assert fake_db.reports[0].incident_id == report.incident_id


def json_validation_status(encoded):
    import json
    return json.loads(encoded)["validation_status"]


@pytest.mark.asyncio
async def test_valid_ai_review_waits_for_human_and_does_not_claim_resolution(monkeypatch):
    async def no_similar(*args):
        return None

    monkeypatch.setattr(orchestration, "find_similar_incident", no_similar)
    monkeypatch.setattr(orchestration.memory_store, "get_past_patterns", lambda service: [])
    monkeypatch.setattr(db_module, "db", FakeDB())
    valid_output = {
        "validation_status": "approved",
        "safety_score": 95,
        "potential_side_effects": [],
        "completeness": True,
        "final_recommendation": "The proposal appears internally consistent; human review is still required.",
        "_agent": "ValidationAgent",
        "_duration_ms": 4,
    }
    pipeline = create_orchestrator(valid_output)
    report = await pipeline.investigate(
        IncidentCreate(description="test", service="api", severity="low"),
        api_key="provider-test-key",
        owner_id="user-a",
    )
    assert report.status == "awaiting_review"
    assert report.validation_state == "validation_passed"
    assert report.status != "resolved"
    assert pipeline.pr_composer.called == 1


@pytest.mark.asyncio
async def test_failed_test_generation_forces_manual_review(monkeypatch):
    async def no_similar(*args):
        return None

    monkeypatch.setattr(orchestration, "find_similar_incident", no_similar)
    monkeypatch.setattr(orchestration.memory_store, "get_past_patterns", lambda service: [])
    monkeypatch.setattr(db_module, "db", FakeDB())
    valid_output = {
        "validation_status": "approved",
        "safety_score": 100,
        "potential_side_effects": [],
        "completeness": True,
        "final_recommendation": "Looks good.",
    }
    pipeline = create_orchestrator(valid_output, test_result={"error": "test generation failed"})
    report = await pipeline.investigate(
        IncidentCreate(description="test", service="api", severity="low"),
        api_key="provider-test-key",
        owner_id="user-a",
    )
    assert report.status == "needs_review"
    assert report.validation_state == "needs_manual_review"
    assert pipeline.pr_composer.called == 0


def test_strict_validation_schema_rejects_unknown_fields():
    with pytest.raises(Exception):
        ValidationOutput.model_validate({
            "validation_status": "approved",
            "safety_score": 90,
            "potential_side_effects": [],
            "completeness": True,
            "final_recommendation": "ok",
            "extra": "not allowed",
        })


@pytest.mark.parametrize("invalid", ["not json", "[]", "null", "42"])
def test_agent_json_parser_rejects_invalid_or_non_object_responses(invalid):
    with pytest.raises(ValueError):
        BaseAgent._parse_json(invalid)
