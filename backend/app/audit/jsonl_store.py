import json
import os
from typing import Dict, Any

LOG_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "audit_log.jsonl")

def append_audit_event(event_data: Dict[str, Any]) -> None:
    """Appends a standardized event matching the shared contract to the JSONL log."""
    os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
    with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(event_data) + "\n")