
from dataclasses import dataclass, field
from typing import Any


@dataclass
class MonitorInput:
    """Input required to assess a proposed agent tool action."""

    task_anchor: str
    current_turn: str

    # Earlier turns support multi-turn detection.
    history: list[str] = field(default_factory=list)

    # Provenance of the content being assessed.
    source: str = ""
    trust_label: str = "unknown"

    # Proposed action must be inspected before execution.
    proposed_action: dict[str, Any] = field(default_factory=dict)
    outbound_action: bool = False

    # Obtain the real demo value from Member 4.
    canary_secret: str = ""


@dataclass
class MonitorFinding:
    """Evidence produced by the detector."""

    signal: str
    evidence: str
    source: str = ""


@dataclass
class MonitorResult:
    """Final assessment produced by the monitor."""

    risk_score: int
    decision: str
    detected_signals: list[str] = field(default_factory=list)
    findings: list[MonitorFinding] = field(default_factory=list)
    relevant_text: str = ""
    explanation: str = ""

    def to_event(
        self,
        run_id: str = "",
        step: int = 0,
        source: str = "",
        trust_label: str = "",
        proposed_action: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Return an event using the team's agreed field names."""

        return {
            "run_id": run_id,
            "step": step,
            "event_type": "security_assessment",
            "source": source,
            "trust_label": trust_label,
            "relevant_text": self.relevant_text,
            "detected_signals": self.detected_signals,
            "risk_score": self.risk_score,
            "proposed_action": proposed_action or {},
            "decision": self.decision,
            "explanation": self.explanation,
        }
