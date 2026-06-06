from datetime import datetime, timezone
import uuid
from models.alert import AlertModel

def validate_and_enrich_alert(raw_alert: dict) -> AlertModel:
    """Validates the raw alert dict and enriches it with missing IDs or timestamps."""
    if "incident_id" not in raw_alert or not raw_alert["incident_id"]:
        raw_alert["incident_id"] = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    if "alert_time" not in raw_alert or not raw_alert["alert_time"]:
        raw_alert["alert_time"] = datetime.now(timezone.utc).isoformat()
        
    return AlertModel(**raw_alert)
