import pytest
from orchestrator.alert_validator import validate_and_enrich_alert
from models.alert import AlertModel

def test_alert_validation_and_enrichment():
    raw_alert = {
        "service": "payment_gateway",
        "severity": "P2",
        "alert_type": "high_cpu",
        "environment": "production",
        "time_window": "5m",
        "alert_message": "CPU over 90%"
    }
    
    # This should add incident_id and alert_time
    alert = validate_and_enrich_alert(raw_alert)
    
    assert isinstance(alert, AlertModel)
    assert alert.incident_id is not None
    assert alert.incident_id.startswith("INC-")
    assert alert.alert_time is not None
    assert alert.service == "payment_gateway"
